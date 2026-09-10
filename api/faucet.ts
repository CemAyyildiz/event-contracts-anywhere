// @ts-nocheck
import { dripTo } from "./drip";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST only" });
    return;
  }
  const body =
    typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : (req.body ?? {});
  try {
    const result = await dripTo(
      body.address,
      process.env.FAUCET_PRIVATE_KEY || process.env.VITE_PRIVATE_KEY,
    );
    res.status(result.status).json(result);
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
