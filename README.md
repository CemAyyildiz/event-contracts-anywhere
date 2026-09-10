# Event Contracts Anywhere

Embeddable Up/Down Event Contract widget for Somnia Shannon testnet (DreamDEX / Somnia Markets). Zero signup, session wallet, sponsor-funded first bet, host attribution.

**Hackathon:** Somnia × DreamDEX Event Contracts · DoraHacks  
**Submission deadline (extended):** 2026-09-11 21:00

## Links

| | |
|--|--|
| **Live demo** | https://event-contracts-anywhere.vercel.app/demo/ |
| **Widget** | https://event-contracts-anywhere.vercel.app/ |
| Repo | https://github.com/CemAyyildiz/event-contracts-anywhere |
| DoraHacks | https://dorahacks.io/hackathon/event-contracts/detail |
| Docs | [prd](docs/prd.md) · [architecture](docs/architecture.md) · [spike](docs/spike.md) · [SDK feedback](docs/sdk-feedback.md) · [pitch outline](docs/pitch-deck-outline.md) |

## Quick start

```bash
pnpm install
pnpm spike:markets              # S1 — Shannon EC windows
pnpm trade:smoke                # needs STT + `.smoke-key` / PRIVATE_KEY
pnpm widget:dev                 # http://localhost:5173/demo/
```

Widget demo trades use `packages/widget/.env`:

```
VITE_PRIVATE_KEY=0x...   # Shannon key with STT; never commit
```

## Deploy (Vercel)

```bash
vercel login
vercel --prod
# set VITE_PRIVATE_KEY in Vercel env (demo only — ends up in client bundle)
```

Root `vercel.json` builds `@eca/widget` → `packages/widget/dist`.  
Demo path: `/demo/` · Widget: `/`

## Build order

1. Spikes S1–S3 → `docs/spike.md` — **S1 = GO**
2. `trade-core` smoke — **fill path verified on Shannon**
3. Widget + demo page — **done**
4. Burner + sponsor — next
5. Attribution + indexer + dashboard

## License

MIT (intended).
