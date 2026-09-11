import {
  encodeHostTag,
  formatHostTag,
  parseHostTag,
} from "./attribution.js";

const INDEXER_URL = "https://dev.smk.somnia.host/v1/graphql";

export type HostOrder = {
  orderId: string;
  owner: string;
  userData: string;
  userDataHex: string;
  side: string | null;
  filled: number;
  size: number;
  status: string | null;
  txHash: string;
  at: number;
  marketId: string;
  asset: string | null;
};

export type HostTape = {
  hostId: string;
  tag: string;
  tagDec: string;
  fills: number;
  volume: number;
  orders: HostOrder[];
};

type IndexerOrder = {
  orderId?: string;
  owner?: string;
  userData?: string;
  side?: string | null;
  filledQuantity?: string;
  fullQuantity?: string;
  status?: string | null;
  placedTxHash?: string;
  placedAtTimestamp?: string;
  market_id?: string;
  market?: { quoteDecimals?: number; asset?: string | null } | null;
};

function toQty(raw: string | undefined, decimals: number): number {
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

function toMs(ts: string | undefined): number {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1e12 ? n * 1000 : n;
}

export async function fetchHostTape(
  hostId: string,
  opts?: { indexerUrl?: string; limit?: number },
): Promise<HostTape> {
  const tag = encodeHostTag(hostId);
  const indexerUrl = opts?.indexerUrl ?? INDEXER_URL;
  const limit = opts?.limit ?? 80;
  const query = `
    query HostOrders($tag: numeric!, $limit: Int!) {
      Order(
        where: { userData: { _eq: $tag } }
        order_by: { placedAtTimestamp: desc }
        limit: $limit
      ) {
        orderId
        owner
        userData
        side
        filledQuantity
        fullQuantity
        status
        placedTxHash
        placedAtTimestamp
        market_id
        market { quoteDecimals asset }
      }
    }
  `;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  let res: Response;
  try {
    res = await fetch(indexerUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { tag: tag.toString(), limit },
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`indexer unreachable (${msg})`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`indexer ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: { Order?: IndexerOrder[] };
    errors?: { message?: string }[];
  };
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).filter(Boolean).join("; ") || "indexer error");
  }

  const orders: HostOrder[] = (body.data?.Order ?? []).map((row) => {
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
    hostId,
    tag: formatHostTag(tag),
    tagDec: tag.toString(),
    fills: filled.length,
    volume: filled.reduce((acc, o) => acc + o.filled, 0),
    orders,
  };
}
