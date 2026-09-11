import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import type { TradeableMarket } from "./getTradeableMarket.js";
import {
  TradeCoreError,
  type BuyGuaranteedResult,
  type Side,
} from "./types.js";

const DEPTH_MULT = 1.0;
const MAX_SLIPPAGE_BPS = 300;
const IOC_PRICE_PAD = 0.02;
const MIN_FILL_RATIO = 0.98;

function clampProb(p: number): number {
  // Stay inside (0,1) for binary probability prices.
  return Math.min(0.999, Math.max(0.001, p));
}

function sumDepth(
  levels: [number, number][] | undefined,
  touch: number,
  maxPrice: number,
): number {
  if (!levels?.length) return 0;
  let sum = 0;
  for (const [price, amount] of levels) {
    if (price > maxPrice + 1e-12) break;
    if (price + 1e-12 < touch) continue;
    sum += amount;
  }
  return sum;
}

function asHash(h: string | undefined): `0x${string}` | null {
  if (!h || !h.startsWith("0x")) return null;
  return h as `0x${string}`;
}

/** Somnia mempool rejections surface as viem "Missing or invalid parameters." */
function unwrapWrite(e: unknown): string {
  let cur: unknown = e;
  let details = "";
  for (let i = 0; i < 12 && cur && typeof cur === "object"; i++) {
    const o = cur as { details?: string; message?: string; cause?: unknown };
    if (typeof o.details === "string" && o.details) details = o.details;
    if (typeof o.message === "string" && /insufficientBalance|account does not exist|gasPrice/i.test(o.message)) {
      details = o.message;
    }
    cur = o.cause;
  }
  const msg = details || (e instanceof Error ? e.message : String(e));
  if (/insufficientBalance|account does not exist/i.test(msg)) {
    return `${msg} — SDK writes lock ~0.6 STT as a gas envelope. Need a 1 STT faucet drip.`;
  }
  return msg;
}

async function assertTrading(
  exchange: SomniaMarkets,
  market: TradeableMarket,
): Promise<void> {
  if (market.ttlSec <= 60) {
    throw new TradeCoreError(
      `Market TTL ${market.ttlSec}s ≤ 60 — pick a successor`,
      "MarketClosed",
    );
  }
  if (!market.marketId.startsWith("0x")) return;
  try {
    const onchain = await exchange.client.getMarketOnchain(
      market.marketId as `0x${string}`,
    );
    const status = (onchain as { status?: number }).status;
    if (status !== 1) {
      throw new TradeCoreError(
        `Market not Trading (status=${status})`,
        "MarketClosed",
      );
    }
  } catch (e) {
    if (e instanceof TradeCoreError) throw e;
    // Indexer/RPC lag: continue; createOrder will revert if closed.
  }
}

export type BuyGuaranteedParams = {
  market: TradeableMarket;
  side: Side;
  sizeUsdc: number;
  maxSlippageBps?: number;
};

/**
 * Directional fill with thin-book fallback: IOC buy, else mintSet + IOC sell unwanted.
 */
export async function buyGuaranteed(
  exchange: SomniaMarkets,
  params: BuyGuaranteedParams,
): Promise<BuyGuaranteedResult> {
  const { market, side, sizeUsdc } = params;
  const slipBps = params.maxSlippageBps ?? MAX_SLIPPAGE_BPS;
  const txHashes: `0x${string}`[] = [];

  if (!(sizeUsdc > 0)) {
    throw new TradeCoreError("sizeUsdc must be > 0", "FillFailed");
  }

  await assertTrading(exchange, market);

  const desiredSymbol =
    side === "up"
      ? market.upSymbol
      : market.downSymbol ??
        (() => {
          throw new TradeCoreError("Missing downSymbol on market", "NoMarket");
        })();
  const unwantedSymbol =
    side === "up"
      ? market.downSymbol ??
        (() => {
          throw new TradeCoreError("Missing downSymbol on market", "NoMarket");
        })()
      : market.upSymbol;

  const book = await exchange.fetchOrderBook(desiredSymbol, 20);
  const touchAsk = book.asks?.[0]?.[0];
  const slip = slipBps / 10_000;
  const maxPrice =
    touchAsk != null ? clampProb(touchAsk * (1 + slip)) : clampProb(0.5 + slip);
  const depth =
    touchAsk != null ? sumDepth(book.asks, touchAsk, maxPrice) : 0;

  // --- Path A: deep enough book → IOC buy ---
  if (touchAsk != null && depth >= sizeUsdc * DEPTH_MULT) {
    const price = clampProb(touchAsk + IOC_PRICE_PAD);
    try {
      const order = await exchange.createOrder(
        desiredSymbol,
        "limit",
        "buy",
        sizeUsdc,
        price,
        { timeInForce: "IOC" },
      );
      const h = asHash(order.txHash);
      if (h) txHashes.push(h);
      const fillRatio = order.amount > 0 ? order.filled / order.amount : 0;
      if (fillRatio >= MIN_FILL_RATIO) {
        return {
          netSide: side,
          netSize: order.filled,
          path: "ioc",
          txHashes,
          refundUsdc: 0,
          residualUnwanted: 0,
          marketSymbol: market.marketSymbol,
          desiredSymbol,
        };
      }
      // partial → fall through to mint-sell for remainder intent (full size remint path)
    } catch (e) {
      const msg = unwrapWrite(e);
      if (/insufficient|balance|allowance|account does not exist/i.test(msg)) {
        throw new TradeCoreError(msg, "InsufficientFunds");
      }
      // fall through to mint-sell
    }
  }

  // --- Path B: mintSet + sell unwanted ---
  try {
    const mint = await exchange.mintSet(market.marketSymbol, sizeUsdc);
    const mh = asHash(mint.hash);
    if (mh) txHashes.push(mh);
  } catch (e) {
    const msg = unwrapWrite(e);
    if (/insufficient|balance|allowance|account does not exist/i.test(msg)) {
      throw new TradeCoreError(msg, "InsufficientFunds");
    }
    throw new TradeCoreError(
      `mintSet failed: ${msg} (txs=${txHashes.join(",")})`,
      "FillFailed",
    );
  }

  const sellBook = await exchange.fetchOrderBook(unwantedSymbol, 10);
  const touchBid = sellBook.bids?.[0]?.[0];
  let sellPrice = clampProb(
    touchBid != null ? touchBid - IOC_PRICE_PAD : 0.01,
  );
  // Aggressive cross if pad went below tick noise
  if (touchBid != null && sellPrice >= touchBid) {
    sellPrice = clampProb(touchBid * 0.98);
  }

  let residualUnwanted = sizeUsdc;
  let refundUsdc = 0;

  for (let attempt = 0; attempt < 2 && residualUnwanted > 1e-6; attempt++) {
    const aggressive =
      attempt === 0 ? sellPrice : clampProb(Math.min(sellPrice, 0.05));
    try {
      const sell = await exchange.createOrder(
        unwantedSymbol,
        "limit",
        "sell",
        residualUnwanted,
        aggressive,
        { timeInForce: "IOC" },
      );
      const sh = asHash(sell.txHash);
      if (sh) txHashes.push(sh);
      residualUnwanted = Math.max(0, residualUnwanted - sell.filled);
      refundUsdc += (sell.price ?? aggressive) * sell.filled;
    } catch (e) {
      const msg = unwrapWrite(e);
      if (attempt === 1) {
        throw new TradeCoreError(
          `unwanted leg sell failed: ${msg} (txs=${txHashes.join(",")})`,
          "FillFailed",
        );
      }
    }
  }

  return {
    netSide: side,
    netSize: sizeUsdc,
    path: "mint-sell",
    txHashes,
    refundUsdc,
    residualUnwanted,
    marketSymbol: market.marketSymbol,
    desiredSymbol,
  };
}
