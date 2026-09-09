/**
 * Story 1.1 / Spike S1 — list active binary EC markets on Shannon + TTL.
 * Usage: pnpm spike:markets
 */
import { isBinaryMarket } from "@somnia-chain/markets-sdk";
import { createExchange } from "../src/createExchange.js";
import { TESTNET_ENV } from "../src/env.js";

function expiryMsOf(info: Record<string, unknown>): number | null {
  const candidates = [
    info.expiry,
    info.expiresAt,
    info.expiration,
    info.endTime,
    info.resolveTime,
    info.resolutionTime,
    info.closeTime,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) {
      return c < 1e12 ? c * 1000 : c;
    }
    if (typeof c === "string" && c.length > 0) {
      const n = Number(c);
      if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
      const d = Date.parse(c);
      if (!Number.isNaN(d)) return d;
    }
  }
  return null;
}

function looksBtcEth(symbol: string): "BTC" | "ETH" | null {
  const s = symbol.toUpperCase();
  if (s.includes("BTC")) return "BTC";
  if (s.includes("ETH")) return "ETH";
  return null;
}

async function main() {
  console.log("=== spike:markets (S1) ===");
  console.log("network:", TESTNET_ENV.network, "chainId:", TESTNET_ENV.chainId);
  console.log("indexer:", TESTNET_ENV.indexerUrl);
  console.log("rpc:", TESTNET_ENV.rpcHttp);
  console.log("ws:", TESTNET_ENV.wsRpcUrl);

  const exchange = await createExchange();
  const loaded = await exchange.loadMarkets(true);
  const all = Object.values(loaded);
  console.log("\nloadMarkets(true) count:", all.length);

  const now = Date.now();
  type Row = {
    asset: string | null;
    upSymbol: string;
    marketId: string;
    ttlSec: number | null;
    expiryIso: string | null;
    onchainStatus: number | string | null;
    topAsk: number | null;
    topBid: number | null;
  };
  const binary: Row[] = [];

  for (const m of all) {
    if (!m.active || !isBinaryMarket(m.info)) continue;
    const upSymbol = m.outcomes?.[0]?.symbol;
    if (!upSymbol) continue;
    const info = m.info as unknown as Record<string, unknown>;
    const marketId = String(info.marketId ?? "");
    const expiryMs = expiryMsOf(info);
    const ttlSec = expiryMs != null ? Math.floor((expiryMs - now) / 1000) : null;

    let onchainStatus: number | string | null = null;
    if (marketId.startsWith("0x")) {
      try {
        const onchain = await exchange.client.getMarketOnchain(
          marketId as `0x${string}`,
        );
        onchainStatus = (onchain as { status?: number }).status ?? null;
      } catch (e) {
        onchainStatus = `err:${e instanceof Error ? e.message : String(e)}`;
      }
    }

    let topAsk: number | null = null;
    let topBid: number | null = null;
    try {
      const book = await exchange.fetchOrderBook(upSymbol, 3);
      topAsk = book.asks?.[0]?.[0] ?? null;
      topBid = book.bids?.[0]?.[0] ?? null;
    } catch {
      // book optional for discovery
    }

    binary.push({
      asset: looksBtcEth(upSymbol),
      upSymbol,
      marketId,
      ttlSec,
      expiryIso: expiryMs != null ? new Date(expiryMs).toISOString() : null,
      onchainStatus,
      topAsk,
      topBid,
    });
  }

  binary.sort((a, b) => (a.ttlSec ?? 1e12) - (b.ttlSec ?? 1e12));

  console.log("\nactive binary markets:", binary.length);
  const btcEth = binary.filter((r) => r.asset === "BTC" || r.asset === "ETH");
  console.log("BTC/ETH subset:", btcEth.length);

  const print = (rows: Row[], limit = 20) => {
    for (const r of rows.slice(0, limit)) {
      console.log(
        JSON.stringify({
          asset: r.asset,
          upSymbol: r.upSymbol,
          marketId: r.marketId,
          ttlSec: r.ttlSec,
          expiry: r.expiryIso,
          onchainStatus: r.onchainStatus,
          topAsk: r.topAsk,
          topBid: r.topBid,
        }),
      );
    }
  };

  console.log("\n--- BTC/ETH (by soonest expiry) ---");
  print(btcEth, 30);
  console.log("\n--- other binary (sample) ---");
  print(
    binary.filter((r) => r.asset == null),
    10,
  );

  // Light WS probe: watch first BTC/ETH book if any
  const probe = btcEth.find((r) => (r.ttlSec ?? 0) > 60) ?? btcEth[0] ?? binary[0];
  if (probe) {
    console.log("\n--- WS probe watchOrderBook ---", probe.upSymbol);
    try {
      const handle = await exchange.watchOrderBook(probe.upSymbol);
      await new Promise((r) => setTimeout(r, 4000));
      const book = await exchange.fetchOrderBook(probe.upSymbol, 3);
      console.log(
        "watch ok; refetch book:",
        JSON.stringify({ asks: book.asks?.slice(0, 2), bids: book.bids?.slice(0, 2) }),
      );
      void handle;
      if (typeof (handle as { close?: () => void }).close === "function") {
        (handle as { close: () => void }).close();
      }
    } catch (e) {
      console.log("WS probe failed:", e instanceof Error ? e.message : e);
    }
  } else {
    console.log("\nNO-GO signal: no active binary markets returned.");
  }

  const shortWindow = btcEth.filter(
    (r) => r.ttlSec != null && r.ttlSec > 0 && r.ttlSec < 3600,
  );
  console.log("\n=== S1 summary ===");
  console.log(
    JSON.stringify(
      {
        binaryActive: binary.length,
        btcEthActive: btcEth.length,
        shortWindowUnder1h: shortWindow.length,
        sampleShort: shortWindow.slice(0, 5).map((r) => ({
          symbol: r.upSymbol,
          ttlSec: r.ttlSec,
          status: r.onchainStatus,
        })),
        verdictHint:
          btcEth.length === 0
            ? "NO-GO or ask Telegram — no BTC/ETH binary"
            : shortWindow.length > 0
              ? "likely GO — short-window BTC/ETH present"
              : "PARTIAL — BTC/ETH exist but maybe long-dated only",
      },
      null,
      2,
    ),
  );

  // allow WS sockets to flush
  setTimeout(() => process.exit(0), 500);
}

main().catch((err) => {
  console.error("spike:markets failed:", err);
  process.exit(1);
});
