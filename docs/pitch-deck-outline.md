# Pitch Deck Outline — Event Contracts Anywhere

**Length:** 8 slides · **Demo:** `/home` + `/tma` + explorer tx

## Slide 1 — Title
**Event Contracts Anywhere**  
DreamDEX Event Contracts where people already are — Telegram first.  
Somnia × DreamDEX Hackathon · Shannon testnet

## Slide 2 — Problem
- Event Contracts exist; the funnel to trade them is long
- Today: leave the chat → open DreamDEX → connect wallet → fund → learn UI
- Distribution is the missing layer, not another chart

## Slide 3 — Solution
- Telegram Mini App (`/tma`) + embeddable widget
- **Session wallet** created on device — address is yours
- User deposits STT + tUSDC; Up/Down hits the real book
- Keys in localStorage / Telegram CloudStorage — never our backend

## Slide 4 — Live product
- Home → Mini App → deposit → trade → Shannon explorer
- Host attribution via `startapp` / `?host=`
- Backup / export private key in-app

## Slide 5 — Why it matters
- Brings traders who never open DreamDEX
- Channels become distribution (affiliate-ready host ids)
- Direct lift to Event Contract activity

## Slide 6 — Architecture
- `trade-core` (SDK) · `widget` (TMA + embed)
- Invariant: private keys never leave the client
- Mainnet: same UX, faucet → real deposit rails

## Slide 7 — Proof
- Shannon short-window BTC/ETH markets verified
- End-to-end fill (`buyGuaranteed`)
- Live: vercel `/home` `/tma` · GitHub · SDK feedback

## Slide 8 — Next
1. Live Telegram channels  
2. Discord surface  
3. Mainnet cutover  
4. Host payout claims  

**Links:** GitHub · https://event-contracts-anywhere.vercel.app/home/ · Demo video
