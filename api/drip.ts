// @ts-nocheck — Vercel bundles this with a stricter viem TS check than the app.
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  isAddress,
  parseEther,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC = "https://dream-rpc.somnia.network";
const TUSDC = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E";
const STT_DRIP = parseEther("0.01");
const TUSDC_DRIP = parseUnits("1", 6);

const shannon = defineChain({
  id: 50312,
  name: "Somnia Shannon",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const tokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
];

export async function dripTo(address, rawKey) {
  if (typeof address !== "string" || !isAddress(address)) {
    return { ok: false, status: 400, error: "Need a wallet address" };
  }
  const key = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    return { ok: false, status: 503, error: "Faucet is not configured" };
  }

  const account = privateKeyToAccount(key);
  if (address.toLowerCase() === account.address.toLowerCase()) {
    return { ok: false, status: 400, error: "Faucet cannot drip to itself" };
  }

  const transport = http(RPC);
  const publicClient = createPublicClient({ chain: shannon, transport });
  const wallet = createWalletClient({ account, chain: shannon, transport });

  const [needStt, needTusdc, faucetStt, faucetTusdc] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: TUSDC,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [address],
    }),
    publicClient.getBalance({ address: account.address }),
    publicClient.readContract({
      address: TUSDC,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [account.address],
    }),
  ]);

  const sendStt = needStt < STT_DRIP / 2n;
  const sendTusdc = needTusdc < TUSDC_DRIP;
  if (!sendStt && !sendTusdc) {
    return { ok: true, status: 200, skipped: true };
  }
  if (sendStt && faucetStt < STT_DRIP + parseEther("0.002")) {
    return { ok: false, status: 503, error: "Faucet STT is empty" };
  }
  if (sendTusdc && faucetTusdc < TUSDC_DRIP) {
    return { ok: false, status: 503, error: "Faucet tUSDC is empty" };
  }

  let sttHash;
  let tusdcHash;
  if (sendStt) {
    sttHash = await wallet.sendTransaction({ to: address, value: STT_DRIP });
    await publicClient.waitForTransactionReceipt({ hash: sttHash });
  }
  if (sendTusdc) {
    tusdcHash = await wallet.writeContract({
      address: TUSDC,
      abi: tokenAbi,
      functionName: "transfer",
      args: [address, TUSDC_DRIP],
    });
    await publicClient.waitForTransactionReceipt({ hash: tusdcHash });
  }

  return { ok: true, status: 200, sttHash, tusdcHash };
}
