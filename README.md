# Anywhere

<p align="center">
  <img src="packages/widget/public/logo-512.png" width="128" alt="Anywhere" />
</p>

A DreamDEX Event Contract slip you drop onto someone else’s page or chat. The reader never leaves. Up or Down still hits the live Shannon book.

**Live:** https://event-contracts-anywhere.vercel.app/

## Drop-in

```html
<script
  src="https://event-contracts-anywhere.vercel.app/w.js"
  data-host="your-desk"
  data-market="BTC"
></script>
```

Chat: `https://event-contracts-anywhere.vercel.app/slip/?host=YOUR_DESK&market=BTC`

Same card at `/demo/` (host page) and `/tma/` (Telegram WebView). Session wallet prints on the device. Showcase auto-funds 1 STT + 1 tUSDC; third-party embeds keep Get faucet. After a fill, Send moves tUSDC to any `0x`. `?host=` tags the fill — payouts are next, not this build.

If the window has ≤60s left, wait for the next print.

Somnia Shannon (`50312`) · `@somnia-chain/markets-sdk`

## License

MIT
