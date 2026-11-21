import { Wifi } from 'lucide-react';

export interface PhoneCardMockupProps {
  src: string | null;
  alt: string;
}

/**
 * Realistic phone mockup that fits the entire 640×940 server-rendered card preview
 * inside the screen viewport without cropping (`object-contain`).
 */
export function PhoneCardMockup({ src, alt }: PhoneCardMockupProps) {
  return (
    <div
      aria-label={alt}
      role="img"
      className="relative mx-auto shrink-0"
      style={{ width: 280, height: 536 }}
    >
      <svg
        viewBox="0 0 300 574"
        width={280}
        height={536}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 drop-shadow-[0_28px_48px_rgb(10_10_7/0.38)]"
      >
        <defs>
          <linearGradient id="pm-titanium" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4A514E" />
            <stop offset="25%" stopColor="#232826" />
            <stop offset="55%" stopColor="#3B413E" />
            <stop offset="100%" stopColor="#1B1F1E" />
          </linearGradient>
          <linearGradient id="pm-bezel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14161A" />
            <stop offset="100%" stopColor="#08090B" />
          </linearGradient>
        </defs>
        {/* Side buttons */}
        <rect x="0.5" y="102" width="3.5" height="22" rx="1.75" fill="#2F3532" />
        <rect x="0.5" y="142" width="3.5" height="42" rx="1.75" fill="#2F3532" />
        <rect x="0.5" y="194" width="3.5" height="42" rx="1.75" fill="#2F3532" />
        <rect x="296" y="160" width="3.5" height="64" rx="1.75" fill="#2F3532" />
        {/* Outer chassis & inner bezel */}
        <rect x="3" y="2" width="294" height="570" rx="46" fill="url(#pm-titanium)" />
        <rect x="6" y="5" width="288" height="564" rx="43" fill="url(#pm-bezel)" />
        <rect
          x="7"
          y="6"
          width="286"
          height="562"
          rx="42"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
      </svg>

      {/* Screen viewport */}
      <div
        className="absolute flex flex-col overflow-hidden bg-[#14161A]"
        style={{
          top: 12,
          bottom: 12,
          left: 12,
          right: 12,
          borderRadius: 34,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* Status bar + Dynamic Island */}
        <div
          aria-hidden="true"
          className="relative z-10 flex h-9 shrink-0 items-center justify-between px-5 pt-1 text-[10px] font-semibold tracking-tight text-white/95"
        >
          <span>9:41</span>
          <div className="flex h-[18px] w-[72px] items-center justify-end rounded-full bg-[#050707] px-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
            <span
              className="size-2 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 38% 35%, #55A6CE 0%, #132A3E 48%, #040608 100%)',
              }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="size-3 text-white" strokeWidth={2.2} />
            <span className="inline-flex h-[9px] w-[16px] items-center rounded-[2.5px] border border-white/80 p-[1px]">
              <span className="h-full w-[78%] rounded-[1px] bg-white" />
            </span>
          </div>
        </div>

        {/* Fitted card preview — full 640×940 image uncropped */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-1">
          {src ? (
            <img
              src={src}
              alt={alt}
              width={640}
              height={940}
              className="max-h-full max-w-full rounded-[16px] object-contain shadow-[0_12px_28px_-10px_rgb(0_0_0/0.5)]"
            />
          ) : (
            <div className="skeleton aspect-[640/940] h-full rounded-[16px]" />
          )}
        </div>

        {/* Home indicator */}
        <div
          aria-hidden="true"
          className="relative flex h-5 w-full shrink-0 items-center justify-center"
        >
          <span className="h-[3.5px] w-24 rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}
