import { useEffect, useMemo, useState } from "react";
import { buyGuaranteed, redeem, TradeCoreError } from "@eca/trade-core";
import type { Hex } from "viem";
import { MiniChart } from "./MiniChart";
import { loadBets, pushBet, type BetRecord } from "./history";
import { useTradeSession } from "./useTradeSession";

function params() {
  const q = new URLSearchParams(window.location.search);
  return {
    hostId: q.get("host") || "anonymous",
    asset: (q.get("market") || "BTC").toUpperCase(),
  };
}

function formatPct(p: number | null) {
  if (p == null) return "—";
  return `${(p * 100).toFixed(1)}%`;
}

function ttlLabel(sec: number | null | undefined) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

type Phase = "idle" | "open" | "settled" | "busy";

export function App() {
  const { hostId, asset } = useMemo(() => params(), []);
  const pk = import.meta.env.VITE_PRIVATE_KEY as string | undefined;
  const privateKey = pk
    ? ((pk.startsWith("0x") ? pk : `0x${pk}`) as Hex)
    : undefined;

  const { exchange, market, book, ticks, error, ready, mode, setError } =
    useTradeSession(asset, privateKey);

  const [size, setSize] = useState<1 | 5 | 25>(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("Pick Up or Down");
  const [bets, setBets] = useState<BetRecord[]>(() => loadBets());
  const [showHistory, setShowHistory] = useState(false);
  const [openBet, setOpenBet] = useState<BetRecord | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // postMessage height to embed parent
  useEffect(() => {
    const report = () => {
      const height = document.documentElement.scrollHeight;
      parent.postMessage({ type: "eca:resize", height }, "*");
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [phase, showHistory, statusText, bets.length]);

  const ttlSec = market
    ? Math.max(0, Math.floor((market.expiryMs - now) / 1000))
    : null;

  // After open: poll settle then redeem
  useEffect(() => {
    if (phase !== "open" || !exchange || !openBet || !market) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        if (!openBet.marketSymbol) return;
        if (market.marketId.startsWith("0x")) {
          const onchain = await exchange.client.getMarketOnchain(
            market.marketId as `0x${string}`,
          );
          const status = (onchain as { status?: number }).status;
          if (status != null && status !== 1) {
            const red = await redeem(exchange, openBet.marketSymbol);
            if (cancelled) return;
            setPhase("settled");
            const note =
              red.redeemed
                ? `Won · redeemed ${red.amount}`
                : red.reason === "losing-or-empty"
                  ? "Settled · this side lost"
                  : `Settled · ${red.reason ?? "done"}`;
            setStatusText(note);
            setBets((prev) => {
              const next = prev.map((b) =>
                b.id === openBet.id
                  ? { ...b, status: "settled" as const, note }
                  : b,
              );
              localStorage.setItem("eca.bets.v1", JSON.stringify(next));
              return next;
            });
            clearInterval(timer);
          }
        }
      } catch {
        /* keep polling */
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, exchange, openBet, market]);

  async function onTrade(side: "up" | "down") {
    setError(null);
    if (!privateKey) {
      setStatusText("Set VITE_PRIVATE_KEY for demo trades (burner comes next)");
      return;
    }
    if (!exchange || !market) {
      setStatusText("Market not ready");
      return;
    }
    if ((ttlSec ?? 0) <= 60) {
      setStatusText("Window too close — waiting for next…");
      return;
    }
    setPhase("busy");
    setStatusText("Sending…");
    try {
      const fill = await buyGuaranteed(exchange, {
        market,
        side,
        sizeUsdc: size,
      });
      const bet: BetRecord = {
        id: `${Date.now()}`,
        at: Date.now(),
        hostId,
        asset,
        side,
        size,
        marketSymbol: fill.marketSymbol,
        path: fill.path,
        txHashes: fill.txHashes,
        status: "open",
      };
      setBets(pushBet(bet));
      setOpenBet(bet);
      setPhase("open");
      setStatusText(
        `Open ${side.toUpperCase()} · ${size} tUSDC · ${fill.path} · live`,
      );
    } catch (e) {
      setPhase("idle");
      const msg =
        e instanceof TradeCoreError
          ? e.message
          : e instanceof Error
            ? e.message
            : String(e);
      setStatusText("Trade failed");
      setError(msg);
    }
  }

  return (
    <div className="shell">
      {!privateKey && (
        <div className="warn-banner">
          Demo mode: add VITE_PRIVATE_KEY (Shannon STT + faucet) to trade.
        </div>
      )}
      <div className="top">
        <div className="brand">ECA · {hostId}</div>
        <div className="ttl">{ttlLabel(ttlSec)} left · {mode}</div>
      </div>

      <div className="prob">
        <strong>{formatPct(book.upProb)}</strong>
        <span>Up probability · {asset}</span>
      </div>
      <div className="book">
        <span>Bid {book.bid?.toFixed(3) ?? "—"}</span>
        <span>Ask {book.ask?.toFixed(3) ?? "—"}</span>
      </div>
      {market && <div className="symbol">{market.upSymbol}</div>}

      <MiniChart ticks={ticks} strikeHint={book.mid} />

      <div className="sizes">
        {([1, 5, 25] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={size === s ? "on" : ""}
            onClick={() => setSize(s)}
            disabled={phase === "busy"}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="actions">
        <button
          type="button"
          className="up"
          disabled={!ready || phase === "busy" || phase === "open"}
          onClick={() => void onTrade("up")}
        >
          Up
        </button>
        <button
          type="button"
          className="down"
          disabled={!ready || phase === "busy" || phase === "open"}
          onClick={() => void onTrade("down")}
        >
          Down
        </button>
      </div>

      <div className="status">
        <div className="label">Status</div>
        <div className="body">{statusText}</div>
        {(error || (!ready && !error)) && (
          <div className="err">{error ?? "Connecting…"}</div>
        )}
      </div>

      <button
        type="button"
        className="drawer-toggle"
        onClick={() => setShowHistory((v) => !v)}
      >
        {showHistory ? "Hide" : "Show"} history ({bets.length})
      </button>
      {showHistory && (
        <div className="history">
          <ul>
            {bets.map((b) => (
              <li key={b.id}>
                <span>
                  {b.side.toUpperCase()} {b.size} · {b.status}
                  {b.note ? ` · ${b.note}` : ""}
                </span>
                <span>{new Date(b.at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
