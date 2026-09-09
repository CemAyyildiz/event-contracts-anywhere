import { useEffect, useRef, useState } from "react";
import {
  createExchange,
  getTradeableMarket,
  type TradeableMarket,
} from "@eca/trade-core";
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import type { Hex } from "viem";

export type LiveBook = {
  ask: number | null;
  bid: number | null;
  mid: number | null;
  upProb: number | null;
};

export function useTradeSession(asset: string, privateKey?: Hex) {
  const [exchange, setExchange] = useState<SomniaMarkets | null>(null);
  const [market, setMarket] = useState<TradeableMarket | null>(null);
  const [book, setBook] = useState<LiveBook>({
    ask: null,
    bid: null,
    mid: null,
    upProb: null,
  });
  const [ticks, setTicks] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"ws" | "poll">("ws");
  const exchangeRef = useRef<SomniaMarkets | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let watchAlive = false;

    async function refreshMarket(ex: SomniaMarkets) {
      const m = await getTradeableMarket(ex, asset);
      if (!cancelled) setMarket(m);
      return m;
    }

    async function refreshBook(ex: SomniaMarkets, m: TradeableMarket) {
      try {
        const ob = await ex.fetchOrderBook(m.upSymbol, 5);
        const ask = ob.asks?.[0]?.[0] ?? null;
        const bid = ob.bids?.[0]?.[0] ?? null;
        const mid =
          ask != null && bid != null
            ? (ask + bid) / 2
            : (ask ?? bid ?? null);
        if (!cancelled) {
          setBook({ ask, bid, mid, upProb: mid });
          if (mid != null) {
            setTicks((t) => [...t.slice(-39), mid]);
          }
        }
        return true;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
        return false;
      }
    }

    (async () => {
      try {
        const ex = await createExchange(
          privateKey ? { privateKey } : {},
        );
        if (cancelled) {
          await ex.close();
          return;
        }
        exchangeRef.current = ex;
        setExchange(ex);
        await ex.loadMarkets(true);
        const m = await refreshMarket(ex);
        if (!m) {
          setError("No tradeable market right now");
          setReady(true);
          return;
        }
        await refreshBook(ex, m);

        // Prefer watch; fall back to poll
        try {
          await ex.watchOrderBook(m.upSymbol);
          watchAlive = true;
          setMode("ws");
          pollTimer = setInterval(async () => {
            const cur = await refreshMarket(ex);
            if (cur) await refreshBook(ex, cur);
          }, 4000);
        } catch {
          setMode("poll");
          pollTimer = setInterval(async () => {
            const cur = await refreshMarket(ex);
            if (cur) await refreshBook(ex, cur);
          }, 2500);
        }
        setReady(true);
        void watchAlive;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      const ex = exchangeRef.current;
      exchangeRef.current = null;
      void ex?.close();
    };
  }, [asset, privateKey]);

  return { exchange, market, book, ticks, error, ready, mode, setError };
}
