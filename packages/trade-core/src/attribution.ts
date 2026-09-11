import { keccak256, toBytes } from "viem";

const PREFIX = "anywhere.v1:";

export function normalizeHostId(hostId: string): string {
  return hostId.trim().toLowerCase().replace(/\s+/g, "-") || "anonymous";
}

/**
 * uint64 stamp written into BinaryPool.placeBinaryOrder.userData.
 * Anyone can recompute: first 8 bytes of keccak256("anywhere.v1:" + host).
 */
export function encodeHostTag(hostId: string): bigint {
  const digest = keccak256(toBytes(`${PREFIX}${normalizeHostId(hostId)}`));
  return BigInt(digest) >> 192n;
}

export function formatHostTag(tag: bigint): string {
  return `0x${tag.toString(16).padStart(16, "0")}`;
}

export function parseHostTag(raw: string | number | bigint | null | undefined): bigint {
  if (raw == null) return 0n;
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return BigInt(Math.trunc(raw));
  const s = String(raw).trim();
  if (!s) return 0n;
  try {
    return s.startsWith("0x") || s.startsWith("0X") ? BigInt(s) : BigInt(s);
  } catch {
    return 0n;
  }
}

export function tagMatchesHost(userData: bigint, hostId: string): boolean {
  return userData === encodeHostTag(hostId);
}
