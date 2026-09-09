const KEY = "eca.bets.v1";

export type BetRecord = {
  id: string;
  at: number;
  hostId: string;
  asset: string;
  side: "up" | "down";
  size: number;
  marketSymbol: string;
  path: string;
  txHashes: string[];
  status: "open" | "settled";
  note?: string;
};

export function loadBets(): BetRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BetRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBets(bets: BetRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(bets.slice(0, 40)));
}

export function pushBet(bet: BetRecord) {
  const next = [bet, ...loadBets()];
  saveBets(next);
  return next;
}
