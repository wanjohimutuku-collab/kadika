import {
  ArrowUpRight,
  Briefcase,
  Cake,
  CheckCircle2,
  FileText,
  GraduationCap,
  Heart,
  Landmark,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { SiteLink as Link } from '@/components/site/site-link';
import { Container } from '@/components/site/blocks';
import type { SiteMarket } from '@/lib/site-locale';

/**
 * Gupshup.ai-inspired structural sections adapted for Kadika / Harusi Pass.
 * Covers:
 * 1. TrustChannelBar (Component 1: Trusted channel & payment strip)
 * 2. AutomationPillGrid (Component 2: Highlighted heading + icon-pill grid)
 * 3. AutopilotPillars (Component 3: 3 tall visual cards)
 * 4. ScaleStatsBand (Component 5: Dark midnight-indigo stats + app container)
 * 5. RoleCardsSection (Component 6: 4-column "Built for every role" grid)
 */

export function TrustChannelBar({ locale, market }: { locale: 'sw' | 'en'; market: SiteMarket }) {
  const title =
    locale === 'sw'
      ? 'Imeundwa kwa njia za mawasiliano na malipo zinazotumika Afrika Mashariki'
      : 'Built for the messaging channels and payment rails guests use every day';

  const channels =
    market === 'ke'
      ? ['WhatsApp', 'SMS Fallback', 'A6 / A4 Print PDF', 'Offline QR Gate', 'M-Pesa Ledger']
      : [
          'WhatsApp',
          'SMS Fallback',
          'A6 / A4 Print PDF',
          'Offline QR Gate',
          'M-Pesa · Mixx · Airtel',
        ];

  return (
    <section aria-label={title} className="border-b border-[#e2e7f3] bg-white py-8">
      <Container className="flex flex-col items-center gap-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b6662]">{title}</p>
        <ul className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {channels.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[#e2e7f3] bg-[#f6f4ff]/70 px-4 py-1.5 text-sm font-semibold text-[#100e24]/80"
            >
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function AutomationPillGrid({
  locale,
  primaryHref,
}: {
  locale: 'sw' | 'en';
  primaryHref: string;
}) {
  const isSw = locale === 'sw';
  const pills = isSw
    ? [
        { icon: Heart, label: 'Kadi za Harusi' },
        { icon: Sparkles, label: 'Send-off & Kitchen Party' },
        { icon: Landmark, label: 'Nikah & Walima' },
        { icon: Briefcase, label: 'Mikutano & Biashara' },
        { icon: GraduationCap, label: 'Mahafali' },
        { icon: Cake, label: 'Sherehe za Kuzaliwa' },
        { icon: MessageSquare, label: 'Utumaji kwa WhatsApp' },
        { icon: Smartphone, label: 'SMS kwa wasio na smartphone' },
        { icon: FileText, label: 'Kadi za kuchapisha (PDF)' },
        { icon: Wallet, label: 'Daftari la Michango' },
        { icon: QrCode, label: 'Lango la QR bila mtandao' },
        { icon: Users, label: 'Majibu ya RSVP & Idadi' },
      ]
    : [
        { icon: Heart, label: 'Wedding Invitations' },
        { icon: Sparkles, label: 'Send-off & Kitchen Party' },
        { icon: Landmark, label: 'Nikah & Walima' },
        { icon: Briefcase, label: 'Corporate & Conferences' },
        { icon: GraduationCap, label: 'Graduations' },
        { icon: Cake, label: 'Birthdays & Anniversaries' },
        { icon: MessageSquare, label: 'WhatsApp Card Delivery' },
        { icon: Smartphone, label: 'SMS Fallback Cards' },
        { icon: FileText, label: 'Printable A6 / A4 PDFs' },
        { icon: Wallet, label: 'Direct Pledge Ledger' },
        { icon: QrCode, label: 'Offline QR Gate' },
        { icon: Users, label: 'Live RSVP & Headcount' },
      ];

  return (
    <section className="bg-[#f6f4ff] py-16 md:py-24">
      <Container className="flex flex-col items-center gap-8 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-4">
          <h2 className="text-[30px] font-bold leading-[1.15] tracking-[-0.025em] text-[#100e24] md:text-[42px]">
            {isSw ? (
              <>
                <span className="gp-highlight">Simamia kila mwaliko</span> kwa sherehe na hafla zote
              </>
            ) : (
              <>
                <span className="gp-highlight">Orchestrate every invitation</span> across every
                celebration
              </>
            )}
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-[#4a5568] md:text-lg">
            {isSw
              ? 'Badili orodha ya wageni kuwa mialiko ya kisasa yenye RSVP, michango ya moja kwa moja, na ukaguzi wa langoni kwa sekunde.'
              : 'Turn guest lists into personalized digital cards, real-time RSVPs, transparent pledge tracking, and fast QR gate check-in.'}
          </p>
          <div className="pt-1">
            <Link href={primaryHref} className="gp-cta">
              <span>{isSw ? 'Anza kuunda kadi' : 'Start creating cards'}</span>
              <span aria-hidden="true" className="gp-cta-arrow">
                <ArrowUpRight className="size-[18px]" strokeWidth={2.2} />
              </span>
            </Link>
          </div>
        </div>

        <ul className="flex max-w-5xl flex-wrap justify-center gap-3 pt-2">
          {pills.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2.5 rounded-2xl border border-[#e2e7f3] bg-white px-4 py-2.5 text-sm font-semibold text-[#100e24] shadow-xs transition hover:-translate-y-0.5 hover:border-[#5956d6]/40 hover:text-[#4338ca]"
            >
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#f6f4ff] text-[#5956d6]">
                <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function AutopilotPillars({ locale }: { locale: 'sw' | 'en' }) {
  const isSw = locale === 'sw';
  const cards = isSw
    ? [
        {
          tag: 'RSVP ya papo hapo',
          title: 'Majibu ya wageni na idadi ya viti kwa wakati halisi',
          metric: '142 / 180 wamethibitisha',
          detail: 'Kila mgeni anachagua kuhudhuria au la bila kupakua programu.',
          icon: Users,
        },
        {
          tag: 'Kila mgeni anafikiwa',
          title: 'Kadi binafsi kwa WhatsApp, SMS au karatasi ya QR',
          metric: 'WhatsApp · SMS · A6 PDF',
          detail: 'Wageni wenye smartphone na wasio nayo wote wanapata mwaliko kamili.',
          icon: MessageSquare,
        },
        {
          tag: 'Lango bila intaneti',
          title: 'Skani ya QR ya sekunde moja inayozuia kadi kurudiwa',
          metric: 'Inafanya kazi bila mtandao',
          detail: 'Walinzi wa mlangoni wanakagua kwa Android hata kama ukumbi hauna mtandao.',
          icon: ShieldCheck,
        },
      ]
    : [
        {
          tag: 'Real-time RSVP',
          title: 'Live guest confirmations & party-size headcount',
          metric: '142 / 180 confirmed',
          detail: 'Guests confirm attendance and seat counts in one tap—no app install needed.',
          icon: Users,
        },
        {
          tag: 'Every guest reached',
          title: 'Personalized cards via WhatsApp, SMS & printable PDF',
          metric: 'WhatsApp · SMS · A6 PDF',
          detail: 'Reach smartphone and feature-phone guests alike with unified gate codes.',
          icon: MessageSquare,
        },
        {
          tag: 'Offline gate scan',
          title: '1-second QR verification that blocks duplicate entries',
          metric: 'Works offline at venue',
          detail: 'Ushers scan and admit guests with Android even when venue reception drops.',
          icon: ShieldCheck,
        },
      ];

  return (
    <section className="bg-white py-16 md:py-24">
      <Container className="flex flex-col gap-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <h2 className="text-[30px] font-bold leading-[1.15] tracking-[-0.025em] text-[#100e24] md:text-[42px]">
            {isSw
              ? 'Weka mialiko yako kwenye mfumo mmoja wa kuaminika'
              : 'Put guest coordination on autopilot from invite to gate'}
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-[#4a5568] md:text-lg">
            {isSw
              ? 'Huduma ya haraka, sahihi, na rahisi kwa kamati na wageni wote.'
              : 'Deliver seamless, personalized invitations with speed, clarity, and zero gate bottlenecks.'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className="gp-card flex flex-col justify-between gap-6 p-6 md:p-7"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6f4ff] px-3 py-1 text-xs font-semibold text-[#4338ca]">
                      {card.tag}
                    </span>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#5956d6]/10 text-[#5956d6]">
                      <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#e2e7f3] bg-[#f8f7ff] px-4 py-3 text-sm font-bold text-[#100e24]">
                    {card.metric}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold leading-snug text-[#100e24]">{card.title}</h3>
                  <p className="text-sm leading-relaxed text-[#4a5568]">{card.detail}</p>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export function ScaleStatsBand({
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
        { value: '2', label: 'Lugha kamili', sub: 'Kiswahili na Kiingereza' },
      ]
    : [
        { value: '3', label: 'Delivery channels', sub: 'WhatsApp, SMS & Print PDF' },
        { value: '100%', label: 'Offline gate scan', sub: 'Works with zero venue signal' },
        { value: '0%', label: 'Pledge commission', sub: 'Funds go direct to the host' },
        { value: '2', label: 'Full languages', sub: 'Swahili & English built-in' },
      ];

  return (
    <section className="gp-dark-band relative overflow-hidden py-16 text-white md:py-24">
      <Container className="flex flex-col gap-14">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c7d2fe]">
            {isSw ? 'Miundombinu ya kuaminika' : 'Built for East African events'}
          </span>
          <h2 className="max-w-3xl text-[30px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[44px]">
            {isSw
              ? 'Mfumo mmoja wa kuendesha mialiko, michango, na lango la wageni.'
              : 'The purpose-built invitation & gate engine for East African celebrations.'}
          </h2>
        </div>

        <dl className="grid grid-cols-2 gap-6 border-y border-white/10 py-10 md:grid-cols-4 md:gap-8">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5 text-center md:text-left">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                <span className="bg-gradient-to-r from-[#a5b4fc] to-[#f472b6] bg-clip-text text-transparent">
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

export function RoleCardsSection({ locale }: { locale: 'sw' | 'en' }) {
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
    <section className="bg-white py-16 md:py-24">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f6f4ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4338ca]">
              {isSw ? 'Kwa kila jukumu' : 'Built for every role'}
            </span>
            <h2 className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-[#100e24] md:text-[42px]">
              {isSw
                ? 'Kila mmoja kwenye timu yako anapata zana zake'
                : 'Teams & families trust Kadika regardless of role'}
            </h2>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="gp-card flex flex-col gap-4 p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#f6f4ff] text-[#5956d6]">
                <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <h3 className="text-lg font-bold text-[#100e24]">{title}</h3>
              <p className="text-sm leading-relaxed text-[#4a5568]">{desc}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
