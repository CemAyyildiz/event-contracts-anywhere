import {
  SOMNIA_TESTNET_ADDRESSES,
  type SomniaMarketsConfig,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import type { Hex } from "viem";

export type NetworkName = "testnet";

export type TradeEnv = {
  network: NetworkName;
  chainId: number;
  rpcHttp: string;
  wsRpcUrl: string;
  indexerUrl: string;
  addresses: typeof SOMNIA_TESTNET_ADDRESSES;
  chain: typeof somniaShannon;
};

/** Shannon testnet — single source of truth for exchange construction. */
export const TESTNET_ENV: TradeEnv = {
  network: "testnet",
  chainId: 50312,
  rpcHttp: "https://dream-rpc.somnia.network",
  // SDK live tail / realtime writes
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  // Somnia Markets indexer (EC data — not DreamDEX spot REST)
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  addresses: SOMNIA_TESTNET_ADDRESSES,
  chain: somniaShannon,
};

export function resolveEnv(network: NetworkName = "testnet"): TradeEnv {
  if (network !== "testnet") {
    throw new Error(`Unsupported NETWORK=${network}; MVP is testnet-only`);
  }
  return TESTNET_ENV;
}

export function toExchangeConfig(
  env: TradeEnv,
  opts?: { privateKey?: Hex },
): SomniaMarketsConfig {
  return {
    indexerUrl: env.indexerUrl,
    chain: env.chain,
    wsRpcUrl: env.wsRpcUrl,
    addresses: env.addresses,
    ...(opts?.privateKey ? { privateKey: opts.privateKey } : {}),
  };
}
