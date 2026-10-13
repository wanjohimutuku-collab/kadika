import { qrMatrix, qrPath, QR_QUIET_ZONE } from '@/lib/qr';
import { QrSvg } from './qr-svg';

export interface QrBlockProps {
  /** Signed token (§6.1). Mock tokens are rendered unchanged. */
  payload: string;
  /** Accessible description, e.g. "Msimbo wa QR wa kuingia; namba KH-4826". */
  alt: string;
  /** Rendered pixel size (≥ 220 on the guest card, §17.6). */
  size?: number;
  className?: string;
}

/**
 * Black-on-white QR with a 4-module quiet zone and error correction M (§6.4). It ignores event
 * themes by design: the QR block is never tinted, dimmed or decorated.
 */
export function QrBlock({ payload, alt, size = 240, className }: QrBlockProps) {
  const m = qrMatrix(payload);
  return (
    <QrSvg
      path={qrPath(m)}
      dim={m.size + QR_QUIET_ZONE * 2}
      alt={alt}
      size={size}
      className={className}
    />
  );
}

export function qrSvgData(payload: string): { path: string; dim: number } {
  const m = qrMatrix(payload);
  return { path: qrPath(m), dim: m.size + QR_QUIET_ZONE * 2 };
}
