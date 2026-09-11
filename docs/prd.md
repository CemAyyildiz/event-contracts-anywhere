# Anywhere — Product Requirements

> Source of truth for MVP. Supersedes v0.1 where they conflict.  
> Hackathon: Somnia × DreamDEX Event Contracts · Shannon (50312) · submit 2026-09-11 21:00.

## Goals and Background Context

### Goals
- Put a DreamDEX Event Contract **slip on a host’s surface** (web page or chat URL) so readers never open DreamDEX.
- Attribute volume on-chain: `?host=` / `data-host` becomes order `userData`. Host desk reads the indexer. Payout claim is later.
- Every Up/Down tap hits the live Shannon book (`buyGuaranteed` / mint-sell path).
- Session wallet is the reader’s EOA; keys stay on device; they fund STT + tUSDC.
- A 2–3 minute demo: host drop-in → reader fund → fill → explorer.

### Background Context
Empty Event Contract books are a **distribution** problem. Anywhere is a paste-in card, not a destination bot and not a news-betting site.

### Change Log
| Date | Version | Notes |
|---|---|---|
| 2026-09-09 | 0.1 | Original BMAD PRD (sponsor + host panel in MVP) |
| 2026-09-10 | 0.2 | Correct course: embed-first MVP; sponsor/payout/router → post-MVP |

## Requirements

### Functional — MVP

- **FR1:** Browser/TMA session EOA signs `@somnia-chain/markets-sdk` trades on Shannon.
- **FR2:** First load creates a keypair; persist `localStorage` (web) and Telegram `CloudStorage` when present. Key is never sent to our backend (there is no key backend).
- **FR3:** `buyGuaranteed` fills even on a thin book (IOC or mintSet + sell unwanted leg).
- **FR4:** Reader deposits STT (gas) and tUSDC (stake) to the session address. Testnet faucets are the funding path. **No sponsored first bet in MVP.**
- **FR5:** If the window has ≤60s left, do not open a new position on that market; wait/select successor.
- **FR6:** After settle, attempt redeem; losing/empty is a no-op with a clear status.
- **FR7:** Every embed/URL carries `hostId` (`data-host` / `?host=` / `startapp`). That id is written into the order `userData` on Shannon. The host desk lists tagged orders from the indexer.
- **FR8:** `/` (landing) gives a copy-paste `<script>` and a chat URL for a chosen host id + market.
- **FR9:** Widget is one codebase: iframe via `w.js` and the same app at `/` and `/tma`.
- **FR10:** Live odds + top of book (SDK watch, REST poll fallback).
- **FR11:** Settled result + local history.
- **FR12:** Returning user on the same device reuses the same session wallet and balances.

### Functional — post-MVP (backlog)

- **FR-B1:** Sponsor service: once-per-address STT + tUSDC with caps.
- **FR-B2:** Host register, payout address, fee claim.
- **FR-B3:** Host fee claim / `RouterAttribution` payouts. Desk already reads attributed volume.
- **FR-B4:** Discord Activity (beyond a pasteable URL).
- **FR-B5:** Encrypted key material at rest; export/import wallet.
- **FR-B6:** Auto-redeem via Reactivity without polling.

### Non-Functional

- **NFR1:** Touch → position-open p50 ≤ 5s on Shannon after the wallet is funded.
- **NFR2:** Private keys never leave the client.
- **NFR3:** No custodian backend in MVP.
- **NFR4:** Embed loader stays tiny; SDK stays inside the iframe origin.
- **NFR5:** MIT; public repo.
- **NFR6:** WS down → poll; redeem watcher is client-side poll in MVP.
- **NFR7:** Testnet only. No real money. No KYC.

## User Interface Design Goals

### Overall UX Vision
The **host’s page or chat** is the product. The slip looks like a betting card (newsprint, condensed type), not a destination DEX. Reader flow: fund → Up/Down → tape.

### Core screens
- `/home` — how it is used (host vs reader) + take-the-slip (snippet + URL) + live preview.
- `/demo` — slip inside a page (proof of embed).
- Widget: fund (address, balances, faucets) → trade (odds, stake, Up/Down, tape, history).
- `/tma` — same widget when a chat URL is opened in Telegram (plumbing).

### Branding
Newsprint / tote-slip. Not dark-crypto gradient. Not “open our bot”.

### Devices
Responsive web; iframe ~28rem; Telegram WebView full-bleed.

## Technical Assumptions

### Repo
pnpm monorepo: `packages/trade-core`, `packages/widget`. Vercel static from `packages/widget/dist`.

### Explicitly not in MVP tree
`apps/sponsor`, `apps/indexer`, `apps/dashboard`, `packages/contracts`.

### Stack
TypeScript, React, Vite, `@somnia-chain/markets-sdk` ^0.29.0, viem. Shannon RPC `https://dream-rpc.somnia.network`.

### Testing
`pnpm spike:markets`, `pnpm trade:smoke` (funded key). Manual widget QA. No CI requirement for submit.

## Epic List

### MVP (hackathon)

1. **Epic 1 — Trade core** — Shannon EC + `buyGuaranteed` + redeem. *CLI smoke.*
2. **Epic 2 — Embeddable slip** — `w.js`, live book, Up/Down, history, `/demo`.
3. **Epic 3 — Session wallet & host drop-in** — on-device EOA, self-fund, `/home` snippet+URL, TMA as URL shell.

### Post-MVP (backlog)

4. **Epic 4 — Host economics** — register, indexer or router, payouts, dashboard.
5. **Epic 5 — Pilot & submit polish** — video, BUIDL, real host installs, Discord Activity, sponsor (optional).

---

## Epic 1 — Trade core

**Status: done** (Story 1.5 deferred).

- 1.1 Spike Shannon EC — done (`docs/spike.md` GO).
- 1.2 `createExchange` + `getTradeableMarket` — done.
- 1.3 `buyGuaranteed` — done.
- 1.4 `redeem` including losing no-op — done.
- 1.5 Contract-routed mint spike — **backlog**.

## Epic 2 — Embeddable slip

**Status: done** for hackathon bar.

- 2.1 `w.js` iframe + host/market — done.
- 2.2 Live odds/book/countdown — done.
- 2.3 Up/Down + size → trade-core — done (session key, not env key).
- 2.4 Settle tape + local history — done.
- 2.5 Demo page as embed proof (not news-hero) — done.

## Epic 3 — Session wallet & host drop-in

**Status: in progress → treat as done except submit assets.**

- 3.1 Session EOA, localStorage / CloudStorage — done (plaintext at rest; encrypt = backlog).
- 3.2 Self-fund UI + faucets — done. **Sponsor story cancelled for MVP.**
- 3.3 `/home` how-to + snippet + chat URL — done.
- 3.4 `/tma` same widget; `startapp`/`?host=` — done as plumbing.
- 3.5 Backup/export key in-widget — done (rough).

## Epic 4 — Host economics — backlog

Former 4.1A/B, 4.2, 4.3 payout panel, 4.4 live metrics.

MVP substitute: host id on snippet/URL only.

## Epic 5 — Pilot & submit — backlog / remaining

- 5.1 Auto-redeem without client poll — backlog.
- 5.2 Public stats — backlog.
- 5.3 Real host installs — backlog.
- 5.4 Demo video + BUIDL — **required to submit, not built.**

## Next Steps

1. Record demo: `/home` how-to → copy snippet → `/demo` or URL → fund → Up/Down → explorer.
2. Submit DoraHacks BUIDL with those URLs.
3. After deadline: Epic 4 if hosts need payouts; optional sponsor for one-tap.
