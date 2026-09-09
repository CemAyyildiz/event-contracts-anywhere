import { SomniaMarkets } from "@somnia-chain/markets-sdk";
import type { Hex } from "viem";
import { resolveEnv, toExchangeConfig, type NetworkName } from "./env.js";

export type CreateExchangeOptions = {
  network?: NetworkName;
  privateKey?: Hex;
};

export async function createExchange(
  opts: CreateExchangeOptions = {},
): Promise<SomniaMarkets> {
  const env = resolveEnv(opts.network ?? "testnet");
  const exchange = new SomniaMarkets(
    toExchangeConfig(env, { privateKey: opts.privateKey }),
  );
  return exchange;
}
