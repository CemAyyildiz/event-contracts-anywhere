import { useEffect, useMemo, useState } from "react";
import { buyGuaranteed, redeem, TradeCoreError } from "@eca/trade-core";
import type { Address, Hex } from "viem";
import { MiniChart } from "./MiniChart";
import { loadBets, pushBet, type BetRecord } from "./history";
import { useTradeSession } from "./useTradeSession";
import {
  ensureSessionWallet,
  shortAddr,
  type SessionWallet,
} from "./wallet/sessionWallet";
import { fetchBalances } from "./wallet/balances";
import {
  initTelegram,
  loadTelegramScript,
  setTelegramMainButton,
  tgHaptic,
} from "./telegram";

const EXPLORER_TX = "https://shannon-explorer.somnia.network/tx/";
const EXPLORER_ADDR = "https://shannon-explorer.somnia.network/address/";
const FAUCET = "https://testnet.somnia.network/";
const TUSDC_HINT = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E";

function params() {
  const q = new URLSearchParams(window.location.search);
  return {
    hostId: q.get("host") || "anonymous",
    asset: (q.get("market") || "BTC").toUpperCase(),
    surface: q.get("surface") || "web",
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
type Screen = "boot" | "fund" | "trade";

export function App() {
  const base = useMemo(() => params(), []);
  const [hostId, setHostId] = useState(base.hostId);
  const asset = base.asset;

  const [wallet, setWallet] = useState<SessionWallet | null>(null);
  const [screen, setScreen] = useState<Screen>("boot");
  const [isTelegram, setIsTelegram] = useState(false);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [bal, setBal] = useState<{
    sttLabel: string;
    tusdcLabel: string;
    stt: bigint;
    tusdc: bigint;
  } | null>(null);
  const [copied, setCopied] = useState<"addr" | "key" | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isNewWallet, setIsNewWallet] = useState(false);

  const privateKey = wallet?.privateKey as Hex | undefined;
  const { exchange, market, book, ticks, error, ready, setError } =
    useTradeSession(asset, privateKey);

  const [size, setSize] = useState<1 | 5 | 25>(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState(
    "Pick Up or Down — fills hit DreamDEX. PnL settles to your address.",
  );
  const [bets, setBets] = useState<BetRecord[]>(() => loadBets());
  const [showHistory, setShowHistory] = useState(false);
  const [openBet, setOpenBet] = useState<BetRecord | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [probKey, setProbKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadTelegramScript();
      if (cancelled) return;
      const tg = initTelegram();
      setIsTelegram(tg.isTelegram || base.surface === "tma");
      setUserLabel(tg.userLabel);
      if (tg.startHost) setHostId(tg.startHost);

      const before = localStorage.getItem("eca.session.wallet.v1");
      const w = await ensureSessionWallet();
      if (cancelled) return;
      setIsNewWallet(!before);
      setWallet(w);
      setScreen("fund");
    })();
    return () => {
      cancelled = true;
    };
  }, [base.surface]);

  async function refreshBal(addr: Address) {
    const b = await fetchBalances(addr);
    setBal(b);
    return b;
  }

  useEffect(() => {
    if (!wallet) return;
    void refreshBal(wallet.address);
    const t = setInterval(() => void refreshBal(wallet.address), 8000);
    return () => clearInterval(t);
  }, [wallet]);

  // Returning funded users skip straight to trade
  useEffect(() => {
    if (!wallet || !bal || screen !== "fund") return;
    if (bal.stt > 0n && bal.tusdc > 0n && !isNewWallet) {
      setScreen("trade");
    }
  }, [wallet, bal, screen, isNewWallet]);

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
  }, [screen, phase, showHistory, statusText, bets.length, lastTx, bal, showKey]);

  const ttlSec = market
    ? Math.max(0, Math.floor((market.expiryMs - now) / 1000))
    : null;

  const fundedEnough = bal != null && bal.stt > 0n && bal.tusdc > 0n;

  function goTrade() {
    setScreen("trade");
    setStatusText("Pick Up or Down — PnL settles to your address.");
    tgHaptic("light");
  }

  // Telegram MainButton on fund screen when ready
  useEffect(() => {
    if (screen !== "fund" || !isTelegram) {
      setTelegramMainButton(null);
      return;
    }
    if (fundedEnough) {
      setTelegramMainButton({ text: "Trade Up / Down", onClick: goTrade });
    } else {
      setTelegramMainButton(null);
    }
    return () => setTelegramMainButton(null);
  }, [screen, isTelegram, fundedEnough]);

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
            tgHaptic(red.redeemed ? "success" : "light");
            setBets((prev) => {
              const next = prev.map((b) =>
                b.id === openBet.id
                  ? { ...b, status: "settled" as const, note }
                  : b,
              );
              localStorage.setItem("eca.bets.v1", JSON.stringify(next));
              return next;
            });
            if (wallet) void refreshBal(wallet.address);
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
  }, [phase, exchange, openBet, market, wallet]);

  async function claimFaucetTusdc() {
    if (!exchange || !wallet) return;
    setStatusText("Requesting tUSDC faucet…");
    try {
      const f = await exchange.trader.faucet();
      setLastTx(f.hash);
      setStatusText("tUSDC faucet sent");
      tgHaptic("success");
      await refreshBal(wallet.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatusText("Faucet failed — need STT gas first");
      tgHaptic("error");
    }
  }

  async function onTrade(side: "up" | "down") {
    setError(null);
    if (!wallet || !exchange || !market) {
      setStatusText("Wallet or market not ready");
      return;
    }
    if (!fundedEnough) {
      setScreen("fund");
      setStatusText("Deposit STT + tUSDC first");
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
      tgHaptic("success");
      void refreshBal(wallet.address);
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
      tgHaptic("error");
    }
  }

  async function copyAddress() {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied("addr");
    tgHaptic("light");
    setTimeout(() => setCopied(null), 1500);
  }

  async function copyKey() {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.privateKey);
    setCopied("key");
    tgHaptic("warning");
    setTimeout(() => setCopied(null), 2000);
  }

  const canTrade =
    ready && phase !== "busy" && phase !== "open" && fundedEnough;

  const stepStt = bal != null && bal.stt > 0n;
  const stepTusdc = bal != null && bal.tusdc > 0n;

  if (screen === "boot" || !wallet) {
    return (
      <div className="shell">
        <div className="brand">Anywhere</div>
        <div className="status">
          <div className="label">Session</div>
          <div className="body">Creating your wallet on this device…</div>
        </div>
      </div>
    );
  }

  if (screen === "fund") {
    return (
      <div className="shell">
        <div className="top">
          <div className="brand">
            Anywhere{" "}
            <span>· {isTelegram ? userLabel || "Telegram" : "Web"}</span>
          </div>
          <div className="live">
            <i aria-hidden />
            Shannon
          </div>
        </div>

        <ol className="steps">
          <li className="done">
            <b>1</b> Wallet created
          </li>
          <li className={stepStt && stepTusdc ? "done" : "on"}>
            <b>2</b> Deposit
          </li>
          <li className={fundedEnough ? "done" : ""}>
            <b>3</b> Trade
          </li>
        </ol>

        <div className="hero-prob">
          <div className="asset">Your address — keys stay on device</div>
          <div className="row">
            <strong style={{ fontSize: "1.35rem" }}>
              {shortAddr(wallet.address)}
            </strong>
          </div>
        </div>

        <p className="fund-copy">
          DreamDEX Event Contracts without opening DreamDEX. Deposit{" "}
          <b>STT</b> (gas) and <b>tUSDC</b> (stake). Wins and losses settle here.
        </p>

        <div className="bal-row">
          <div className={stepStt ? "ok" : ""}>
            <span>STT {stepStt ? "✓" : ""}</span>
            <b>{bal?.sttLabel ?? "…"}</b>
          </div>
          <div className={stepTusdc ? "ok" : ""}>
            <span>tUSDC {stepTusdc ? "✓" : ""}</span>
            <b>{bal?.tusdcLabel ?? "…"}</b>
          </div>
        </div>

        <button type="button" className="primary-btn" onClick={() => void copyAddress()}>
          {copied === "addr" ? "Address copied" : "Copy deposit address"}
        </button>

        <a
          className="link-btn"
          href={`${EXPLORER_ADDR}${wallet.address}`}
          target="_blank"
          rel="noreferrer"
        >
          View on explorer →
        </a>
        <a className="link-btn" href={FAUCET} target="_blank" rel="noreferrer">
          1 · Get STT faucet →
        </a>

        <button
          type="button"
          className="secondary-btn"
          disabled={!exchange || !bal || bal.stt === 0n}
          onClick={() => void claimFaucetTusdc()}
        >
          2 · Claim tUSDC faucet (needs STT)
        </button>

        <p className="tiny-hint">
          Testnet tUSDC: <code>{TUSDC_HINT.slice(0, 10)}…</code> · host{" "}
          <b>{hostId}</b>
        </p>

        <button
          type="button"
          className="primary-btn"
          disabled={!fundedEnough}
          onClick={goTrade}
        >
          {fundedEnough ? "3 · Trade Up / Down →" : "Waiting for STT + tUSDC…"}
        </button>

        <button
          type="button"
          className="drawer-toggle"
          onClick={() => void refreshBal(wallet.address)}
        >
          Refresh balances
        </button>

        <button
          type="button"
          className="drawer-toggle"
          onClick={() => setShowKey((v) => !v)}
        >
          {showKey ? "Hide" : "Backup"} private key
        </button>
        {showKey && (
          <div className="key-box">
            <p>
              This key controls your funds. Store it offline. Anyone with it owns
              the wallet.
            </p>
            <code>{wallet.privateKey}</code>
            <button type="button" className="secondary-btn" onClick={() => void copyKey()}>
              {copied === "key" ? "Key copied" : "Copy private key"}
            </button>
          </div>
        )}

        {error && <div className="status err-box">{error}</div>}
        {lastTx && (
          <div className="tx">
            <a href={`${EXPLORER_TX}${lastTx}`} target="_blank" rel="noreferrer">
              Last tx →
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="top">
        <div className="brand">
          Anywhere <span>· {hostId}</span>
        </div>
        <button type="button" className="pill" onClick={() => setScreen("fund")}>
          {shortAddr(wallet.address)} · {bal?.tusdcLabel ?? "—"} tUSDC
        </button>
      </div>

      <div className="hero-prob">
        <div className="asset">{asset} Event Contract</div>
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
            <a href={`${EXPLORER_TX}${lastTx}`} target="_blank" rel="noreferrer">
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
            setStatusText("Pick Up or Down — PnL settles to your address.");
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
