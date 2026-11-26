'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  Heart,
  Layers,
  Link2,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Container } from '@/components/site/blocks';
import { cn } from '@/lib/cn';

/**
 * Quickwork.co-inspired sections & animations adapted for Kadi Sasa:
 * 1. QuickworkStandout (`standout-section`)
 * 2. QuickworkFourPlanes (`four-planes-section`: Create · Deliver · Collect · Verify with CSS Orbit Hub)
 * 3. QuickworkSyncFlow (`ai-agent-orchestration-section`: 6-stage connected pipeline)
 * 4. QuickworkDarkReliability (`platform-features-section`: #0a2640 navy band + SVG stroke-draw curve)
 * 5. QuickworkPersonas (`persona-section`: 4 organizer/role cards)
 */

export function QuickworkStandout({ locale }: { locale: 'sw' | 'en' }) {
  const isSw = locale === 'sw';
  const items = isSw
    ? [
        {
          icon: Zap,
          eyebrow: '01 · Kadi ya Papo Hapo',
          title: 'Unda na tuma kwa dakika chache',
          body: 'Chagua mandhari, weka tarehe na ukumbi, kisha tuma kadi za kipekee kwa kila mgeni bila usanifu mgumu.',
        },
        {
          icon: Layers,
          eyebrow: '02 · Njia Tatu Pamoja',
          title: 'WhatsApp, SMS na PDF ya kuchapisha',
          body: 'Wageni wenye smartphone wanapata kadi ya kidijitali, na wasio nayo wanapata SMS au kadi ya karatasi yenye QR.',
        },
        {
          icon: ShieldCheck,
          eyebrow: '03 · Lango Bila Mtandao',
          title: 'Skani ya QR ya sekunde moja ukumbini',
          body: 'Kamati na walinzi wanakagua wageni kwa Android hata kama ukumbi hauna intaneti, wakizuia kadi kurudiwa.',
        },
      ]
    : [
        {
          icon: Zap,
          eyebrow: '01 · Instant Cards',
          title: 'Design and dispatch in minutes',
          body: 'Pick a theme, add event details, and send personalized guest invitations with unique QR codes without design friction.',
        },
        {
          icon: Layers,
          eyebrow: '02 · Omnichannel Reach',
          title: 'WhatsApp, SMS & printable A6/A4 PDF',
          body: 'Smartphone guests receive interactive digital cards while feature-phone guests get clean SMS codes and printables.',
        },
        {
          icon: ShieldCheck,
          eyebrow: '03 · Offline Gate Control',
          title: '1-second QR check-in with zero signal',
          body: 'Ushers scan and admit guests using the offline-first Android gate app, blocking duplicate or invalid entries.',
        },
      ];

  return (
    <section id="standout-section" className="bg-[#f6f9fc] py-16 md:py-24">
      <Container className="flex flex-col gap-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e8ee] bg-white px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5469d4]">
            {isSw ? 'Kwa nini Kadi Sasa' : 'Why Kadi Sasa'}
          </span>
          <h2 className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-[#0a2640] md:text-[42px]">
            {isSw ? 'Mahali Kadi Sasa Inapojitofautisha' : 'Where Kadi Sasa Stands Out'}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {items.map(({ icon: Icon, eyebrow, title, body }) => (
            <article key={title} className="qw-card flex flex-col gap-4 p-6 md:p-7">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5469d4]">
                  {eyebrow}
                </span>
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#f6f9fc] text-[#5469d4] ring-1 ring-[#e3e8ee]">
                  <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
                </span>
              </div>
              <h3 className="text-xl font-bold leading-snug text-[#0a2640]">{title}</h3>
              <p className="text-sm leading-relaxed text-[#494d59]">{body}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

type PlaneId = 'create' | 'deliver' | 'collect' | 'verify';

export function QuickworkFourPlanes({
  locale,
  market = 'tz',
}: {
  locale: 'sw' | 'en';
  market?: 'tz' | 'ke' | 'ug';
}) {
  const isSw = locale === 'sw';
  const [activePlane, setActivePlane] = useState<PlaneId>('verify');
  const pledgeWord = market === 'ke' ? 'harambee' : market === 'ug' ? 'pledge' : 'michango';
  const pledgeTitle = market === 'ke' ? 'Harambee' : market === 'ug' ? 'Pledges' : 'Michango';
  const sampleCouple =
    market === 'ke' ? 'Wanjiru & Otieno' : market === 'ug' ? 'Namukasa & Kato' : 'Asha & Juma';
  const sampleGuest =
    market === 'ke'
      ? 'Mr & Mrs Kamau · 2 Seats'
      : market === 'ug'
        ? 'Ssenga Grace · 2 Seats'
        : isSw
          ? 'Mgeni: Mwanaidi Salim · Viti 2'
          : 'Guest: Mwanaidi Salim · 2 Seats';

  const planes: {
    id: PlaneId;
    label: string;
    planeTitle: string;
    heading: string;
    body: string;
  }[] = isSw
    ? [
        {
          id: 'create',
          label: '1. Unda',
          planeTitle: 'Awamu ya Ubunifu',
          heading: 'Buni, Jaribu na Chapisha Mara Moja',
          body: 'Tengeneza kadi za Kiswahili au Kiingereza zenye majina ya wageni, idadi ya viti, na msimbo wa QR wa kipekee.',
        },
        {
          id: 'deliver',
          label: '2. Tuma',
          planeTitle: 'Awamu ya Usambazaji',
          heading: 'Njia Sita Maalumu Kwenye Mfumo Mmoja',
          body: 'Fikia kila mgeni kupitia WhatsApp, SMS, PDF ya A6/A4, kiungo kifupi, au kalenda ya simu.',
        },
        {
          id: 'collect',
          label: '3. Kusanya',
          planeTitle: 'Awamu ya Majibu & Michango',
          heading: 'Ufuatiliaji wa RSVP na Ahadi kwa Wakati Halisi',
          body: 'Angalia nani amethibitisha, idadi kamili ya wageni, na rekodi ya ahadi za michango moja kwa moja.',
        },
        {
          id: 'verify',
          label: '4. Hakiki',
          planeTitle: 'Awamu ya Lango la QR',
          heading: 'Udhibiti Kamili Mlangoni Hata Bila Intaneti',
          body: 'Kituo kikuu cha QR kinachoratibu skani za walinzi wote, kuhesabu walioingia, na kuzuia kadi zilizotumika.',
        },
      ]
    : [
        {
          id: 'create',
          label: '1. Create',
          planeTitle: 'The Create Plane',
          heading: 'Design, Preview and Go-Live',
          body: 'Build bilingual Swahili & English cards with guest-specific seat counts, dress codes, and tamper-proof QR tokens.',
        },
        {
          id: 'deliver',
          label: '2. Deliver',
          planeTitle: 'The Deliver Plane',
          heading: 'Six Specialized Channels On One Unified Platform',
          body: 'Reach every guest regardless of device via WhatsApp, SMS fallback, printable A6/A4 PDFs, short links, and ICS calendar invites.',
        },
        {
          id: 'collect',
          label: '3. Collect',
          planeTitle: 'The Collect Plane',
          heading: 'Real-Time RSVP & Pledge Visibility',
          body: `Monitor confirmations, party sizes, and direct-to-host ${pledgeWord} pledges with live status updates.`,
        },
        {
          id: 'verify',
          label: '4. Verify',
          planeTitle: 'The Verify Plane',
          heading: 'Complete Gate Oversight with Offline Autonomy',
          body: 'A synchronized QR verification hub uniting ushers, duplicate guards, headcount counters, and offline-first sync.',
        },
      ];

  const current = planes.find((p) => p.id === activePlane) ?? planes[3]!;

  const orbitNodes = isSw
    ? [
        'Skani QR',
        'Bila Mtandao',
        'Zuia Marudio',
        'Idadi Halisi',
        'Walinzi Wengi',
        'Sawa Papo Hapo',
      ]
    : ['QR Scan', 'Offline Ready', 'Duplicate Guard', 'Live Count', 'Multi-Usher', 'Instant Sync'];

  const deliverEngines = [
    { icon: MessageSquare, label: 'WhatsApp Cards' },
    { icon: Smartphone, label: 'SMS Fallback' },
    { icon: FileText, label: 'A6 / A4 Print PDF' },
    { icon: Link2, label: 'Short Links (/k)' },
    { icon: Calendar, label: 'Calendar ICS' },
    { icon: Globe, label: 'Swahili & English' },
  ];

  return (
    <section id="four-planes-section" className="bg-white py-16 md:py-24">
      <Container className="flex flex-col gap-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5469d4]">
            {isSw ? 'Mfumo Mmoja · Awamu Nne' : 'One Platform · Four Planes'}
          </span>
          <h2 className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-[#0a2640] md:text-[42px]">
            {isSw ? 'Unda · Tuma · Kusanya · Hakiki' : 'Create · Deliver · Collect · Verify'}
          </h2>
        </div>

        {/* Plane switcher tabs */}
        <div
          className="flex flex-wrap justify-center gap-2.5"
          role="tablist"
          aria-label="Platform planes"
        >
          {planes.map((plane) => {
            const active = plane.id === activePlane;
            return (
              <button
                key={plane.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActivePlane(plane.id)}
                className={cn(
                  'min-h-11 rounded-full px-5 py-2 text-sm font-semibold transition',
                  active
                    ? 'bg-[#0a2640] text-white shadow-[0_10px_24px_-10px_rgb(10_38_64/0.5)]'
                    : 'border border-[#e3e8ee] bg-[#f6f9fc] text-[#0a2640] hover:border-[#5469d4]/50 hover:text-[#5469d4]',
                )}
              >
                {plane.label}
              </button>
            );
          })}
        </div>

        {/* Active plane stage */}
        <div className="qw-card grid items-center gap-10 overflow-hidden bg-gradient-to-br from-white via-white to-[#f6f9fc] p-6 md:grid-cols-[1fr_1.05fr] md:p-10">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#5469d4]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#3b4cc0]">
              <span className="qw-ripple-dot" aria-hidden="true" />
              {current.planeTitle}
            </span>
            <h3 className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[#0a2640] md:text-[32px]">
              {current.heading}
            </h3>
            <p className="text-base leading-relaxed text-[#494d59]">{current.body}</p>
          </div>

          {/* Right visual per plane */}
          <div className="flex min-h-[290px] items-center justify-center">
            {activePlane === 'verify' ? (
              /* Quickwork.co Signature Orbit Hub Animation */
              <div
                className="qw-orbit relative flex size-[270px] items-center justify-center sm:size-[300px]"
                aria-label={
                  isSw ? 'Mzunguko wa ukaguzi wa lango la QR' : 'QR gate verification orbit'
                }
              >
                {/* Outer orbit ring */}
                <div className="absolute inset-2 rounded-full border border-dashed border-[#5469d4]/30" />
                <div className="absolute inset-10 rounded-full border border-[#e3e8ee]" />

                {/* Rotating nodes container */}
                <div className="qw-orbit-nodes absolute inset-0">
                  {orbitNodes.map((label, idx) => {
                    const angle = (idx * 360) / orbitNodes.length;
                    const rad = (angle * Math.PI) / 180;
                    const radiusPct = 44;
                    const x = 50 + radiusPct * Math.cos(rad);
                    const y = 50 + radiusPct * Math.sin(rad);
                    return (
                      <div
                        key={label}
                        className="qw-orbit-node absolute rounded-full border border-[#e3e8ee] bg-white px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-[#0a2640] shadow-md"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>

                {/* Central pulsing hub with counter-rotating arcs */}
                <div className="relative flex size-24 items-center justify-center">
                  <div className="qw-hub-ring-1 absolute inset-0 rounded-full border-2 border-transparent border-t-[#5469d4] border-r-[#3b82f6]" />
                  <div className="qw-hub-ring-2 absolute inset-1.5 rounded-full border-2 border-transparent border-b-[#a960ee] border-l-[#f86a71]" />
                  <div className="qw-hub-core relative flex size-16 flex-col items-center justify-center rounded-full bg-white text-[#0a2640] ring-1 ring-[#e3e8ee]">
                    <QrCode className="size-6 text-[#5469d4]" aria-hidden="true" />
                    <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider">
                      QR Hub
                    </span>
                  </div>
                </div>
              </div>
            ) : activePlane === 'deliver' ? (
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
                {deliverEngines.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-[#e3e8ee] bg-white p-4 text-center shadow-xs transition hover:-translate-y-0.5 hover:border-[#5469d4]/50"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#f6f9fc] text-[#5469d4]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-bold text-[#0a2640]">{label}</span>
                  </div>
                ))}
              </div>
            ) : activePlane === 'collect' ? (
              <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-[#e3e8ee] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#e3e8ee] pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#494d59]">
                    {isSw ? 'Hali ya Moja kwa Moja' : 'Live Event Telemetry'}
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#0f7a47]">
                    <span className="qw-ripple-dot" aria-hidden="true" />
                    {isSw ? 'Inapokea' : 'Streaming'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#f6f9fc] px-4 py-3">
                  <span className="text-sm font-medium text-[#494d59]">
                    {isSw ? 'Waliothibitisha (RSVP)' : 'Confirmed Guests'}
                  </span>
                  <span className="text-lg font-bold text-[#0a2640]">148 / 180</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#f6f9fc] px-4 py-3">
                  <span className="text-sm font-medium text-[#494d59]">
                    {isSw ? 'Michango Iliyokusanywa' : `${pledgeTitle} Fulfilled`}
                  </span>
                  <span className="text-lg font-bold text-[#5469d4]">82%</span>
                </div>
              </div>
            ) : (
              <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-[#e3e8ee] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5469d4]">
                  <Sparkles className="size-4" aria-hidden="true" />
                  <span>{isSw ? 'Kadi Iliyobinafsishwa' : 'Personalized Card'}</span>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-[#0a2640] to-[#1e3a8a] p-5 text-white">
                  <p className="text-[11px] uppercase tracking-widest text-white/70">
                    {isSw ? 'Mwaliko Rasmi' : 'Official Invitation'}
                  </p>
                  <p className="mt-1 text-xl font-bold">{sampleCouple}</p>
                  <p className="mt-2 text-xs text-white/80">{sampleGuest}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function QuickworkSyncFlow({
  locale,
  market = 'tz',
}: {
  locale: 'sw' | 'en';
  market?: 'tz' | 'ke' | 'ug';
}) {
  const isSw = locale === 'sw';
  const pledgeLabel = market === 'ke' ? 'Harambee' : market === 'ug' ? 'Pledges' : 'Michango';
  const nodes = isSw
    ? [
        { label: 'Kadi', sub: 'Mandhari & QR' },
        { label: 'Usambazaji', sub: 'WhatsApp & SMS' },
        { label: 'RSVP', sub: 'Majibu & Viti' },
        { label: 'Michango', sub: 'Ahadi & Malipo' },
        { label: 'Tiketi', sub: 'Msimbo wa Kipekee' },
        { label: 'Lango', sub: 'Skani Bila Mtandao' },
      ]
    : [
        { label: 'Card', sub: 'Theme & QR' },
        { label: 'Dispatch', sub: 'WhatsApp & SMS' },
        { label: 'RSVP', sub: 'Confirm & Seats' },
        { label: pledgeLabel, sub: 'Pledge Ledger' },
        { label: 'Pass', sub: 'Short Code & PDF' },
        { label: 'Gate', sub: 'Offline Scan' },
      ];

  return (
    <section id="ai-agent-orchestration-section" className="bg-[#f6f9fc] py-16 md:py-20">
      <Container className="flex flex-col gap-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e8ee] bg-white px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5469d4]">
            {isSw ? 'Mtiririko Mmoja' : 'End-to-End Orchestration'}
          </span>
          <h2 className="text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-[#0a2640] md:text-[40px]">
            {isSw
              ? 'Kuanzia Kadi Hadi Lango la Sherehe, Kila Kitu Kimeunganishwa'
              : 'From Invitation to Reception Gate, Working in Sync'}
          </h2>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {nodes.map((n, i) => (
            <li
              key={n.label}
              className="qw-card relative flex flex-col items-center gap-1.5 p-5 text-center"
            >
              <span className="text-[11px] font-bold text-[#5469d4]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-base font-bold text-[#0a2640]">{n.label}</span>
              <span className="text-xs text-[#494d59]">{n.sub}</span>
              {i < nodes.length - 1 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="mt-1 hidden size-4 text-[#5469d4]/60 lg:absolute lg:-right-3 lg:top-1/2 lg:block lg:-translate-y-1/2"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

export function QuickworkDarkReliability({
  locale,
  children,
}: {
  locale: 'sw' | 'en';
  children?: React.ReactNode;
}) {
  const isSw = locale === 'sw';
  const stats = isSw
    ? [
        { value: '3', label: 'Njia za kutuma', sub: 'WhatsApp, SMS & PDF' },
        { value: '100%', label: 'Skani bila intaneti', sub: 'Lango linafanya kazi ukumbini' },
        { value: '0%', label: 'Makato ya michango', sub: 'Fedha zinaenda moja kwa moja' },
        { value: '<1s', label: 'Kasi ya uhakiki', sub: 'Kuzuia kadi kurudiwa' },
      ]
    : [
        { value: '3', label: 'Delivery channels', sub: 'WhatsApp, SMS & Print PDF' },
        { value: '100%', label: 'Offline gate scan', sub: 'Works with zero venue signal' },
        { value: '0%', label: 'Pledge commission', sub: 'Funds go direct to the host' },
        { value: '<1s', label: 'QR check-in speed', sub: 'Instant duplicate protection' },
      ];

  return (
    <section
      id="platform-features-section"
      className="qw-navy-band relative overflow-hidden py-16 text-white md:py-24"
    >
      <Container className="flex flex-col gap-14">
        <div className="grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#90e0ff]">
              {isSw ? 'Usalama & Uthabiti' : 'Security & Reliability'}
            </span>
            <h2 className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[44px]">
              {isSw
                ? 'Uthabiti wa hali ya juu kwa sherehe za ukubwa wowote.'
                : 'Built for smooth guest entry and reliable celebration ops.'}
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-white/75">
              {isSw
                ? 'Kila kadi ina msimbo wa QR uliosainiwa kidijitali ili kulinda orodha yako ya wageni na kuharakisha uingiaji.'
                : 'Every pass carries a signed QR token so committees prevent gate crashers while keeping reception lines moving.'}
            </p>
          </div>

          {/* Quickwork.co-inspired animated SVG stroke-draw curve */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between text-xs font-semibold text-white/80">
              <span>{isSw ? 'Kasi ya kuingia langoni' : 'Gate Check-In Throughput'}</span>
              <span className="text-[#7dff7a]">Offline Ready</span>
            </div>
            <svg viewBox="0 0 320 110" className="h-28 w-full" aria-hidden="true">
              <defs>
                <linearGradient id="qwGreenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#90e0ff" />
                  <stop offset="100%" stopColor="#7dff7a" />
                </linearGradient>
              </defs>
              <path
                d="M 10 92 Q 80 86, 130 62 T 230 34 T 308 16"
                fill="none"
                stroke="url(#qwGreenGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="qw-growth-line"
              />
              <circle
                cx="308"
                cy="16"
                r="5.5"
                fill="#7dff7a"
                style={{ filter: 'drop-shadow(0 0 8px rgba(125,255,122,0.75))' }}
              />
            </svg>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-6 border-y border-white/10 py-10 md:grid-cols-4 md:gap-8">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5 text-center md:text-left">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-4xl font-bold tracking-tight md:text-5xl">
                <span className="bg-gradient-to-r from-[#90e0ff] to-[#7dff7a] bg-clip-text text-transparent">
                  {s.value}
                </span>
              </dd>
              <dd className="text-base font-semibold text-white">{s.label}</dd>
              <dd className="text-sm text-white/70">{s.sub}</dd>
            </div>
          ))}
        </dl>

        {children}
      </Container>
    </section>
  );
}

export function QuickworkPersonas({ locale }: { locale: 'sw' | 'en' }) {
  const isSw = locale === 'sw';
  const roles = isSw
    ? [
        {
          icon: Users,
          title: 'Kamati za Harusi',
          desc: 'Fuatilia ahadi za michango, orodha ya wageni, na idadi ya viti kutoka dashibodi moja.',
        },
        {
          icon: Heart,
          title: 'Maharusi & Familia',
          desc: 'Tengeneza kadi za kisasa kwa dakika chache na utume moja kwa moja kwa WhatsApp.',
        },
        {
          icon: Briefcase,
          title: 'Biashara & Mikutano',
          desc: 'Dhibiti mialiko ya hafla za kampuni, semina, na uzinduzi kwa tiketi za QR.',
        },
        {
          icon: CheckCircle2,
          title: 'Walinzi wa Lango',
          desc: 'Kagua wageni haraka kwa kamera ya simu hata bila mtandao wa intaneti.',
        },
      ]
    : [
        {
          icon: Users,
          title: 'Wedding Committees',
          desc: 'Track pledges, confirmed seats, and table lists together in one shared dashboard.',
        },
        {
          icon: Heart,
          title: 'Couples & Families',
          desc: 'Design personalized cards in minutes and share via WhatsApp, SMS, or print.',
        },
        {
          icon: Briefcase,
          title: 'Corporate & Conferences',
          desc: 'Manage executive summits, launches, and galas with instant QR check-in passes.',
        },
        {
          icon: CheckCircle2,
          title: 'Gate & Ushers',
          desc: 'Verify every guest in under a second with offline-first duplicate protection.',
        },
      ];

  return (
    <section id="persona-section" className="bg-white py-16 md:py-24">
      <Container className="flex flex-col gap-10">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e3e8ee] bg-[#f6f9fc] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5469d4]">
            {isSw ? 'Kwa Kila Jukumu' : 'One Platform · Every Role'}
          </span>
          <h2 className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-[#0a2640] md:text-[42px]">
            {isSw
              ? 'Thamani kwa Kila Mwandaaji wa Sherehe'
              : 'Value For Every Organizer & Committee'}
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="qw-card flex flex-col gap-4 p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#f6f9fc] text-[#5469d4] ring-1 ring-[#e3e8ee]">
                <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold text-[#0a2640]">{title}</h3>
              <p className="text-sm leading-relaxed text-[#494d59]">{desc}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
