# DoraHacks BUIDL — paste this

Hackathon: Somnia × DreamDEX Event Contracts  
Submit: https://dorahacks.io/hackathon/event-contracts/detail  
Deadline: 2026-09-11 21:00

## Fields

**Name:** Anywhere

**Tagline:** The DreamDEX window, on the page they were already on.

**Logo (square):** `packages/widget/public/logo-512.png`  
(or `logo-1024.png` if the form wants larger)

**Cover / banner:** `packages/widget/public/og.png`

**Demo URL:** https://event-contracts-anywhere.vercel.app/

**GitHub:** https://github.com/CemAyyildiz/event-contracts-anywhere

**SDK feedback:** https://github.com/CemAyyildiz/event-contracts-anywhere/blob/main/docs/sdk-feedback.md

**Deck (optional):** https://github.com/CemAyyildiz/event-contracts-anywhere/blob/main/docs/pitch-deck-outline.md

**Tags:** DreamDEX, Event Contracts, Somnia, Shannon, widget, embed, Telegram

**Video:** 2–3 min, required. Script at the bottom. Paste the YouTube/Loom URL when you have it.

## Description

```markdown
# Anywhere

A DreamDEX Event Contract **slip** a host drops onto someone else’s page or chat. The reader never opens DreamDEX. Up / Down still hits the live Shannon book.

**Live:** https://event-contracts-anywhere.vercel.app/  
**In a host page:** https://event-contracts-anywhere.vercel.app/demo/  
**Network:** Somnia Shannon (`50312`) · `@somnia-chain/markets-sdk` ^0.29.0

## Problem
Event Contracts are live. Attention is not on a destination DEX — it is on a page or a chat. Leave → DreamDEX → connect wallet → find the window is why books stay thin.

## Solution
One widget, two drop-ins:
- Web: `<script src="…/w.js" data-host="desk" data-market="BTC">`
- Chat: `/slip/?host=desk&market=BTC`

Session EOA prints on the reader’s device. No MetaMask. Showcase auto-funds **1 STT + 1 tUSDC** (SDK writes lock a 0.6 STT gas envelope). Third-party embeds keep **Get faucet**. Up/Down is `buyGuaranteed` (IOC, else mint-set). PnL lands on the session address; **Send** pushes tUSDC to any `0x`. `?host=` tags the fill (payouts are next, not this demo).

## Surfaces
**Live:** any webpage, chat URL, Telegram Mini App (`/tma/`).  
**Soon:** Discord channels, Telegram channels.  
**Next:** host payouts.

## Proof
Live IOC fill on Shannon:  
https://shannon-explorer.somnia.network/tx/0x903adb56eb0c90356b4d288db3bda399a931d1004e876c1dfac2d47cd001bafd

## Stack
pnpm monorepo: `trade-core` + `widget` (Vite). Vercel. Keys never leave the client.

## Not this BUIDL
Not a destination bot. Not a news-betting site. Not WalletConnect.
```

## How to test

```
1. Open https://event-contracts-anywhere.vercel.app/
2. Tap Up on the live slip (wait if window ≤ 60s). Tape + Shannon explorer.
3. /demo/ — same slip inside a host page.
4. Address chip → Send (optional).
5. Copy the snippet. Host paste has no demo flags → Get faucet.
```

## Video (2 min)

1. Headline: “The window is live. Drop it on their page.”
2. Up → tape **ioc** → explorer.
3. `/demo/` — “this is someone else’s site.”
4. Surfaces: three live, Discord/TG soon.
5. Snippet: “host pastes; `?host=` tags the fill.”
6. Send: “PnL to your own address. No connect.”
7. Close: “Same slip. Every surface.”
