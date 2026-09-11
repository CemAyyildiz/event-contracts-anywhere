# Event Contracts Anywhere

<p align="center">
  <img src="packages/widget/public/logo-512.png" width="128" alt="Anywhere — window with the slip inside" />
</p>

A DreamDEX Event Contract **slip** you drop into a page or a chat. Not a destination bot.

**Hackathon:** Somnia × DreamDEX Event Contracts · DoraHacks  
**Deadline:** 2026-09-11 21:00  
**Live:** https://event-contracts-anywhere.vercel.app/

## Jury demo (90 seconds)

1. Open `/` — the window is live; we drop it on their page. Scroll **Surfaces**: web, chat, TMA live; Discord / TG channels soon.
2. **Watch it in a page** → `/demo/` — same slip inside someone else’s layout.
3. On the slip: Up or Down (showcase auto-funds **1 STT + 1 tUSDC**). Wait for the tape + Shannon explorer link.
4. Address chip → **Send** — paste any `0x`, all tUSDC leaves the session wallet. No connect.
5. **Steal the snippet** — host id + market. Copied `<script>` has no demo flags: third-party readers see Get faucet. `?host=` is attribution, not a payout.

Chat drop-in: `https://event-contracts-anywhere.vercel.app/slip/?host=YOUR_DESK&market=BTC`

```html
<script
  src="https://event-contracts-anywhere.vercel.app/w.js"
  data-host="your-desk"
  data-market="BTC"
></script>
```

If the window has ≤60s left, wait for the next print. Do not claim host fees.

Docs: [prd v0.2](docs/prd.md) · [product lock](docs/product-lock.md) · [architecture](docs/architecture.md)

## License

MIT (intended).
