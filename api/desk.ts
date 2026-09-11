// @ts-nocheck
import {
  createPublicClient,
  decodeEventLog,
  http,
  keccak256,
  parseAbi,
  toBytes,
} from "viem";

const INDEXER = "https://dev.smk.somnia.host/v1/graphql";
const RPC = "https://dream-rpc.somnia.network";
const PREFIX = "anywhere.v1:";

const orderPlacedAbi = parseAbi([
  "event OrderPlaced(uint128 indexed orderId, (uint128 orderId, bool isBid, address owner, uint64 userData, uint256 price, uint256 fullQuantity, uint256 quantityRemaining, uint64 expireTimestampNs) placedOrder)",
]);

function normalizeHostId(hostId) {
  return String(hostId || "").trim().toLowerCase().replace(/\s+/g, "-") || "anonymous";
}

function encodeHostTag(hostId) {
  return BigInt(keccak256(toBytes(`${PREFIX}${normalizeHostId(hostId)}`))) >> 192n;
}

function formatHostTag(tag) {
  return `0x${tag.toString(16).padStart(16, "0")}`;
}

function parseHostTag(raw) {
  if (raw == null) return 0n;
  if (typeof raw === "bigint") return raw;
  const s = String(raw).trim();
  if (!s) return 0n;
  try {
    return s.startsWith("0x") || s.startsWith("0X") ? BigInt(s) : BigInt(s);
  } catch {
    return 0n;
  }
}

function toQty(raw, decimals) {
  if (!raw) return 0;
  try {
    const v = BigInt(raw);
    const base = 10n ** BigInt(decimals);
    const whole = v / base;
    const frac = v % base;
    return Number(whole) + Number(frac) / Number(base);
  } catch {
    return 0;
  }
}

function toMs(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1e12 ? n * 1000 : n;
}

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

async function fetchTape(hostId) {
  const tag = encodeHostTag(hostId);
  const query = `
    query HostOrders($tag: numeric!, $limit: Int!) {
      Order(
        where: { userData: { _eq: $tag } }
        order_by: { placedAtTimestamp: desc }
        limit: $limit
      ) {
        orderId owner userData side filledQuantity fullQuantity status
        placedTxHash placedAtTimestamp market_id
        market { quoteDecimals asset }
      }
    }
  `;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(INDEXER, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { tag: tag.toString(), limit: 80 },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`indexer ${res.status}`);
    const body = await res.json();
    if (body.errors?.length) {
      throw new Error(body.errors.map((e) => e.message).filter(Boolean).join("; "));
    }
    const orders = (body.data?.Order ?? []).map((row) => {
      const decimals = row.market?.quoteDecimals ?? 18;
      return {
        orderId: row.orderId ?? "",
        owner: row.owner ?? "",
        userData: String(row.userData ?? "0"),
        userDataHex: formatHostTag(parseHostTag(row.userData)),
        side: row.side ?? null,
        filled: toQty(row.filledQuantity, decimals),
        size: toQty(row.fullQuantity, decimals),
        status: row.status ?? null,
        txHash: row.placedTxHash ?? "",
        at: toMs(row.placedAtTimestamp),
        marketId: row.market_id ?? "",
        asset: row.market?.asset ?? null,
      };
    });
    const filled = orders.filter((o) => o.filled > 0);
    return {
      tape: {
        hostId,
        tag: formatHostTag(tag),
        tagDec: tag.toString(),
        fills: filled.length,
        volume: filled.reduce((acc, o) => acc + o.filled, 0),
        orders,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function verifyTx(txHash, hostId) {
  const hash = String(txHash || "").trim();
  if (!hash.startsWith("0x") || hash.length !== 66) {
    throw new Error("need a 32-byte tx hash");
  }
  const client = createPublicClient({ transport: http(RPC) });
  const receipt = await client.getTransactionReceipt({ hash });
  const tags = [];
  const owners = [];
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: orderPlacedAbi,
        data: log.data,
        topics: log.topics,
      });
      tags.push(parseHostTag(decoded.args.placedOrder.userData));
      if (decoded.args.placedOrder.owner) owners.push(decoded.args.placedOrder.owner);
    } catch {
      /* other event */
    }
  }
  const expected = hostId ? encodeHostTag(hostId) : null;
  return {
    txHash: hash,
    tags: tags.map(formatHostTag),
    owners,
    matchesHost: expected == null ? null : tags.some((t) => t === expected),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    send(res, 405, { ok: false, error: "GET only" });
    return;
  }
  const raw = (v) => (Array.isArray(v) ? v[0] : v);
  const host = raw(req.query?.host);
  const tx = raw(req.query?.tx);
  try {
    if (tx) {
      send(res, 200, { ok: true, verified: await verifyTx(tx, host) });
      return;
    }
    if (!host) {
      send(res, 400, { ok: false, error: "host or tx required" });
      return;
    }
    const hostId = normalizeHostId(host);
    try {
      const { tape } = await fetchTape(hostId);
      send(res, 200, {
        ok: true,
        tape,
        formula: 'keccak256("anywhere.v1:" + host)[:8]',
        tag: formatHostTag(encodeHostTag(hostId)),
      });
    } catch (e) {
      send(res, 200, {
        ok: true,
        tape: {
          hostId,
          tag: formatHostTag(encodeHostTag(hostId)),
          tagDec: encodeHostTag(hostId).toString(),
          fills: 0,
          volume: 0,
          orders: [],
        },
        warning: e instanceof Error ? e.message : String(e),
        formula: 'keccak256("anywhere.v1:" + host)[:8]',
        tag: formatHostTag(encodeHostTag(hostId)),
      });
    }
  } catch (e) {
    send(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
