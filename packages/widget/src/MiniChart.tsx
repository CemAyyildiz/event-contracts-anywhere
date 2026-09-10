type Props = { ticks: number[]; strikeHint?: number | null };

export function MiniChart({ ticks, strikeHint }: Props) {
  const w = 360;
  const h = 76;
  const ink = "currentColor";
  if (ticks.length < 2) {
    return (
      <div className="chart">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <text
            x="10"
            y="42"
            fill="currentColor"
            opacity="0.45"
            fontSize="11"
            fontFamily="IBM Plex Mono, ui-monospace, monospace"
          >
            waiting on the book…
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
    const y = h - 8 - ((v - min) / span) * (h - 16);
    return [x, y] as const;
  });
  // stepped tote line
  const parts: string[] = [];
  coords.forEach(([x, y], i) => {
    if (i === 0) parts.push(`M ${x} ${y}`);
    else parts.push(`H ${x} V ${y}`);
  });

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
            stroke={ink}
            strokeDasharray="2 4"
            strokeWidth="1"
            opacity="0.35"
          />
        )}
        <path
          d={parts.join(" ")}
          fill="none"
          stroke={ink}
          strokeWidth="1.75"
          strokeLinejoin="miter"
        />
      </svg>
    </div>
  );
}
