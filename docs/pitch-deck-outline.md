# Pitch Deck Outline — Event Contracts Anywhere

**Length:** 8 slides · **Tone:** production architecture on Shannon · **Demo:** live URL + explorer tx

## Slide 1 — Title
**Event Contracts Anywhere**  
Zero-setup Up/Down trades — embedded where users already are.  
Somnia × DreamDEX Hackathon · Shannon testnet

## Slide 2 — Problem
- Thousands of Event Contract markets; vast majority see zero flow
- Funnel today: open DreamDEX → connect wallet → get STT/tUSDC → learn UI
- Hackathon supply-side crowded; **demand/distribution** underserved

## Slide 3 — Solution
- Embeddable **Up/Down** widget (web script + Telegram Mini App path)
- **Session wallet** (burner) — no MetaMask for the bettor
- Sponsored first touch (testnet faucet / sponsor service)
- Every fill hits the real Somnia Markets order book (`mintSet`-guaranteed when thin)

## Slide 4 — Live product
- QR / link → demo page or TMA
- Tap Up/Down → Shannon tx → explorer
- Host attribution model (on-chain router **or** off-chain map)

## Slide 5 — Why it matters (ecosystem)
- Brings *new* users who never open DreamDEX
- Turns publishers/Telegram admins into distribution (affiliate economics)
- Directly increases Event Contract trading activity

## Slide 6 — Architecture (1 diagram)
- `trade-core` (SDK) · `widget` · sponsor · indexer · dashboard
- Invariant: private keys never leave the client
- Mainnet cutover: same UX, deposit/Relay replaces faucet

## Slide 7 — Traction / proof
- Shannon: live BTC/ETH short windows verified (S1 GO)
- End-to-end fill on testnet (IOC / mint-sell path)
- Repo + docs + SDK feedback submitted

## Slide 8 — Ask / next 1–2 weeks
1. Public burner + sponsor hardening  
2. Telegram Mini App pilot in 2–3 groups  
3. Mainnet addresses + deposit path  
4. Host payout claims  

**Links:** GitHub · Live demo · Demo video · SDK feedback
