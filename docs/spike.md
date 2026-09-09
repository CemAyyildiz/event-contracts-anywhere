# Spikes (Epic 1)

Filled from live Shannon runs. Architecture branches on S1–S3.

| ID | Question | Result | Date | Notes |
|----|----------|--------|------|-------|
| S1 | Live resolving BTC/ETH short-window EC on Shannon? | **GO** | 2026-09-09 | `pnpm spike:markets` |
| S2 | Contract can mint/trade on funder's behalf? | _pending_ | | Path A vs B |
| S3 | Reactivity available on Shannon? | _pending_ | | auto-redeem vs in-widget |

## S1 — Markets

**Verdict: GO** — Shannon testnet has rolling short-window BTC/ETH Event Contracts that are on-chain `Trading` (status `1`) with live top-of-book.

### Run

```bash
pnpm spike:markets
```

- **When:** 2026-09-09 ~22:13 UTC (local 01:13+03 next calendar day)
- **Indexer:** `https://dev.smk.somnia.host/v1/graphql`
- **Chain:** `50312` / `somniaShannon`
- **WS:** `wss://api.infra.testnet.somnia.network/ws`

### Observations

| Metric | Value |
|--------|------:|
| `loadMarkets(true)` total | 49 |
| Active binary | 16 |
| BTC/ETH binary | 16 |
| Short window (&lt;1h TTL) | 10 |

Examples (at run time):

- `ETH-245015-09SEP26-2214/tUSDC#YES` — TTL ~25s, status 1, ask 0.661 / bid 0.633
- `BTC-0-09SEP26-2215-87A7/tUSDC#YES` — TTL ~85s, status 1, ask 0.938 / bid 0.917
- Hourly windows also present (`…-2300`, `…-10SEP26` midnight)
- Longer-dated `BTC/ETH-0-19OCT26` also listed

Cadence looks like **~1 minute rolling windows** plus hourly/daily — enough for demo settle loops.

WS `watchOrderBook` opened; probe logging hit a BigInt JSON serialize issue only (non-blocking for S1).

### Implications

- Proceed with `getTradeableMarket` + `buyGuaranteed` against BTC/ETH short windows.
- Enforce **TTL &gt; 60s** (skip the ~25s leftovers; use successor).
- Collateral symbol on testnet books: **tUSDC** (not mainnet USDso).

## S2 — Router / mint feasibility

_TODO — Epic 1.5 Foundry / ABI probe_

## S3 — Reactivity

_TODO_
