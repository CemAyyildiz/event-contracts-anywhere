import { useEffect, useMemo, useState } from "react";
import { encodeHostTag, formatHostTag, normalizeHostId } from "@eca/trade-core";
import { BrandMark } from "../brand/Mark";

const EXPLORER_TX = "https://shannon-explorer.somnia.network/tx/";

type TapeOrder = {
  orderId: string;
  owner: string;
  userDataHex: string;
  side: string | null;
  filled: number;
  size: number;
  status: string | null;
  txHash: string;
  at: number;
  asset: string | null;
};

type Tape = {
  hostId: string;
  tag: string;
  fills: number;
  volume: number;
  orders: TapeOrder[];
};

function short(addr: string) {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function qty(n: number) {
  if (!Number.isFinite(n) || n === 0) return "0";
  return n >= 10 ? n.toFixed(2) : n.toFixed(4);
}

export function Desk() {
  const initial = useMemo(() => {
    const q = new URLSearchParams(window.location.search);
    return q.get("host") || "wire-desk";
  }, []);
  const [host, setHost] = useState(initial);
  const [tx, setTx] = useState("");
  const [tape, setTape] = useState<Tape | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verify, setVerify] = useState<{
    tags: string[];
    matchesHost: boolean | null;
    owners: string[];
  } | null>(null);

  const hostId = normalizeHostId(host);
  const expected = formatHostTag(encodeHostTag(hostId));

  async function load() {
    setLoading(true);
    setError(null);
    setVerify(null);
    try {
      const res = await fetch(`/api/desk?host=${encodeURIComponent(hostId)}`);
      const data = (await res.json()) as { ok?: boolean; tape?: Tape; error?: string };
      if (!res.ok || !data.ok || !data.tape) {
        throw new Error(data.error || "desk failed");
      }
      setTape(data.tape);
      const next = new URL(window.location.href);
      next.searchParams.set("host", hostId);
      window.history.replaceState(null, "", next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function checkTx() {
    const hash = tx.trim();
    if (!hash) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/desk?tx=${encodeURIComponent(hash)}&host=${encodeURIComponent(hostId)}`,
      );
      const data = (await res.json()) as {
        ok?: boolean;
        verified?: { tags: string[]; matchesHost: boolean | null; owners: string[] };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.verified) {
        throw new Error(data.error || "verify failed");
      }
      setVerify(data.verified);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.documentElement.style.background = "#070709";
    void load();
    // first paint only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="grain" aria-hidden />
      <header className="nav">
        <a className="brand" href="/">
          <BrandMark size={22} />
          Anywhere
        </a>
        <nav className="nav-links">
          <a href="/demo/">In a page</a>
          <a href={`/slip/?host=${encodeURIComponent(hostId)}&market=BTC`}>Open slip</a>
          <span className="live">
            <i className="dot" />
            Desk
          </span>
        </nav>
      </header>

      <section className="section" style={{ paddingTop: "3.2rem" }}>
        <p className="eyebrow">Host desk</p>
        <h2>The tag is on the order.</h2>
        <p className="lede">
          <code>?host=</code> is only the input. The fill writes{" "}
          <code>userData</code> on Shannon. This page reads it back from the
          Somnia Markets indexer.
        </p>

        <div className="fields" style={{ maxWidth: "36rem" }}>
          <div>
            <label htmlFor="desk-host">Host id</label>
            <input
              id="desk-host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <label>On-chain tag</label>
            <input value={expected} readOnly />
          </div>
        </div>
        <div className="row">
          <button type="button" className="copy-btn" disabled={loading} onClick={() => void load()}>
            {loading ? "Reading…" : "Read Shannon"}
          </button>
          <a className="ghost-btn" href="/demo/" style={{ display: "inline-flex", alignItems: "center" }}>
            Make a fill
          </a>
        </div>
        <p className="note">
          Formula: <code>keccak256("anywhere.v1:" + host)[:8]</code>. Anyone can
          recompute it. Payout claim is still later. The attribution is not.
        </p>
      </section>

      <div className="stats">
        <div>
          <b>{tape ? String(tape.fills) : "—"}</b>
          <span>Tagged fills</span>
        </div>
        <div>
          <b>{tape ? qty(tape.volume) : "—"}</b>
          <span>Filled size</span>
        </div>
        <div>
          <b>{tape ? String(tape.orders.length) : "—"}</b>
          <span>Tagged orders</span>
        </div>
      </div>

      <section className="section">
        <h2>Tape</h2>
        {error && <p className="note" style={{ color: "#fb7185" }}>{error}</p>}
        {!error && tape && tape.orders.length === 0 && (
          <p className="note">
            No tagged orders for <code>{hostId}</code> yet. Open the host page,
            tap Up or Down, then read again. Indexer lag is usually under a
            minute.
          </p>
        )}
        {tape && tape.orders.length > 0 && (
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="desk-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Fill</th>
                  <th>Side</th>
                  <th>Owner</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {tape.orders.map((o) => (
                  <tr key={`${o.orderId}-${o.txHash}`}>
                    <td>{o.at ? new Date(o.at).toLocaleString() : "—"}</td>
                    <td>
                      {qty(o.filled)}
                      <small> / {qty(o.size)}</small>
                    </td>
                    <td>{o.side ?? "—"}</td>
                    <td>{short(o.owner)}</td>
                    <td>
                      {o.txHash ? (
                        <a href={`${EXPLORER_TX}${o.txHash}`} target="_blank" rel="noreferrer">
                          {short(o.txHash)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: "2.2rem" }}>
          <label htmlFor="desk-tx">Verify a tx</label>
          <input
            id="desk-tx"
            value={tx}
            onChange={(e) => setTx(e.target.value)}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="row" style={{ marginTop: "0.7rem" }}>
            <button type="button" className="ghost-btn" disabled={loading} onClick={() => void checkTx()}>
              Decode userData
            </button>
          </div>
          {verify && (
            <p className="note">
              Tags on this receipt:{" "}
              <code>{verify.tags.length ? verify.tags.join(" ") : "none"}</code>
              {verify.matchesHost == null
                ? ""
                : verify.matchesHost
                  ? ` · matches ${hostId}`
                  : ` · does not match ${hostId}`}
            </p>
          )}
        </div>
      </section>

      <footer className="foot">
        <span>Keys on device · not financial advice</span>
        <span>DreamDEX Event Contracts · Somnia Shannon</span>
      </footer>
    </>
  );
}
