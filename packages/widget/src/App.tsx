import { useEffect, useMemo, useState } from "react";
import { buyGuaranteed, redeem, TradeCoreError } from "@eca/trade-core";
import type { Hex } from "viem";
import { MiniChart } from "./MiniChart";
import { loadBets, pushBet, type BetRecord } from "./history";
import { useTradeSession } from "./useTradeSession";

const EXPLORER = "https://shannon-explorer.somnia.network/tx/";

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
  const s = Math.floor(sec % 60);
  return m > 0
    ? `${m}:${s.toString().padStart(2, "0")}`
    : `0:${s.toString().padStart(2, "0")}`;
}

type Phase = "idle" | "open" | "settled" | "busy";

export function App() {
  const { hostId, asset } = useMemo(() => params(), []);
  const pk = import.meta.env.VITE_PRIVATE_KEY as string | undefined;
  const privateKey = pk
    ? ((pk.startsWith("0x") ? pk : `0x${pk}`) as Hex)
    : undefined;

  const { exchange, market, book, ticks, error, ready, setError } =
    useTradeSession(asset, privateKey);

  const [size, setSize] = useState<1 | 5 | 25>(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("One tap. No wallet setup.");
  const [bets, setBets] = useState<BetRecord[]>(() => loadBets());
  const [showHistory, setShowHistory] = useState(false);
  const [openBet, setOpenBet] = useState<BetRecord | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [probKey, setProbKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setProbKey((k) => k + 1);
  }, [book.upProb]);

  useEffect(() => {
    const report = () => {
      const height = document.documentElement.scrollHeight;
      parent.postMessage({ type: "eca:resize", height }, "*");
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [phase, showHistory, statusText, bets.length, lastTx]);

  const ttlSec = market
    ? Math.max(0, Math.floor((market.expiryMs - now) / 1000))
    : null;

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
            const note = red.redeemed
              ? `Resolved — you won · redeemed ${red.amount}`
              : red.reason === "losing-or-empty"
                ? "Resolved — this side lost"
                : `Resolved · ${red.reason ?? "done"}`;
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
      setStatusText("Add VITE_PRIVATE_KEY to enable demo trades");
      return;
    }
    if (!exchange || !market) {
      setStatusText("Market not ready");
      return;
    }
    if ((ttlSec ?? 0) <= 60) {
      setStatusText("Window closing — wait for the next print");
      return;
    }
    setPhase("busy");
    setStatusText("Signing on Shannon…");
    setLastTx(null);
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
      setLastTx(fill.txHashes[0] ?? null);
      setPhase("open");
      setStatusText(
        `${side === "up" ? "Up" : "Down"} live · ${size} tUSDC · ${fill.path}`,
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

  const canTrade = ready && phase !== "busy" && phase !== "open";

  return (
    <div className="shell">
      {!privateKey && (
        <div className="warn-banner">
          Demo signer missing — set VITE_PRIVATE_KEY for live taps.
        </div>
      )}

      <div className="top">
        <div className="brand">
          Anywhere <span>· {hostId}</span>
        </div>
        <div className="live">
          <i aria-hidden />
          Live
        </div>
      </div>

      <div className="hero-prob">
        <div className="asset">{asset} next window</div>
        <div className="row">
          <strong key={probKey}>{formatPct(book.upProb)}</strong>
          <div className={`ttl-block${(ttlSec ?? 99) < 90 ? " urgent" : ""}`}>
            <span className="lbl">Expires</span>
            <span className="val">{ttlLabel(ttlSec)}</span>
          </div>
        </div>
      </div>

      <div className="book">
        <span>
          Bid <b>{book.bid?.toFixed(3) ?? "—"}</b>
        </span>
        <span>
          Ask <b>{book.ask?.toFixed(3) ?? "—"}</b>
        </span>
      </div>

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
            {s} tUSDC
          </button>
        ))}
      </div>

      <div className={`actions${phase === "busy" ? " busy" : ""}`}>
        <button
          type="button"
          className="up"
          disabled={!canTrade}
          onClick={() => void onTrade("up")}
        >
          Up
          <small>Price goes higher</small>
        </button>
        <button
          type="button"
          className="down"
          disabled={!canTrade}
          onClick={() => void onTrade("down")}
        >
          Down
          <small>Price goes lower</small>
        </button>
      </div>

      <div className={`status ${phase}`}>
        <div className="label">Status</div>
        <div className="body">{statusText}</div>
        {lastTx && (
          <div className="tx">
            <a href={`${EXPLORER}${lastTx}`} target="_blank" rel="noreferrer">
              View on Shannon explorer →
            </a>
          </div>
        )}
        {(error || (!ready && !error)) && (
          <div className="err">{error ?? "Connecting to Shannon…"}</div>
        )}
      </div>

      {phase === "settled" && (
        <button
          type="button"
          className="drawer-toggle"
          onClick={() => {
            setPhase("idle");
            setOpenBet(null);
            setLastTx(null);
            setStatusText("One tap. No wallet setup.");
          }}
        >
          Trade again
        </button>
      )}

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
