# SDK & Documentation Feedback Report

**Project:** Event Contracts Anywhere  
**Hackathon:** Somnia × DreamDEX Event Contracts (DoraHacks)  
**SDK:** `@somnia-chain/markets-sdk` ^0.29.0  
**Date:** 2026-09-10

## What worked well

1. **Unified exchange API** — `loadMarkets`, `fetchOrderBook` / `watchOrderBook`, `createOrder`, `mintSet`, `redeem`, and `trader.faucet()` were enough to build a full consumer trade loop without custom ABI glue for the happy path.
2. **Shannon testnet parity** — `somniaShannon` + `SOMNIA_TESTNET_ADDRESSES` + `https://dev.smk.somnia.host/v1/graphql` behaved consistently; short-window BTC/ETH Event Contracts resolve on a ~1 minute cadence, which is ideal for demos.
3. **Human units + IOC** — DreamDEX docs’ IOC + touch-cross recipe (`ask + 0.02`) filled thin books in practice; `realtime_sendRawTransaction` made write latency feel “product-like.”
4. **Types & docs** — Package types + Event Contracts developer page unblocked Epic 1 spikes quickly (`spike:markets` → live GO in one session).

## Friction / gaps

1. **Browser bundle size** — SDK + viem dominate the widget chunk (~700KB+ gz combined vendors). Tree-shaking `/react` and reactivity peers helps, but a documented “lite read+trade” entry would help embed use cases.
2. **Private key vs walletClient** — Burner/session UX wants `privateKey` in-browser; docs emphasize both paths, but examples skew Node. A short “session wallet in the browser” recipe would reduce footguns (and make clear that `VITE_*` keys are demo-only).
3. **Redeem on losing side** — Post-resolution `redeem` throws `InsufficientBalance` when the held outcome lost. Returning a typed “nothing to redeem” (or documenting it) would simplify consumer UIs.
4. **DreamDEX REST vs EC** — HTTP API is spot-only; EC is SDK-only. Worth a one-line callout on every DreamDEX API page so teams don’t waste a day on REST for Event Contracts.
5. **Indexer lag vs on-chain gate** — Docs correctly say gate writes on `getMarketOnchain`; we relied on that. More sample code showing “TTL &lt; 60s → successor market” would match rolling EC windows.

## Suggestions

- Publish a minimal **embeddable widget** sample (iframe + `w.js`) next to the bot kit.
- Document **mintSet → sell unwanted leg** as the canonical thin-book fill pattern (we implemented this as `buyGuaranteed`).
- Clarify testnet faucet: STT (gas) vs `trader.faucet()` (tUSDC) ordering.

## Overall

SDK is production-capable for a consumer Event Contracts surface. With clearer browser/session guidance and smaller embed surface area, third-party distribution (Telegram Mini Apps, publisher embeds) becomes much easier — which is exactly the adoption problem this hackathon should unlock.
