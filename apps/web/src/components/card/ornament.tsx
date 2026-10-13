/**
 * Original geometric border (< 2 KB): alternating triangles and dots in a steady rhythm, loosely
 * inspired by East African textile borders without copying any specific design, brand or kanga.
 * Colour comes from `--hp-pattern`, so themes can tint it.
 */
export function OrnamentBand({ className, id = 'hp-orn' }: { className?: string; id?: string }) {
  return (
    <svg className={className} width="100%" height="18" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width="28" height="18" patternUnits="userSpaceOnUse">
          <path
            d="M0 17 7 4l7 13M14 1l7 13 7-13"
            fill="none"
            stroke="var(--hp-pattern)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="7" cy="12" r="1.6" fill="var(--hp-pattern)" />
          <circle cx="21" cy="6" r="1.6" fill="var(--hp-pattern)" />
        </pattern>
      </defs>
      <rect width="100%" height="18" fill={`url(#${id})`} />
    </svg>
  );
}

/** Corner mark used on print cards and the cover. */
export function OrnamentDiamond({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="40"
      height="12"
      viewBox="0 0 40 12"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 6h14M26 6h14" stroke="var(--hp-pattern)" strokeWidth="1.4" />
      <path d="m20 1 5 5-5 5-5-5z" fill="none" stroke="var(--hp-pattern)" strokeWidth="1.4" />
      <circle cx="20" cy="6" r="1.5" fill="var(--hp-pattern)" />
    </svg>
  );
}
