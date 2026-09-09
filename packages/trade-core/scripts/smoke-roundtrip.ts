/**
 * Epic 1 smoke: faucet (tUSDC) → buyGuaranteed → wait settle → redeem.
 *
 * Requires gas STT on the signer. Set PRIVATE_KEY in repo-root `.env`, or omit
 * to generate an ephemeral key and print a faucet funding address.
 *
 *   pnpm trade:smoke
 *   ASSET=BTC SIZE=1 SIDE=up WAIT_SETTLE=1 pnpm trade:smoke
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, formatEther, type Hex } from "viem";
import { createExchange } from "../src/createExchange.js";
import { TESTNET_ENV } from "../src/env.js";
import { getTradeableMarket } from "../src/getTradeableMarket.js";
import { buyGuaranteed } from "../src/buyGuaranteed.js";
import { redeem } from "../src/redeem.js";

function loadEnvFile() {
  const candidates = [
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../../.env"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2]?.trim() ?? "";
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
    console.log("loaded env:", p);
    return;
  }
}

function resolveKey(): { key: Hex; ephemeral: boolean } {
  const fromEnv = process.env.PRIVATE_KEY?.trim();
  if (fromEnv) {
    const key = (fromEnv.startsWith("0x") ? fromEnv : `0x${fromEnv}`) as Hex;
    return { key, ephemeral: false };
  }
  return { key: generatePrivateKey(), ephemeral: true };
}

async function waitForSettle(
  exchange: Awaited<ReturnType<typeof createExchange>>,
  marketId: string,
  expiryMs: number,
) {
  const deadline = Math.max(expiryMs + 90_000, Date.now() + 30_000);
  console.log("waiting for settle until", new Date(deadline).toISOString());
  while (Date.now() < deadline) {
    try {
      if (marketId.startsWith("0x")) {
        const onchain = await exchange.client.getMarketOnchain(
          marketId as `0x${string}`,
        );
        const status = (onchain as { status?: number }).status;
        console.log("onchain status:", status, new Date().toISOString());
        // BinaryMarketStatus: 1 Trading — anything else after expiry may be resolvable
        if (status != null && status !== 1) return status;
      }
    } catch (e) {
      console.log("status poll err:", e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  return null;
}

async function main() {
  loadEnvFile();
  const asset = (process.env.ASSET ?? "BTC").toUpperCase();
  const size = Number(process.env.SIZE ?? "1");
  const side = (process.env.SIDE ?? "up") as "up" | "down";
  const waitSettle = process.env.WAIT_SETTLE !== "0";

  const { key, ephemeral } = resolveKey();
  const account = privateKeyToAccount(key);
  console.log("=== trade:smoke ===");
  console.log("address:", account.address);
  console.log("ephemeral:", ephemeral);
  console.log("asset/side/size:", asset, side, size);

  const publicClient = createPublicClient({
    chain: TESTNET_ENV.chain,
    transport: http(TESTNET_ENV.rpcHttp),
  });
  const stt = await publicClient.getBalance({ address: account.address });
  console.log("STT balance:", formatEther(stt));

  if (stt === 0n) {
    const keyPath = resolve(process.cwd(), "../../.smoke-key");
    try {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(
        keyPath,
        `# ephemeral smoke signer — gitignored\nPRIVATE_KEY=${key}\n`,
        { mode: 0o600 },
      );
      console.error(`Wrote key to ${keyPath} (gitignored). Do not commit or paste it.`);
    } catch {
      console.error("Could not write .smoke-key — set PRIVATE_KEY in .env yourself.");
    }
    console.error(`
NO GAS — fund this address with STT on Shannon, then re-run:

  ${account.address}

Faucets:
  https://testnet.somnia.network/
  https://cloud.google.com/application/web3/faucet/somnia/shannon

After funding:
  cp .smoke-key .env    # or merge PRIVATE_KEY into .env
  pnpm trade:smoke
`);
    process.exit(2);
  }

  const exchange = await createExchange({ privateKey: key });

  // tUSDC via SDK faucet (needs gas)
  try {
    console.log("calling trader.faucet() for tUSDC…");
    const f = await exchange.trader.faucet();
    console.log("faucet tx:", f.hash);
  } catch (e) {
    console.log(
      "faucet skipped/failed (may already have tUSDC):",
      e instanceof Error ? e.message : e,
    );
  }

  let market = await getTradeableMarket(exchange, asset);
  if (!market || market.ttlSec <= 60) {
    console.log("waiting for a window with TTL>60s…");
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 10_000));
      market = await getTradeableMarket(exchange, asset);
      if (market && market.ttlSec > 60) break;
    }
  }
  if (!market || market.ttlSec <= 60) {
    throw new Error("No tradeable market with TTL>60s");
  }

  console.log("market:", {
    marketSymbol: market.marketSymbol,
    up: market.upSymbol,
    ttlSec: market.ttlSec,
    expiry: new Date(market.expiryMs).toISOString(),
  });

  const fill = await buyGuaranteed(exchange, {
    market,
    side,
    sizeUsdc: size,
  });
  console.log("buyGuaranteed:", fill);

  if (!waitSettle) {
    console.log("WAIT_SETTLE=0 — skipping redeem");
    await exchange.close();
    return;
  }

  await waitForSettle(exchange, market.marketId, market.expiryMs);
  const red = await redeem(exchange, market.marketSymbol);
  console.log("redeem:", red);

  await exchange.close();
  console.log("=== smoke done ===");
}

main().catch((err) => {
  console.error("trade:smoke failed:", err);
  process.exit(1);
});
