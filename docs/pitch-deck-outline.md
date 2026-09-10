# Pitch Deck Outline — Event Contracts Anywhere

**Length:** 8 slides · **Demo:** `/home` snippet → `/demo` embed → live fill

## Slide 1 — Title
**Event Contracts Anywhere**  
The DreamDEX slip, on someone else’s page.  
Somnia × DreamDEX Hackathon · Shannon testnet

## Slide 2 — Problem
- Event Contracts exist; the funnel is “leave and open DreamDEX”
- Empty books are a distribution problem
- Destinations don’t get readers who already have a feed

## Slide 3 — Solution
- One widget, two drop-ins: `<script>` on the web, URL in a chat
- `?host=` / `startapp` attributes the fill to the surface
- Session wallet on device; keys never hit our backend
- Up/Down hits the live Shannon book

## Slide 4 — Live product
- `/home` — copy snippet + drop-in URL
- `/demo` — slip inside a page
- Same card in Telegram when the URL is opened there (not a bot destination)

## Slide 5 — Why it matters
- Traders who never open DreamDEX
- Every publisher / channel is a desk
- Direct lift to Event Contract activity

## Slide 6 — Architecture
- `trade-core` (SDK) · `widget` (iframe + TMA shell)
- Invariant: private keys stay on the client
- Mainnet: same slip, real deposit rails

## Slide 7 — Proof
- Shannon short-window BTC/ETH markets verified
- End-to-end fill (`buyGuaranteed`)
- Live: `/home` `/demo` · GitHub · SDK feedback

## Slide 8 — Next
1. Host payout claims  
2. Discord drop-in  
3. Mainnet cutover  

**Links:** GitHub · https://event-contracts-anywhere.vercel.app/home/
