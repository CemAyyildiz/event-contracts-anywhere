import { createPublicClient, formatEther, formatUnits, http, erc20Abi } from "viem";
import type { Address } from "viem";
import { TESTNET_ENV } from "@eca/trade-core";
import { SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";

const publicClient = createPublicClient({
  chain: TESTNET_ENV.chain,
  transport: http(TESTNET_ENV.rpcHttp),
});

export const TUSDC = SOMNIA_TESTNET_ADDRESSES.testUsdc as Address;

export async function fetchBalances(address: Address) {
  const [stt, tusdcRaw, decimals] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: TUSDC,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    }),
    publicClient
      .readContract({
        address: TUSDC,
        abi: erc20Abi,
        functionName: "decimals",
      })
      .catch(() => 18),
  ]);
  const d = Number(decimals);
  return {
    stt,
    sttLabel: Number(formatEther(stt)).toFixed(4),
    tusdc: tusdcRaw,
    tusdcLabel: Number(formatUnits(tusdcRaw, d)).toFixed(2),
    decimals: d,
  };
}
