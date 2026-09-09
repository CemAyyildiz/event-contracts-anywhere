import {
  isBinaryMarket,
  type SomniaMarkets,
} from "@somnia-chain/markets-sdk";

export type TradeableMarket = {
  marketId: string;
  /** Market symbol for mintSet/redeem (no #YES/#NO). */
  marketSymbol: string;
  /** @deprecated alias of upSymbol — prefer upSymbol / marketSymbol */
  symbol: string;
  upSymbol: string;
  downSymbol?: string;
  asset: string;
  expiryMs: number;
  ttlSec: number;
  active: boolean;
};

const MIN_TTL_SEC = 60;

function assetMatches(symbol: string, asset: string): boolean {
  const upper = symbol.toUpperCase();
  const a = asset.toUpperCase();
  return upper.startsWith(`${a}-`) || upper.startsWith(`${a}/`) || upper.includes(`${a}-`);
}

function expiryMsOf(info: Record<string, unknown>): number | null {
  // BinaryMarket.expiry is a unix-seconds string from the indexer.
  const candidates = [info.expiry, info.tradingEnd, info.endTime];
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

/**
 * Nearest active binary market for `asset` with >60s remaining.
 * Falls back to the soonest successor if the current window is too close.
 */
export async function getTradeableMarket(
  exchange: SomniaMarkets,
  asset: string,
): Promise<TradeableMarket | null> {
  const loaded = await exchange.loadMarkets(true);
  const now = Date.now();
  const rows: TradeableMarket[] = [];

  for (const m of Object.values(loaded)) {
    if (!m.active || m.type !== "binary" || !isBinaryMarket(m.info)) continue;
    const upSymbol = m.outcomes?.[0]?.symbol;
    if (!upSymbol) continue;
    if (
      !assetMatches(upSymbol, asset) &&
      !assetMatches(m.symbol, asset) &&
      !assetMatches(m.base, asset)
    ) {
      continue;
    }

    const expiryMs = expiryMsOf(m.info as unknown as Record<string, unknown>);
    if (expiryMs == null) continue;
    const ttlSec = Math.floor((expiryMs - now) / 1000);
    if (ttlSec <= 0) continue;

    rows.push({
      marketId: String(m.info.marketId ?? m.id),
      marketSymbol: m.symbol,
      symbol: upSymbol,
      upSymbol,
      downSymbol: m.outcomes?.[1]?.symbol,
      asset: asset.toUpperCase(),
      expiryMs,
      ttlSec,
      active: true,
    });
  }

  rows.sort((a, b) => a.expiryMs - b.expiryMs);
  const tradeable = rows.find((r) => r.ttlSec > MIN_TTL_SEC);
  return tradeable ?? rows[0] ?? null;
}
