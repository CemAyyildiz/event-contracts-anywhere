import {
  encodeHostTag,
  formatHostTag,
  normalizeHostId,
} from "../packages/trade-core/src/attribution.ts";
import { fetchHostTape } from "../packages/trade-core/src/hostTape.ts";
import { verifyTaggedTx } from "../packages/trade-core/src/verifyTag.ts";

function send(res: { status: (n: number) => { json: (b: unknown) => void }; setHeader: (k: string, v: string) => void }, status: number, body: unknown) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

export default async function handler(
  req: { method?: string; query?: Record<string, string | string[] | undefined> },
  res: { status: (n: number) => { json: (b: unknown) => void }; setHeader: (k: string, v: string) => void },
) {
  if (req.method !== "GET") {
    send(res, 405, { ok: false, error: "GET only" });
    return;
  }
  const q = req.query ?? {};
  const raw = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  try {
    const host = raw(q.host);
    const tx = raw(q.tx);
    if (tx) {
      const verified = await verifyTaggedTx(tx, host);
      send(res, 200, { ok: true, verified });
      return;
    }
    if (!host) {
      send(res, 400, { ok: false, error: "host or tx required" });
      return;
    }
    const hostId = normalizeHostId(host);
    const tape = await fetchHostTape(hostId);
    send(res, 200, {
      ok: true,
      tape,
      formula: 'keccak256("anywhere.v1:" + host)[:8]',
      tag: formatHostTag(encodeHostTag(hostId)),
    });
  } catch (e) {
    send(res, 500, {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
