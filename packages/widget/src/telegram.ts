declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  close?: () => void;
  themeParams?: Record<string, string | undefined>;
  colorScheme?: "light" | "dark";
  initDataUnsafe?: {
    start_param?: string;
    user?: { id: number; username?: string; first_name?: string };
  };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
  MainButton?: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    setText: (t: string) => void;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    enable: () => void;
    disable: () => void;
  };
  CloudStorage?: {
    getItem: (key: string, cb: (v: string | null) => void) => void;
    setItem: (key: string, value: string, cb?: (ok: boolean) => void) => void;
  };
};

export type TelegramSession = {
  isTelegram: boolean;
  startHost: string | null;
  userLabel: string | null;
};

function applyTheme(wa: TelegramWebApp) {
  const bg = wa.themeParams?.bg_color || "#07090c";
  const header = wa.themeParams?.header_bg_color || bg;
  try {
    wa.setHeaderColor?.(header);
    wa.setBackgroundColor?.(bg);
  } catch {
    /* older clients */
  }
  document.documentElement.style.setProperty("--tg-bg", bg);
  if (wa.themeParams?.button_color) {
    document.documentElement.style.setProperty(
      "--tg-button",
      wa.themeParams.button_color,
    );
  }
  document.documentElement.classList.add("tg-surface");
}

/** Init Telegram WebApp if present; return hostId from startapp if any. */
export function initTelegram(): TelegramSession {
  const wa = window.Telegram?.WebApp;
  if (!wa) {
    return { isTelegram: false, startHost: null, userLabel: null };
  }
  try {
    wa.ready();
    wa.expand();
    wa.enableClosingConfirmation?.();
    applyTheme(wa);
  } catch {
    /* ignore */
  }
  const start = wa.initDataUnsafe?.start_param ?? null;
  const u = wa.initDataUnsafe?.user;
  const userLabel = u?.username
    ? `@${u.username}`
    : u?.first_name
      ? u.first_name
      : null;
  return { isTelegram: true, startHost: start, userLabel };
}

export function loadTelegramScript(): Promise<void> {
  if (window.Telegram?.WebApp) return Promise.resolve();
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-web-app.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

export function tgHaptic(kind: "success" | "error" | "light" | "warning" = "light") {
  const h = window.Telegram?.WebApp?.HapticFeedback;
  if (!h) return;
  try {
    if (kind === "success") h.notificationOccurred("success");
    else if (kind === "error") h.notificationOccurred("error");
    else if (kind === "warning") h.notificationOccurred("warning");
    else h.impactOccurred("light");
  } catch {
    /* ignore */
  }
}

let mainBtnHandler: (() => void) | null = null;

export function setTelegramMainButton(
  opts: { text: string; onClick: () => void } | null,
) {
  const btn = window.Telegram?.WebApp?.MainButton;
  if (!btn) return;
  if (mainBtnHandler) {
    try {
      btn.offClick(mainBtnHandler);
    } catch {
      /* ignore */
    }
    mainBtnHandler = null;
  }
  if (!opts) {
    try {
      btn.hide();
    } catch {
      /* ignore */
    }
    return;
  }
  mainBtnHandler = opts.onClick;
  btn.setText(opts.text);
  btn.onClick(mainBtnHandler);
  btn.show();
  btn.enable();
}
