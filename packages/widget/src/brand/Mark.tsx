/** Window with the slip dropped inside. Gold frame, live pip. */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
    >
      <rect
        x="3.5"
        y="3.5"
        width="25"
        height="25"
        rx="7.25"
        stroke="#e8d5a3"
        strokeWidth="1.5"
      />
      <rect
        x="12.25"
        y="8.25"
        width="13.25"
        height="17.25"
        rx="3.4"
        fill="#e8d5a3"
        fillOpacity="0.1"
        stroke="#e8d5a3"
        strokeWidth="1.35"
      />
      <path
        d="M15.4 12.1h7.1M15.4 14.85h4.6"
        stroke="#e8d5a3"
        strokeOpacity="0.4"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <circle cx="23.35" cy="10.35" r="1.45" fill="#34d399" />
    </svg>
  );
}
