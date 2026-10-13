import { cn } from '@/lib/cn';

/** Renders a precomputed QR path (black on white, quiet zone included in `dim`). No encoder needed. */
export function QrSvg({
  path,
  dim,
  alt,
  size = 240,
  className,
}: {
  path: string;
  dim: number;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      role="img"
      aria-label={alt}
      width={size}
      height={size}
      viewBox={`0 0 ${dim} ${dim}`}
      shapeRendering="crispEdges"
      className={cn('block bg-white', className)}
      style={{ background: '#FFFFFF' }}
    >
      <rect width={dim} height={dim} fill="#FFFFFF" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
