'use client';

import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Images,
  Lock,
  MessageCircle,
  Send,
  Sparkles,
  Wifi,
  X,
} from 'lucide-react';
import { Container, PillLink, SectionHeading } from '@/components/site/blocks';

type PositiveKey = 'heart' | 'clap' | 'cheers' | 'sparkle';

interface GuestMessage {
  id: string;
  author: string;
  textSw: string;
  textEn: string;
  isCustom?: boolean;
}

interface SamplePhoto {
  id: string;
  src: string;
  captionSw: string;
  captionEn: string;
  dateSw: string;
  dateEn: string;
  span?: boolean;
  initialReactions: Record<PositiveKey, number>;
  initialMessages: GuestMessage[];
}

const POSITIVE_REACTIONS: {
  key: PositiveKey;
  emoji: string;
  labelSw: string;
  labelEn: string;
}[] = [
  { key: 'heart', emoji: '❤️', labelSw: 'Upendo', labelEn: 'Love' },
  { key: 'clap', emoji: '👏', labelSw: 'Hongera', labelEn: 'Applause' },
  { key: 'cheers', emoji: '🥂', labelSw: 'Sherehe', labelEn: 'Cheers' },
  { key: 'sparkle', emoji: '✨', labelSw: 'Nzuri sana', labelEn: 'Sparkle' },
];

const SAMPLE_PHOTOS: SamplePhoto[] = [
  {
    id: 'm1',
    src: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
    captionSw: 'Tulipokutana kwa mara ya kwanza chuoni',
    captionEn: 'Where our story began together',
    dateSw: '2 Machi 2019',
    dateEn: '2 Mar 2019',
    span: true,
    initialReactions: { heart: 24, clap: 12, cheers: 8, sparkle: 15 },
    initialMessages: [
      {
        id: 'gm-1',
        author: 'Shangazi Amina',
        textSw: 'Mbarikiwe sana wanangu! Tunawapenda ❤️',
        textEn: 'So happy for you both! Wishing you endless joy ❤️',
      },
      {
        id: 'gm-2',
        author: 'Bakari M.',
        textSw: 'Picha nzuri sana — tukutane ukumbini!',
        textEn: 'What a timeless photo — see you at the reception!',
      },
    ],
  },
  {
    id: 'm2',
    src: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
    captionSw: 'Safari yetu ya Zanzibar',
    captionEn: 'Golden hour walk together',
    dateSw: '14 Ago 2021',
    dateEn: '14 Aug 2021',
    initialReactions: { heart: 19, clap: 9, cheers: 6, sparkle: 11 },
    initialMessages: [
      {
        id: 'gm-3',
        author: 'Neema K.',
        textSw: 'Tabasamu zenu zinapendeza sana ✨',
        textEn: 'Those smiles say everything ✨',
      },
    ],
  },
  {
    id: 'm3',
    src: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=900&q=80',
    captionSw: 'Siku ya posa na familia zote mbili',
    captionEn: 'Celebration with both families',
    dateSw: '20 Des 2025',
    dateEn: '20 Dec 2025',
    initialReactions: { heart: 31, clap: 18, cheers: 14, sparkle: 10 },
    initialMessages: [
      {
        id: 'gm-4',
        author: 'Mjomba Hassan',
        textSw: 'Hongereni sana Asha & Juma! 🥂',
        textEn: 'Cheers to a lifetime of happiness! 🥂',
      },
    ],
  },
  {
    id: 'm4',
    src: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
    captionSw: 'Maandalizi ya harusi · Tunawakaribisha',
    captionEn: 'Counting down to the big day with you',
    dateSw: '12 Des 2026',
    dateEn: '12 Dec 2026',
    initialReactions: { heart: 27, clap: 14, cheers: 16, sparkle: 19 },
    initialMessages: [
      {
        id: 'gm-5',
        author: 'Rehema S.',
        textSw: 'Hatutasahau siku hii! Hongera nyingi 👏',
        textEn: 'Counting the days with you! Big congratulations 👏',
      },
    ],
  },
];

/**
 * Interactive public-site showcase for Kumbukumbu (private guest photo gallery) inside a realistic
 * Android phone mockup. Lets visitors test positive-only reactions, short guest wishes, and the
 * fullscreen lightbox right on the homepage.
 */
export function GalleryShowcase({
  locale,
  primaryHref,
}: {
  locale: 'sw' | 'en';
  primaryHref: string;
}) {
  const sw = locale === 'sw';
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [reactions, setReactions] = useState<Record<string, Record<PositiveKey, number>>>(() =>
    Object.fromEntries(SAMPLE_PHOTOS.map((p) => [p.id, { ...p.initialReactions }])),
  );
  const [myReactions, setMyReactions] = useState<Record<string, PositiveKey[]>>({});
  const [messages, setMessages] = useState<Record<string, GuestMessage[]>>(() =>
    Object.fromEntries(SAMPLE_PHOTOS.map((p) => [p.id, [...p.initialMessages]])),
  );
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveIndex(null);
      else if (e.key === 'ArrowLeft')
        setActiveIndex((i) =>
          i === null ? null : (i - 1 + SAMPLE_PHOTOS.length) % SAMPLE_PHOTOS.length,
        );
      else if (e.key === 'ArrowRight')
        setActiveIndex((i) => (i === null ? null : (i + 1) % SAMPLE_PHOTOS.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex]);

  const toggleReaction = (photoId: string, key: PositiveKey) => {
    const cur = myReactions[photoId] ?? [];
    const active = cur.includes(key);
    setMyReactions((prev) => ({
      ...prev,
      [photoId]: active ? cur.filter((k) => k !== key) : [...cur, key],
    }));
    setReactions((prev) => ({
      ...prev,
      [photoId]: {
        ...prev[photoId]!,
        [key]: Math.max(0, (prev[photoId]?.[key] ?? 0) + (active ? -1 : 1)),
      },
    }));
  };

  const submitMessage = (photoId: string) => {
    const clean = draft
      .replace(/[\r\n\t]+/g, ' ')
      .trim()
      .slice(0, 140);
    if (!clean) return;
    setMessages((prev) => ({
      ...prev,
      [photoId]: [
        ...(prev[photoId] ?? []),
        {
          id: `custom-${Date.now()}`,
          author: sw ? 'Wewe (Mgeni)' : 'You (Guest)',
          textSw: clean,
          textEn: clean,
          isCustom: true,
        },
      ],
    }));
    setDraft('');
  };

  const points = sw
    ? [
        'Kila mgeni anafungua picha kupitia kiungo cha kadi yake pekee — hakuna mtu wa nje anayeziona.',
        'Wageni wanaweza kuonyesha hisia chanya (❤️ 👏 🥂 ✨) na kuandika pongezi fupi chini ya kila picha.',
        'Kila picha inabanwa kwa ubora wa hali ya juu (WebP 320–1280 px) bila metadata ya GPS/EXIF.',
        'Inafunguka bure moja kwa moja mkinunua kifurushi chochote cha kadi za mwaliko.',
      ]
    : [
        'Each guest opens photos through their own invitation link — never indexed or public.',
        'Guests can leave positive-only reactions (❤️ 👏 🥂 ✨) and short congratulatory wishes.',
        'Uploads shrink automatically into crisp WebP tiers (320–1280 px) with EXIF/GPS stripped.',
        'Included free as soon as you unlock any invitation card bundle.',
      ];

  const activePhoto = activeIndex !== null ? SAMPLE_PHOTOS[activeIndex]! : null;
  const heroPhoto = SAMPLE_PHOTOS[0]!;
  const heroMsgs = messages[heroPhoto.id] ?? [];
  const latestHeroMsg = heroMsgs[heroMsgs.length - 1];

  return (
    <section
      id="kumbukumbu-showcase"
      aria-labelledby="kumbukumbu-heading"
      className="bg-white py-16 md:py-24"
    >
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col gap-5">
            <SectionHeading
              id="kumbukumbu-heading"
              eyebrow={sw ? 'Kumbukumbu · Albamu ya Siri' : 'Kumbukumbu · Private Gallery'}
              sub={
                sw
                  ? 'Shiriki picha za safari yenu au sherehe moja kwa moja na wageni walioalikwa tu — hakuna app ya kupakua wala viungo vya umma.'
                  : 'Share engagement and celebration photos exclusively with your invited guests — right inside their digital card, with zero app installs.'
              }
            >
              {sw
                ? 'Albamu ya picha za safari yenu, kwa wageni wenu pekee'
                : 'A private photo gallery for your guests, right on their card'}
            </SectionHeading>

            <ul className="flex flex-col gap-2.5 text-sm text-[#0a2640]">
              {points.map((pt) => (
                <li key={pt} className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#5469d4]"
                  >
                    <Sparkles className="size-3" />
                  </span>
                  <span className="leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <PillLink href={primaryHref} kind="primary">
                {sw ? 'Anza Kadi na Albamu Bure' : 'Create Your Card & Gallery'}
              </PillLink>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#494d59]">
                <Lock className="size-3.5 text-[#5469d4]" aria-hidden="true" />
                {sw
                  ? 'Bofya picha kuona hisia na kuandika pongezi →'
                  : 'Tap any photo to react or leave a wish →'}
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-[312px] sm:w-[344px] lg:mr-0 lg:ml-auto">
            {/* Subtle ambient glow behind the device */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(84,105,212,0.16),transparent)]"
            />

            {/* Right-side Android hardware buttons: volume rocker & power */}
            <span
              aria-hidden="true"
              className="absolute top-[104px] -right-[3px] h-[54px] w-[3px] rounded-r-sm bg-gradient-to-b from-[#5a6268] to-[#262b30]"
            />
            <span
              aria-hidden="true"
              className="absolute top-[174px] -right-[3px] h-[34px] w-[3px] rounded-r-sm bg-gradient-to-b from-[#5a6268] to-[#262b30]"
            />

            {/* Outer metallic/titanium Android chassis */}
            <div className="rounded-[44px] bg-gradient-to-b from-[#4a5156] via-[#22272b] to-[#111417] p-[3px] shadow-[0_28px_56px_-16px_rgba(10,38,64,0.42)] ring-1 ring-white/15">
              {/* Inner deep-black bezel */}
              <div className="rounded-[41px] bg-[#0b0d10] p-[9px]">
                {/* Inner Android display viewport */}
                <div className="overflow-hidden rounded-[33px] bg-[#f6f9fc] ring-1 ring-white/10">
                  {/* Android status bar with centered punch-hole selfie camera */}
                  <div className="flex items-center justify-between bg-[#0a2640] px-5 pt-2.5 pb-2 text-[11px] font-semibold text-white tabular-nums">
                    <span>9:41</span>
                    <span
                      aria-hidden="true"
                      className="flex size-[13px] items-center justify-center rounded-full bg-[#07090c] shadow-inner ring-1 ring-white/15"
                    >
                      <span className="size-[5px] rounded-full bg-[radial-gradient(circle_at_35%_35%,#4f79ff,#101a33_65%,#05070a)]" />
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[9.5px] font-bold tracking-tight text-white/90">
                        5G
                      </span>
                      <svg
                        width="13"
                        height="10"
                        viewBox="0 0 13 10"
                        fill="currentColor"
                        aria-hidden="true"
                        className="text-white"
                      >
                        <rect x="0" y="7" width="2" height="3" rx="0.5" />
                        <rect x="3.5" y="5" width="2" height="5" rx="0.5" />
                        <rect x="7" y="2.5" width="2" height="7.5" rx="0.5" />
                        <rect x="10.5" y="0" width="2" height="10" rx="0.5" />
                      </svg>
                      <Wifi className="size-3 text-white" aria-hidden="true" />
                      <svg
                        width="18"
                        height="10"
                        viewBox="0 0 18 10"
                        fill="none"
                        aria-hidden="true"
                      >
                        <rect
                          x="0.5"
                          y="1"
                          width="14.5"
                          height="8"
                          rx="2"
                          stroke="currentColor"
                          strokeOpacity="0.7"
                        />
                        <rect x="2" y="2.5" width="11" height="5" rx="1" fill="currentColor" />
                        <rect
                          x="15.8"
                          y="3.3"
                          width="1.5"
                          height="3.4"
                          rx="0.6"
                          fill="currentColor"
                          fillOpacity="0.7"
                        />
                      </svg>
                    </span>
                  </div>

                  {/* Mobile Chrome address bar */}
                  <div className="bg-[#0f3152] px-3.5 pt-1 pb-2.5">
                    <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10.5px] font-medium text-white/90">
                      <Lock className="size-2.5 shrink-0 text-emerald-300" aria-hidden="true" />
                      <span className="truncate">kadisasa.com/s/7Hq2/k</span>
                    </div>
                  </div>

                  {/* Kumbukumbu gallery header inside screen */}
                  <div className="flex items-center justify-between border-b border-[#e3e8ee] bg-white px-3.5 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#5469d4]">
                        <Images className="size-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#0a2640]">
                          {sw ? 'Kumbukumbu · Asha & Juma' : "Asha & Juma's Memories"}
                        </p>
                        <p className="truncate text-[10px] text-[#494d59]">
                          {sw ? 'Imefungwa · Wageni tu' : 'Private · Invited guests'}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f6f9fc] px-2 py-0.5 text-[10px] font-semibold text-[#5469d4] ring-1 ring-[#e3e8ee]">
                      {sw ? 'Picha 4' : '4 photos'}
                    </span>
                  </div>

                  {/* Interactive 2-column gallery grid */}
                  <div className="grid grid-cols-2 gap-2 p-3" data-testid="public-gallery-grid">
                    {SAMPLE_PHOTOS.map((photo, idx) => {
                      const totalReacts = Object.values(reactions[photo.id] ?? {}).reduce(
                        (a, b) => a + b,
                        0,
                      );
                      const msgCount = (messages[photo.id] ?? []).length;
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setActiveIndex(idx)}
                          className={`group relative overflow-hidden rounded-xl border border-[#e3e8ee] bg-white text-left transition hover:-translate-y-0.5 hover:border-[#5469d4]/50 focus-visible:outline-3 focus-visible:outline-[#5469d4] ${
                            photo.span ? 'col-span-2 aspect-[16/10]' : 'aspect-[4/3]'
                          }`}
                        >
                          <img
                            src={photo.src}
                            alt={sw ? photo.captionSw : photo.captionEn}
                            loading="lazy"
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-[#0a2640]/75 px-1.5 py-0.5 text-[9.5px] font-semibold text-white backdrop-blur-xs">
                            <span>❤️ {totalReacts}</span>
                            <span className="opacity-65">·</span>
                            <span>💬 {msgCount}</span>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a2640]/90 via-[#0a2640]/45 to-transparent p-2 text-white">
                            <p className="text-[10px] font-semibold text-white/80">
                              {sw ? photo.dateSw : photo.dateEn}
                            </p>
                            <p className="line-clamp-1 text-[11px] font-bold">
                              {sw ? photo.captionSw : photo.captionEn}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick positive-only reactions + latest wish strip inside phone */}
                  <div className="mx-3 mb-2 rounded-xl border border-[#e3e8ee] bg-white p-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex flex-wrap items-center gap-1">
                        {POSITIVE_REACTIONS.map((item) => {
                          const pressed = (myReactions[heroPhoto.id] ?? []).includes(item.key);
                          const cnt = reactions[heroPhoto.id]?.[item.key] ?? 0;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              aria-pressed={pressed}
                              aria-label={sw ? item.labelSw : item.labelEn}
                              onClick={() => toggleReaction(heroPhoto.id, item.key)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition ${
                                pressed
                                  ? 'border-[#5469d4] bg-[#eef2ff] text-[#0a2640]'
                                  : 'border-[#e3e8ee] bg-[#f6f9fc] text-[#494d59] hover:border-[#5469d4]/40'
                              }`}
                            >
                              <span>{item.emoji}</span>
                              <span>{cnt}</span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveIndex(0)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold text-[#5469d4] hover:bg-[#dfe6ff]"
                      >
                        <MessageCircle className="size-2.5" aria-hidden="true" />
                        {sw ? 'Andika' : 'Wish'}
                      </button>
                    </div>
                    {latestHeroMsg ? (
                      <p className="mt-1.5 line-clamp-1 text-[10.5px] text-[#494d59]">
                        <span className="font-semibold text-[#0a2640]">
                          {latestHeroMsg.author}:
                        </span>{' '}
                        {sw ? latestHeroMsg.textSw : latestHeroMsg.textEn}
                      </p>
                    ) : null}
                  </div>

                  {/* Android gesture navigation bar */}
                  <div className="flex justify-center bg-white pt-1.5 pb-2.5" aria-hidden="true">
                    <span className="h-[4px] w-[96px] rounded-full bg-[#0a2640]/25" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {activePhoto !== null && activeIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={sw ? activePhoto.captionSw : activePhoto.captionEn}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#061321]/92 p-4 backdrop-blur-xs"
          onClick={() => setActiveIndex(null)}
        >
          <div
            className="relative flex w-full max-w-2xl flex-col gap-3 rounded-3xl bg-[#0a2640] p-4 text-white shadow-2xl ring-1 ring-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <span className="tabular text-xs font-semibold text-white/75">
                {activeIndex + 1} / {SAMPLE_PHOTOS.length} ·{' '}
                {sw ? activePhoto.dateSw : activePhoto.dateEn}
              </span>
              <button
                type="button"
                aria-label={sw ? 'Funga' : 'Close'}
                onClick={() => setActiveIndex(null)}
                className="inline-flex size-9 items-center justify-center rounded-full bg-white text-[#0a2640] hover:bg-[#eef2ff]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-black/40">
              <button
                type="button"
                aria-label={sw ? 'Iliyotangulia' : 'Previous'}
                onClick={() =>
                  setActiveIndex((activeIndex - 1 + SAMPLE_PHOTOS.length) % SAMPLE_PHOTOS.length)
                }
                className="absolute left-2 z-10 inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <img
                src={activePhoto.src}
                alt={sw ? activePhoto.captionSw : activePhoto.captionEn}
                className="max-h-[48dvh] w-full object-contain"
              />
              <button
                type="button"
                aria-label={sw ? 'Inayofuata' : 'Next'}
                onClick={() => setActiveIndex((activeIndex + 1) % SAMPLE_PHOTOS.length)}
                className="absolute right-2 z-10 inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>

            <p className="px-1 text-center text-sm font-semibold text-white">
              {sw ? activePhoto.captionSw : activePhoto.captionEn}
            </p>

            {/* Positive-only reactions & short guest messages inside lightbox */}
            <div className="flex flex-col gap-2.5 rounded-2xl bg-white/8 p-3 ring-1 ring-white/10">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {POSITIVE_REACTIONS.map((item) => {
                  const pressed = (myReactions[activePhoto.id] ?? []).includes(item.key);
                  const cnt = reactions[activePhoto.id]?.[item.key] ?? 0;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={pressed}
                      onClick={() => toggleReaction(activePhoto.id, item.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        pressed
                          ? 'bg-white text-[#0a2640] shadow-sm'
                          : 'bg-white/12 text-white hover:bg-white/22'
                      }`}
                    >
                      <span>{item.emoji}</span>
                      <span>{sw ? item.labelSw : item.labelEn}</span>
                      <span className="tabular opacity-80">{cnt}</span>
                    </button>
                  );
                })}
              </div>

              <ul className="flex max-h-28 flex-col gap-1.5 overflow-y-auto text-xs">
                {(messages[activePhoto.id] ?? []).map((msg) => (
                  <li key={msg.id} className="rounded-lg bg-white/8 px-2.5 py-1.5 text-white/90">
                    <span className="font-bold text-white">{msg.author}:</span>{' '}
                    {sw ? msg.textSw : msg.textEn}
                  </li>
                ))}
              </ul>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitMessage(activePhoto.id);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={draft}
                  maxLength={140}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={sw ? 'Andika ujumbe mfupi wa pongezi…' : 'Write a short wish…'}
                  className="min-w-0 flex-1 rounded-full bg-white/12 px-3.5 py-2 text-xs text-white placeholder:text-white/55 focus:bg-white/18 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-[#0a2640] hover:bg-[#eef2ff]"
                >
                  <Send className="size-3.5" aria-hidden="true" />
                  {sw ? 'Tuma' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
