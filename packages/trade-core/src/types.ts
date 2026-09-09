export type Side = "up" | "down";

export type BuyGuaranteedResult = {
  netSide: Side;
  netSize: number;
  path: "ioc" | "mint-sell";
  txHashes: `0x${string}`[];
  refundUsdc: number;
  residualUnwanted: number;
  marketSymbol: string;
  desiredSymbol: string;
};

export class TradeCoreError extends Error {
  constructor(
    message: string,
    readonly code: "InsufficientFunds" | "MarketClosed" | "FillFailed" | "NoMarket" | "NotSettled",
  ) {
    super(message);
    this.name = "TradeCoreError";
  }
}
