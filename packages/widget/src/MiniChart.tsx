type Props = { ticks: number[]; strikeHint?: number | null };

export function MiniChart({ ticks, strikeHint }: Props) {
  const w = 360;
  const h = 88;
  if (ticks.length < 2) {
    return (
      <div className="chart">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <text x="16" y="48" fill="#8a949e" fontSize="12" fontFamily="IBM Plex Sans, sans-serif">
            Streaming odds…
          </text>
        </svg>
      </div>
    );
  }
  const min = Math.min(...ticks);
  const max = Math.max(...ticks);
  const span = Math.max(0.008, max - min);
  const coords = ticks.map((v, i) => {
    const x = (i / (ticks.length - 1)) * (w - 8) + 4;
    const y = h - 10 - ((v - min) / span) * (h - 20);
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `4,${h} ${line} ${w - 4},${h}`;

  let strikeY: number | null = null;
  if (strikeHint != null) {
    strikeY = h - 10 - ((strikeHint - min) / span) * (h - 20);
  }

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2fd67b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2fd67b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon fill="url(#areaFill)" points={area} />
        {strikeY != null && (
          <line
            x1={0}
            x2={w}
            y1={strikeY}
            y2={strikeY}
            stroke="#e6c35c"
            strokeDasharray="3 5"
            strokeWidth="1.25"
            opacity="0.75"
          />
        )}
        <polyline
          fill="none"
          stroke="#2fd67b"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={line}
        />
      </svg>
    </div>
  );
}
