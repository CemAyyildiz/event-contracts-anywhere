import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { TradeCoreError } from "./types.js";

export type RedeemResult = {
  redeemed: boolean;
  amount: number;
  payoutHint: number;
  txHash?: `0x${string}`;
  reason?: string;
};

/**
 * Redeem winning outcome shares after settlement.
 * No-op when nothing to redeem or market not settled yet.
 */
export async function redeem(
  exchange: SomniaMarkets,
  marketSymbol: string,
): Promise<RedeemResult> {
  const bal = await exchange.fetchBalance();
  const yes = bal[`${marketSymbol}#YES`]?.total ?? bal[`${marketSymbol}#yes`]?.total ?? 0;
  const no = bal[`${marketSymbol}#NO`]?.total ?? bal[`${marketSymbol}#no`]?.total ?? 0;

  // Prefer explicit outcome keys from balance map
  let amount = 0;
  for (const [sym, row] of Object.entries(bal)) {
    if (!sym.startsWith(marketSymbol)) continue;
    const total = row?.total ?? 0;
    if (total > amount) amount = total;
  }
  if (amount <= 0 && yes <= 0 && no <= 0) {
    return { redeemed: false, amount: 0, payoutHint: 0, reason: "no-position" };
  }
  const redeemAmount = Math.max(amount, yes, no);

  try {
    const res = await exchange.redeem(marketSymbol, redeemAmount);
    return {
      redeemed: true,
      amount: redeemAmount,
      payoutHint: redeemAmount,
      txHash: res.hash.startsWith("0x") ? (res.hash as `0x${string}`) : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/not.*(resolv|settled)|pending|trading|status/i.test(msg)) {
      return {
        redeemed: false,
        amount: redeemAmount,
        payoutHint: 0,
        reason: "not-settled",
      };
    }
    // Losing side or already claimed — settlement complete, nothing to pay out.
    if (/InsufficientBalance|zero|nothing|no balance|amount/i.test(msg)) {
      return {
        redeemed: false,
        amount: redeemAmount,
        payoutHint: 0,
        reason: "losing-or-empty",
      };
    }
    throw new TradeCoreError(`redeem failed: ${msg}`, "FillFailed");
  }
}
