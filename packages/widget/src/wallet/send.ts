import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  getAddress,
  http,
  isAddress,
} from "viem";
import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { TESTNET_ENV } from "@eca/trade-core";
import { TUSDC } from "./balances";

export async function sendAllTusdc(opts: {
  privateKey: Hex;
  from: Address;
  to: string;
}): Promise<{ hash: Hex; amount: bigint }> {
  const { privateKey, from, to } = opts;
  if (!isAddress(to, { strict: false })) {
    throw new Error("Paste a Shannon address (0x…)");
  }
  const dest = getAddress(to);
  if (dest.toLowerCase() === from.toLowerCase()) {
    throw new Error("That’s this slip’s address");
  }

  const account = privateKeyToAccount(privateKey);
  const transport = http(TESTNET_ENV.rpcHttp);
  const publicClient = createPublicClient({
    chain: TESTNET_ENV.chain,
    transport,
  });
  const wallet = createWalletClient({
    account,
    chain: TESTNET_ENV.chain,
    transport,
  });

  const [stt, tusdc] = await Promise.all([
    publicClient.getBalance({ address: from }),
    publicClient.readContract({
      address: TUSDC,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [from],
    }),
  ]);
  if (tusdc === 0n) throw new Error("No tUSDC to send");
  if (stt === 0n) throw new Error("Need a little STT for gas");

  const hash = await wallet.writeContract({
    address: TUSDC,
    abi: erc20Abi,
    functionName: "transfer",
    args: [dest, tusdc],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return { hash, amount: tusdc };
}
