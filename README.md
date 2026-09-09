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

## Build order

1. Spikes S1–S3 → `docs/spike.md`
2. `trade-core` smoke: fund → mintSet-fill → redeem
3. Widget + demo page
4. Burner + sponsor
5. Attribution (A or B) + indexer + dashboard

## License

MIT (intended).
