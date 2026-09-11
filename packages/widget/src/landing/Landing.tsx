import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

const fade = {
  hidden: { opacity: 0, y: 28, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};

function TiltFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), {
    stiffness: 80,
    damping: 18,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), {
    stiffness: 80,
    damping: 18,
  });

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <motion.div
      ref={ref}
      className="stage"
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}

function SlipEmbed({ host, market, peek }: { host: string; market: string; peek?: boolean }) {
  const src = `/slip/?host=${encodeURIComponent(host)}&market=${encodeURIComponent(market)}${peek ? "&peek=trade" : ""}`;
  return (
    <iframe
      title="Anywhere slip"
      src={src}
      allow="clipboard-write"
    />
  );
}

export function Landing() {
  const [host, setHost] = useState("wire-desk");
  const [market, setMarket] = useState("BTC");
  const [copied, setCopied] = useState<"snippet" | "url" | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const h = (host.trim().replace(/\s+/g, "-") || "anonymous");
  const m = (market.trim().toUpperCase() || "BTC");
  const snippet = `<script src="${origin}/w.js" data-host="${h}" data-market="${m}"></script>`;
  const drop = `${origin}/slip/?host=${encodeURIComponent(h)}&market=${encodeURIComponent(m)}`;

  async function copy(kind: "snippet" | "url", text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  }

  const words = useMemo(
    () => [
      ["The", "book", "is", "empty"],
      ["because", "nobody"],
      ["goes", "there"],
    ],
    [],
  );

  useEffect(() => {
    document.documentElement.style.background = "#070709";
  }, []);

  return (
    <>
      <div className="grain" aria-hidden />
      <div className="orb" style={{ top: "-12rem", left: "-8rem" }} aria-hidden />
      <div
        className="orb"
        style={{ top: "20%", right: "-14rem", background: "radial-gradient(circle, rgba(52,211,153,.12), transparent 62%)" }}
        aria-hidden
      />

      <motion.header
        className="nav"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        <div className="brand">Anywhere</div>
        <nav className="nav-links">
          <a className="hide" href="#how">How</a>
          <a className="hide" href="#take">Snippet</a>
          <a href="/demo/">In a page</a>
          <span className="live"><i className="dot" />Shannon</span>
          <a className="pill" href="/slip/?host=jury&market=BTC">Open slip</a>
        </nav>
      </motion.header>

      <section className="hero">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.div className="eyebrow" variants={fade}>
            Event contracts · on someone else’s page
          </motion.div>
          <h1 className="headline">
            {words.map((line, i) => (
              <span key={i} style={{ display: "block" }}>
                {line.map((w) => (
                  <motion.span
                    key={w}
                    variants={fade}
                    style={{ display: "inline-block", marginRight: "0.28em" }}
                  >
                    {w === "goes" ? <em>{w}</em> : w}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>
          <motion.p className="lede" variants={fade}>
            One script. The reader never opens DreamDEX. Up or Down still
            hits the live Shannon book — from the page they were already on.
          </motion.p>
          <motion.div className="ctas" variants={fade}>
            <a className="cta primary" href="/demo/">Watch it in a page</a>
            <a className="cta ghost" href="#take">Steal the snippet</a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.96, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.15, delay: 0.35, ease }}
        >
          <TiltFrame>
            <div className="chrome">
              <div className="chrome-bar">
                <span className="dots" aria-hidden><i /><i /><i /></span>
                <span className="url">wire-desk.example / btc-window</span>
              </div>
              <SlipEmbed host="wire-desk" market="BTC" peek />
            </div>
          </TiltFrame>
        </motion.div>
      </section>

      <motion.div
        className="stats"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease }}
      >
        <div><b>50312</b><span>Shannon · live windows</span></div>
        <div><b>IOC / mint</b><span>Thin-book guaranteed fill</span></div>
        <div><b>?host=</b><span>Every fill named to a desk</span></div>
      </motion.div>

      <section className="section" id="how">
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
        >
          They skip the funnel.
        </motion.h2>
        <div className="split">
          <motion.article
            className="card dim"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease }}
          >
            <h3>The old way</h3>
            <ol>
              <li>Leave the chat</li>
              <li>Open DreamDEX</li>
              <li>Connect a wallet</li>
              <li>Find the window</li>
              <li>Maybe trade</li>
            </ol>
          </motion.article>
          <motion.article
            className="card good"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
          >
            <h3>Anywhere</h3>
            <ol>
              <li>Slip already on the page</li>
              <li>Wallet prints on device</li>
              <li>Get faucet</li>
              <li>Up or Down</li>
              <li>Explorer proof</li>
            </ol>
          </motion.article>
        </div>
        <motion.p
          className="note"
          style={{ marginTop: "1.5rem" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Host picks an id, pastes a script or a URL. Reader stays put. Telegram Mini App is
          plumbing for a full-screen chat link — not the front door.
        </motion.p>
      </section>

      <section className="section" id="take">
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
        >
          Take the slip.
        </motion.h2>
        <div className="take">
          <div>
            <div className="fields">
              <div>
                <label htmlFor="host">Host id</label>
                <input id="host" value={host} onChange={(e) => setHost(e.target.value)} autoComplete="off" />
              </div>
              <div>
                <label htmlFor="market">Market</label>
                <input id="market" value={market} onChange={(e) => setMarket(e.target.value)} autoComplete="off" />
              </div>
            </div>
            <label>Web — paste on any page</label>
            <pre>{snippet}</pre>
            <div className="row">
              <button type="button" className="copy-btn" onClick={() => void copy("snippet", snippet)}>
                {copied === "snippet" ? "Copied" : "Copy snippet"}
              </button>
            </div>
            <label>Chat — paste this URL</label>
            <pre>{drop}</pre>
            <div className="row">
              <button type="button" className="copy-btn" onClick={() => void copy("url", drop)}>
                {copied === "url" ? "Copied" : "Copy URL"}
              </button>
              <button type="button" className="ghost-btn" onClick={() => window.open(drop, "_blank")}>
                Open slip
              </button>
            </div>
          </div>
          <motion.div
            className="chrome"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="chrome-bar">
              <span className="dots" aria-hidden><i /><i /><i /></span>
              <span className="url">{h} · {m}</span>
            </div>
            <SlipEmbed host={h} market={m} peek />
          </motion.div>
        </div>
      </section>

      <footer className="foot">
        <span>Keys on device · not financial advice</span>
        <span>DreamDEX Event Contracts · Somnia Shannon</span>
      </footer>
    </>
  );
}
