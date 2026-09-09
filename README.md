# Event Contracts Anywhere

Embeddable Up/Down Event Contract widget for Somnia Shannon testnet (DreamDEX / Somnia Markets). Zero signup, burner wallet, sponsor-funded first bet, host attribution.

**Hackathon:** Somnia × DreamDEX Event Contracts · deadline 11 Sep 2026 21:00.

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/prd.md](docs/prd.md) | Goals, FRs, epics |
| [docs/architecture.md](docs/architecture.md) | Monorepo layout, trade path, spikes |
| [docs/spike.md](docs/spike.md) | Spike S1–S3 results (fill as you run) |

## Planned monorepo (pnpm)

```
packages/trade-core   # SDK wrapper + buyGuaranteed
packages/widget       # React + Vite embed / TMA
packages/contracts    # Foundry (RouterAttribution if Path A)
apps/sponsor          # first-bet funding + caps
apps/indexer          # host metrics
apps/dashboard        # host register + embed snippet
```

## Network (testnet)

- `NETWORK=testnet` · chain `50312`
- RPC: `https://dream-rpc.somnia.network`
- SDK: `@somnia-chain/markets-sdk` ^0.29.0

## Quick start

```bash
pnpm install
pnpm spike:markets              # S1 — Shannon EC windows
pnpm trade:smoke                # needs STT + .smoke-key / PRIVATE_KEY
pnpm widget:dev                 # http://localhost:5173/demo/  (+ / for iframe)
```

Widget demo trades use `packages/widget/.env`:

```
VITE_PRIVATE_KEY=0x...   # same Shannon key with STT; never commit
```

## Build order

1. Spikes S1–S3 → `docs/spike.md` — **S1 = GO**
2. `trade-core` smoke — **fill path verified on Shannon**
3. Widget + demo page ← **now**
4. Burner + sponsor
5. Attribution (A or B) + indexer + dashboard

## License

MIT (intended).
