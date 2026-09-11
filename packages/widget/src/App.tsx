import { useEffect, useMemo, useRef, useState } from "react";
import { buyGuaranteed, redeem, TradeCoreError } from "@eca/trade-core";
import type { Address, Hex } from "viem";
import { parseEther } from "viem";
import { MiniChart } from "./MiniChart";
import { loadBets, pushBet, type BetRecord } from "./history";
import { useTradeSession } from "./useTradeSession";
import {
  ensureSessionWallet,
  shortAddr,
  type SessionWallet,
} from "./wallet/sessionWallet";
import { fetchBalances } from "./wallet/balances";
import { sendAllTusdc } from "./wallet/send";
import {
  initTelegram,
  loadTelegramScript,
  setTelegramMainButton,
  tgHaptic,
} from "./telegram";
import { BrandMark } from "./brand/Mark";

const EXPLORER_TX = "https://shannon-explorer.somnia.network/tx/";
const EXPLORER_ADDR = "https://shannon-explorer.somnia.network/address/";
/** SDK privateKey path: 10M gas × 60 gwei. Unused refunded; mempool still requires the envelope. */
const SDK_GAS_ENVELOPE = parseEther("0.6");

function params() {
  const q = new URLSearchParams(window.location.search);
  return {
    hostId: q.get("host") || "anonymous",
    asset: (q.get("market") || "BTC").toUpperCase(),
    surface: q.get("surface") || "web",
    peek: q.get("peek"),
    demo: q.get("demo") === "1",
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
  const showcase = base.peek === "trade" || base.demo;

  const [wallet, setWallet] = useState<SessionWallet | null>(null);
  const [screen, setScreen] = useState<Screen>("boot");
  const [isTelegram, setIsTelegram] = useState(false);
  const [bal, setBal] = useState<{
    sttLabel: string;
    tusdcLabel: string;
    stt: bigint;
    tusdc: bigint;
  } | null>(null);
  const [copied, setCopied] = useState<"addr" | "key" | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isNewWallet, setIsNewWallet] = useState(false);
  const [fauceting, setFauceting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const autoFundTried = useRef(false);
  const stayOnFund = useRef(false);

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
      try {
        await loadTelegramScript();
        if (cancelled) return;
        const tg = initTelegram();
        setIsTelegram(tg.isTelegram || base.surface === "tma");
        if (tg.startHost) setHostId(tg.startHost);

        let before: string | null = null;
        try {
          before = localStorage.getItem("eca.session.wallet.v1");
        } catch {
          before = null;
        }
        const w = await ensureSessionWallet();
        if (cancelled) return;
        setIsNewWallet(!before);
        setWallet(w);
        setScreen(showcase ? "trade" : "fund");
      } catch {
        if (cancelled) return;
        setStatusText("Could not print a wallet on this device.");
      }
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

  // Returning funded users skip faucet — but not after they open Fund to send.
  useEffect(() => {
    if (stayOnFund.current) return;
    if (!wallet || !bal || screen !== "fund") return;
    if (bal.stt >= SDK_GAS_ENVELOPE && bal.tusdc > 0n && !isNewWallet) {
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
  }, [screen, phase, showHistory, statusText, bets.length, lastTx, bal, showKey, sendTo, sending]);

  const ttlSec = market
    ? Math.max(0, Math.floor((market.expiryMs - now) / 1000))
    : null;

  const fundedEnough =
    bal != null && bal.stt >= SDK_GAS_ENVELOPE && bal.tusdc > 0n;

  function goTrade() {
    stayOnFund.current = false;
    setScreen("trade");
    setStatusText("Pick Up or Down — PnL settles to your address.");
    tgHaptic("light");
  }

  function goFund() {
    stayOnFund.current = true;
    setScreen("fund");
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
      setTelegramMainButton({ text: "Get faucet", onClick: () => void getFaucet() });
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
            if (red.txHash) setLastTx(red.txHash);
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

  async function getFaucet() {
    if (!wallet || fauceting) return false;
    setFauceting(true);
    setError(null);
    setStatusText("Sending 1 STT + 1 tUSDC…");
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet.address }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        skipped?: boolean;
        error?: string;
        sttHash?: string;
        tusdcHash?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Faucet failed");
      }
      setLastTx(data.tusdcHash ?? data.sttHash ?? null);
      tgHaptic("success");
      const next = await refreshBal(wallet.address);
      const ok = Boolean(next && next.stt > 0n && next.tusdc > 0n);
      if (ok) {
        setScreen("trade");
        setStatusText("Pick Up or Down — PnL settles to your address.");
      }
      return ok;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatusText("Faucet failed");
      tgHaptic("error");
      return false;
    } finally {
      setFauceting(false);
    }
  }

  useEffect(() => {
    if (!showcase || !wallet || !bal || fauceting || autoFundTried.current) return;
    if (bal.stt >= SDK_GAS_ENVELOPE && bal.tusdc > 0n) return;
    autoFundTried.current = true;
    void getFaucet();
  }, [showcase, wallet, bal, fauceting]);

  async function onTrade(side: "up" | "down") {
    setError(null);
    if (!wallet || !exchange || !market) {
      setStatusText("Wallet or market not ready");
      return;
    }
    if (!fundedEnough) {
      if (!showcase) {
        setScreen("fund");
        setStatusText("Deposit STT + tUSDC first");
        return;
      }
      setStatusText("Funding a dust for this tap…");
      const ok = await getFaucet();
      if (!ok) return;
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
        hostId,
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
        userData: fill.userData,
        status: "open",
      };
      setBets(pushBet(bet));
      setOpenBet(bet);
      setLastTx(fill.txHashes[0] ?? null);
      setPhase("open");
      setStatusText(
        `${side === "up" ? "Up" : "Down"} live · ${size} tUSDC · ${fill.path} · ${fill.userData}`,
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

  async function onSend() {
    if (!wallet || sending) return;
    setSending(true);
    setError(null);
    setStatusText("Sending tUSDC…");
    try {
      const { hash } = await sendAllTusdc({
        privateKey: wallet.privateKey,
        from: wallet.address,
        to: sendTo.trim(),
      });
      setLastTx(hash);
      setStatusText("Sent — PnL left this slip.");
      tgHaptic("success");
      await refreshBal(wallet.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatusText("Send failed");
      tgHaptic("error");
    } finally {
      setSending(false);
    }
  }

  const canTrade = ready && phase !== "busy" && phase !== "open" && !fauceting;

  const stepStt = bal != null && bal.stt >= SDK_GAS_ENVELOPE;
  const stepTusdc = bal != null && bal.tusdc > 0n;

  if (screen === "boot" || !wallet) {
    return (
      <div className="shell">
        <header className="mast">
          <div className="mark">
            <BrandMark size={18} />
            Anywhere
          </div>
          <div className="tag">Shannon</div>
        </header>
        <div className="tape">
          <div className="label">Slip</div>
          <div className="body">Printing your address on this device…</div>
        </div>
      </div>
    );
  }

  if (screen === "fund") {
    return (
      <div className="shell">
        <header className="mast">
          <div className="mark">
            <BrandMark size={18} />
            Anywhere
            <span>via {hostId}</span>
          </div>
          <div className="tag">Shannon</div>
        </header>

        <ol className="steps">
          <li className="done">1 Wallet</li>
          <li className="bar" aria-hidden />
          <li className={stepStt && stepTusdc ? "done" : "on"}>2 Fund</li>
          <li className="bar" aria-hidden />
          <li className={fundedEnough ? "done" : ""}>3 Trade</li>
        </ol>

        <div className="kicker">Desk {hostId} · keys stay on this device</div>
        <p className="addr">{shortAddr(wallet.address)}</p>
        <p className="copy">
          Get faucet sends 1 STT (SDK gas envelope) and 1 tUSDC for a tap.
          PnL lands here. Send it to your own address when you want it.
        </p>

        <div className="bals">
          <div className={stepStt ? "ok" : ""}>
            <span>STT {stepStt ? "in" : "empty"}</span>
            <b>{bal?.sttLabel ?? "—"}</b>
          </div>
          <div className={stepTusdc ? "ok" : ""}>
            <span>tUSDC {stepTusdc ? "in" : "empty"}</span>
            <b>{bal?.tusdcLabel ?? "—"}</b>
          </div>
        </div>

        <div className="stack">
          <button
            type="button"
            className="act act-ink"
            disabled={fauceting}
            onClick={() => void getFaucet()}
          >
            {fauceting ? "Sending…" : "Get faucet"}
          </button>
          <button
            type="button"
            className="act act-line"
            disabled={!fundedEnough}
            onClick={goTrade}
          >
            {fundedEnough ? "Open the card" : "Waiting on faucet"}
          </button>
        </div>

        <p className="hint">{statusText}</p>

        <div className="send">
          <div className="label">Send</div>
          <p>
            Paste your own wallet. This slip signs — no connect. Sends all tUSDC.
            Keep a little STT here for gas.
          </p>
          <input
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value)}
            placeholder="0x…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            aria-label="Destination address"
          />
          <button
            type="button"
            className="act act-line"
            disabled={sending || fauceting || !stepTusdc || !stepStt}
            onClick={() => void onSend()}
          >
            {sending ? "Sending…" : `Send ${bal?.tusdcLabel ?? "—"} tUSDC`}
          </button>
        </div>

        <button type="button" className="act-text" onClick={() => void copyAddress()}>
          {copied === "addr" ? "Copied" : "Copy address"}
        </button>
        <button type="button" className="act-text" onClick={() => void refreshBal(wallet.address)}>
          Refresh
        </button>
        <a
          className="act-text"
          href={`${EXPLORER_ADDR}${wallet.address}`}
          target="_blank"
          rel="noreferrer"
        >
          Explorer
        </a>
        <button type="button" className="act-text" onClick={() => setShowKey((v) => !v)}>
          {showKey ? "Hide key" : "Backup key"}
        </button>
        {showKey && (
          <div className="key-box">
            <p>This key is the wallet. Anyone who has it owns the funds.</p>
            <code>{wallet.privateKey}</code>
            <button type="button" className="act act-line" onClick={() => void copyKey()}>
              {copied === "key" ? "Copied" : "Copy key"}
            </button>
          </div>
        )}

        {error && <div className="err-box">{error}</div>}
        {lastTx && (
          <div className="tx">
            <a href={`${EXPLORER_TX}${lastTx}`} target="_blank" rel="noreferrer">
              Last tx
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="mast">
        <div className="mark">
          <BrandMark size={18} />
          Anywhere
          <span>{hostId}</span>
        </div>
        <button type="button" className="wallet" onClick={goFund}>
          {shortAddr(wallet.address)} · {bal?.tusdcLabel ?? "—"}
        </button>
      </header>

      <div className="kicker">{asset} event contract · desk {hostId}</div>
      <div className="odds-row">
        <div className={book.upProb == null ? "odds empty" : "odds"} key={probKey}>
          {formatPct(book.upProb)}
          {book.upProb != null && <small>Up implied</small>}
        </div>
        <div className={`clock${(ttlSec ?? 99) < 90 ? " urgent" : ""}`}>
          <span className="lbl">Window</span>
          <span className="val">{ttlLabel(ttlSec)}</span>
        </div>
      </div>
      {book.upProb != null && (
        <div className="split" aria-hidden="true">
          <i style={{ width: `${Math.max(4, Math.min(96, book.upProb * 100))}%` }} />
        </div>
      )}

      <div className="book">
        <span>
          Bid <b>{book.bid?.toFixed(3) ?? "—"}</b>
        </span>
        <span>
          Ask <b>{book.ask?.toFixed(3) ?? "—"}</b>
        </span>
      </div>

      <MiniChart ticks={ticks} strikeHint={book.mid} />

      <div className="stakes">
        {([1, 5, 25] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={size === s ? "on" : ""}
            onClick={() => setSize(s)}
            disabled={
              phase === "busy" ||
              (bal != null &&
                bal.tusdc < BigInt(s) * 10n ** BigInt(bal.decimals))
            }
          >
            {s}
          </button>
        ))}
      </div>

      <div className={`sides${phase === "busy" ? " busy" : ""}`}>
        <button
          type="button"
          className="up"
          disabled={!canTrade}
          onClick={() => void onTrade("up")}
        >
          Up
          <small>Higher</small>
        </button>
        <button
          type="button"
          className="down"
          disabled={!canTrade}
          onClick={() => void onTrade("down")}
        >
          Down
          <small>Lower</small>
        </button>
      </div>

      <div className={`tape ${phase}`}>
        <div className="label">Tape</div>
        <div className="body">{statusText}</div>
        {lastTx && (
          <div className="tx">
            <a href={`${EXPLORER_TX}${lastTx}`} target="_blank" rel="noreferrer">
              Shannon explorer
            </a>
            {" · "}
            <a href={`/desk/?host=${encodeURIComponent(hostId)}`} target="_blank" rel="noreferrer">
              Host desk
            </a>
          </div>
        )}
        {(error || (!ready && !error)) && (
          <div className={error ? "err" : "wait"}>
            {error ?? "Connecting to Shannon…"}
          </div>
        )}
      </div>

      {phase === "settled" && (
        <>
          <button
            type="button"
            className="act-text"
            onClick={() => {
              setPhase("idle");
              setOpenBet(null);
              setLastTx(null);
              setStatusText("Pick Up or Down — PnL settles to your address.");
            }}
          >
            Next window
          </button>
          <button type="button" className="act-text" onClick={goFund}>
            Send tUSDC
          </button>
        </>
      )}

      <button
        type="button"
        className="act-text"
        onClick={() => setShowHistory((v) => !v)}
      >
        {showHistory ? "Hide" : "Card"} history ({bets.length})
      </button>
      {showHistory && (
        <div className="history">
          <ul>
            {bets.map((b) => (
              <li key={b.id}>
                <span>
                  {b.side.toUpperCase()} {b.size} · {b.status}
                  {b.userData ? ` · ${b.userData}` : ""}
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
