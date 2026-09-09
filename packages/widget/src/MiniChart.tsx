type Props = { ticks: number[]; strikeHint?: number | null };

export function MiniChart({ ticks, strikeHint }: Props) {
  const w = 360;
  const h = 72;
  if (ticks.length < 2) {
    return (
      <div className="chart">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <text x="12" y="40" fill="#8b969f" fontSize="12">
            Waiting for ticks…
          </text>
        </svg>
      </div>
    );
  }
  const min = Math.min(...ticks);
  const max = Math.max(...ticks);
  const span = Math.max(0.01, max - min);
  const pts = ticks
    .map((v, i) => {
      const x = (i / (ticks.length - 1)) * (w - 8) + 4;
      const y = h - 8 - ((v - min) / span) * (h - 16);
      return `${x},${y}`;
    })
    .join(" ");

  let strikeY: number | null = null;
  if (strikeHint != null) {
    strikeY = h - 8 - ((strikeHint - min) / span) * (h - 16);
  }

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {strikeY != null && (
          <line
            x1={0}
            x2={w}
            y1={strikeY}
            y2={strikeY}
            stroke="#c9a227"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.7"
          />
        )}
        <polyline
          fill="none"
          stroke="#3dba7a"
          strokeWidth="2"
          points={pts}
        />
      </svg>
    </div>
  );
}
