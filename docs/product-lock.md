# Product lock — Event Contracts Anywhere

**Locked:** 2026-09-10

## Thesis

Make **DreamDEX Event Contracts** reachable where people already are — **Telegram first**, Discord next — without forcing users through the DreamDEX web funnel.

## User model

1. Open in Telegram (Mini App) or web `/tma`
2. App **creates a session wallet** (EOA) — address is yours
3. You **deposit** STT (gas) + tUSDC (stake) to that address
4. Trade Up/Down on Shannon; PnL settles to **your** address
5. Keys stay on device (localStorage / Telegram CloudStorage) — never sent to our backend

## Not the product

- News-article betting as the hero story
- Shared demo hot wallet as the real UX
- Sponsored “free play with invisible custody” as the core
- Mandatory MetaMask connect (optional import later)

## Surfaces

- `/home` — product thesis
- `/tma` — Mini App entry
- `/` — embeddable widget
