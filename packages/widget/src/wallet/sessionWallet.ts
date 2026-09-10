import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";

const STORAGE_KEY = "eca.session.wallet.v1";

export type SessionWallet = {
  privateKey: Hex;
  address: Address;
  createdAt: number;
};

type TgCloud = {
  getItem: (key: string, cb: (v: string | null) => void) => void;
  setItem: (key: string, value: string, cb?: (ok: boolean) => void) => void;
};

function getTgCloud(): TgCloud | null {
  const w = window as unknown as {
    Telegram?: { WebApp?: { CloudStorage?: TgCloud } };
  };
  return w.Telegram?.WebApp?.CloudStorage ?? null;
}

function readLocal(): SessionWallet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionWallet;
    if (!parsed?.privateKey?.startsWith("0x") || !parsed.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocal(w: SessionWallet) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
}

function createWallet(): SessionWallet {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    privateKey,
    address: account.address,
    createdAt: Date.now(),
  };
}

function cloudGet(key: string): Promise<string | null> {
  const cloud = getTgCloud();
  if (!cloud) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      cloud.getItem(key, (v) => resolve(v ?? null));
    } catch {
      resolve(null);
    }
  });
}

function cloudSet(key: string, value: string): Promise<void> {
  const cloud = getTgCloud();
  if (!cloud) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      cloud.setItem(key, value, () => resolve());
    } catch {
      resolve();
    }
  });
}

/** Load or create the user's session wallet (Telegram CloudStorage → localStorage). */
export async function ensureSessionWallet(): Promise<SessionWallet> {
  const fromCloud = await cloudGet(STORAGE_KEY);
  if (fromCloud) {
    try {
      const parsed = JSON.parse(fromCloud) as SessionWallet;
      if (parsed?.privateKey?.startsWith("0x")) {
        writeLocal(parsed);
        return parsed;
      }
    } catch {
      /* fall through */
    }
  }

  const local = readLocal();
  if (local) {
    await cloudSet(STORAGE_KEY, JSON.stringify(local));
    return local;
  }

  const fresh = createWallet();
  writeLocal(fresh);
  await cloudSet(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
