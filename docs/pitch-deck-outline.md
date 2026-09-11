# Pitch Deck Outline — Anywhere

**Length:** 8 slides · **Demo:** `/` live slip → `/demo/` embed → Up/Down → explorer → Send

## Slide 1 — Title
**Anywhere**  
The DreamDEX window, on the page they were already on.  
Somnia × DreamDEX Hackathon · Shannon testnet

## Slide 2 — Problem
- Event Contracts exist; the funnel is “leave and open DreamDEX”
- Attention already sits on a page or a chat, not on a destination DEX
- The window is live — it should print where the reader already is

## Slide 3 — Solution
- One widget, two drop-ins: `<script>` on the web, URL in a chat
- Session wallet on device; no MetaMask; keys never hit our backend
- Up/Down hits the live Shannon book (`@somnia-chain/markets-sdk`)
- `?host=` tags the fill to the surface (payouts are post-MVP)

## Slide 4 — Live product
- `/` — Framer landing + live slip
- `/demo/` — same card inside a host page
- `/slip/` — the widget; `/tma/` same card in Telegram WebView

## Slide 5 — Why it matters
- Readers who never open DreamDEX still print a fill
- Any page or chat URL is a desk
- Direct lift to Event Contract activity — if the slip is where the feed is

## Slide 6 — Architecture
- `trade-core` (SDK) · `widget` (iframe + TMA shell)
- Invariant: private keys stay on the client
- SDK writes need a **0.6 STT gas envelope** (10M × 60 gwei); faucet sends 1 STT + 1 tUSDC

## Slide 7 — Proof
- Shannon short-window BTC/ETH markets
- Live fill + explorer hash on the tape
- Send tUSDC to any address from the session key
- GitHub · SDK feedback

## Slide 8 — Next
1. Host payout claims  
2. Discord drop-in  
3. Mainnet cutover (real deposit rails, encrypt key at rest)

**Links:** GitHub · https://event-contracts-anywhere.vercel.app/
