import { eventKindLabel } from '@harusi/schemas';
import { messages, pickMessages, type Locale } from '@harusi/i18n';
import { lightColors } from '@harusi/ui-tokens/colors';
import { mixHex, resolvePalette, type Palette } from '@harusi/ui-tokens/palette';
import type { CardView } from '@harusi/api-client';
import { formatIcu } from '../icu';
import { qrMatrix, qrPath, QR_QUIET_ZONE } from '../qr';
import {
  formatClock,
  formatDate,
  formatDateShort,
  formatPhone,
  formatTime,
  formatMoney,
  formatWeekday,
  swahiliTime,
} from '../format';
import { CLIENT_SCRIPT } from './client-script';

/**
 * The guest card as one static HTML document (ADR 014): no React, no framework runtime, inline
 * CSS and a ~10 KB vanilla script, so the first load stays well under the §7.3 100 KB budget.
 * Every dynamic string goes through `esc()`; the script reads its data from a JSON block.
 */
export interface LightCardOptions {
  token: string;
  locale: Locale;
  domain: string;
  /** `mock`: the browser overlays its local demo state. `api`: RSVP posts to `apiUrl`. */
  mode: 'mock' | 'api';
  apiUrl: string;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Safe inside <script type="application/json">: `<` can never close the tag. */
const jsonForScript = (v: unknown): string => JSON.stringify(v).replace(/</g, '\\u003c');

const SAFE_GRADIENT = /^[\w\s#%.,()+/-]{1,300}$/;

const ICONS = {
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  pin: '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  shirt:
    '<path d="M20.4 4.7 16 3a4 4 0 0 1-8 0L3.6 4.7a1 1 0 0 0-.7 1.1l.6 3.5a1 1 0 0 0 1 .8H6V21a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10.1h1.5a1 1 0 0 0 1-.8l.6-3.5a1 1 0 0 0-.7-1.1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.1-17.1 1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  x: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/>',
};
const icon = (name: keyof typeof ICONS, cls = ''): string =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const c = lightColors;
const CSS = `
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-text-size-adjust:100%}
h1,h2,p{margin:0}
a{color:inherit}
[hidden]{display:none!important}
.ic{flex:none;vertical-align:-5px}
.card{max-width:32rem;margin:0 auto;background:var(--surface);overflow:hidden}
@media(min-width:768px){.card{margin:24px auto;border:1px solid var(--border);border-radius:16px}}
.cover{position:relative;text-align:center;color:var(--hp-on-primary);background:var(--hp-primary)}
.cover:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.38))}
.cover>div{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:28px 20px 40px}
.eyebrow{font-size:14px;letter-spacing:.2em;text-transform:uppercase;opacity:.9}
.names{font:600 44px/1.1 Georgia,"Times New Roman",serif;text-wrap:balance}
.names small{font-size:.7em}
.when{font-size:18px;font-weight:600}
.band{position:relative;height:12px;margin-top:-12px;background:var(--surface);border-radius:12px 12px 0 0}
.lead{padding:16px 20px 0;text-align:center;font-weight:600;text-wrap:balance}
.lead span{display:block;font-weight:400}
section{border-bottom:1px solid var(--border);padding:20px}
h2{font-size:18px;font-weight:600}
.trust{display:flex;flex-direction:column;gap:12px;border:1px solid var(--tb-success);background:var(--t-success);border-radius:12px;padding:12px}
.trust>div{display:flex;gap:12px;align-items:flex-start;font-size:14px}
.trust .ic{color:var(--success);width:24px;height:24px;margin-top:2px}
.muted{color:var(--muted)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 16px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--ink);font:600 16px/1 inherit;font-family:inherit;text-decoration:none;cursor:pointer}
.btn:disabled{opacity:.5}
.btn.block{width:100%}
.btn.primary{background:var(--hp-primary);border-color:var(--hp-primary);color:var(--hp-on-primary)}
.btn.accent{background:var(--surface);border:2px solid var(--hp-primary);color:var(--hp-primary)}
.btn.ghost{border-color:transparent;min-height:40px}
.btn.lg{min-height:56px;font-size:18px}
.btn:focus-visible,a:focus-visible{outline:3px solid var(--info);outline-offset:2px}
.row{display:flex;align-items:flex-start;gap:12px}
.row .ic{color:var(--hp-primary);margin-top:2px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.stack{display:flex;flex-direction:column;gap:12px}
.mt{margin-top:12px}
.banner{border-radius:12px;padding:12px;font-size:15px;border:1px solid var(--border)}
.banner.success{background:var(--t-success);border-color:var(--tb-success)}
.banner.info{background:var(--t-info);border-color:var(--tb-info)}
.banner.offline{background:var(--t-warning);border-color:var(--tb-warning)}
.banner.error{background:var(--t-danger);border-color:var(--tb-danger)}
.banner.warning{background:var(--t-warning);border-color:var(--tb-warning)}
.offline-bar{background:var(--ink);color:var(--surface);text-align:center;font-size:14px;font-weight:600;padding:8px 16px}
.summary{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--border);border-radius:12px;padding:12px;font-weight:600}
.panel{display:flex;flex-direction:column;gap:12px;border:1px solid var(--border);border-radius:12px;padding:12px}
.stepper{display:flex;align-items:center;justify-content:space-between;gap:12px}
.stepper b{font-size:28px;min-width:2ch;text-align:center}
.stepper .btn{width:56px;padding:0;font-size:24px}
.qr{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.qrbox{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px}
.qrbox svg{display:block;width:232px;height:232px;background:#fff}
.code{font:700 36px/1.1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.18em}
.hint{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:var(--t-accent);padding:6px 12px;font-size:14px;font-weight:500}
.qr .actions{display:grid;grid-template-columns:1fr;gap:8px;width:100%}
@media(min-width:420px){.qr .actions{grid-template-columns:1fr 1fr}}
.problem{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;max-width:32rem;margin:0 auto}
.problem h1{font-size:24px}
footer{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 20px;font-size:14px;background:var(--bg)}
footer nav{display:flex;flex-wrap:wrap;gap:4px 16px;justify-content:center}
footer nav a{min-height:40px;display:inline-flex;align-items:center}
.lang{display:inline-flex;border:1px solid var(--border);border-radius:999px;overflow:hidden}
.lang button{min-height:40px;min-width:56px;border:0;background:var(--surface);color:var(--ink);font:600 14px inherit;font-family:inherit;cursor:pointer}
.lang button[aria-pressed=true]{background:var(--ink);color:var(--surface)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media print{.no-print{display:none!important}.card{border:0;margin:0}}
`;

type Msg = Record<string, string>;

/** Every colour the page uses, resolved once: preset + the event's overrides + banner tints. */
function paletteCss(p: Palette): string {
  const tint = (status: string, amount: number) => mixHex(p.surface, status, amount);
  const status = { success: c.success, warning: c.warning, danger: c.danger, info: c.info };
  const vars = [
    `--hp-primary:${p.primary}`,
    `--hp-on-primary:${p.onPrimary}`,
    `--hp-accent:${p.accent}`,
    `--bg:${p.bg}`,
    `--surface:${p.surface}`,
    `--ink:${p.ink}`,
    `--muted:${p.muted}`,
    `--border:${p.border}`,
    `--success:${c.success}`,
    `--t-accent:${tint(p.accent, 0.14)}`,
    ...Object.entries(status).flatMap(([k, v]) => [
      `--t-${k}:${tint(v, 0.1)}`,
      `--tb-${k}:${tint(v, 0.4)}`,
    ]),
  ];
  return `:root{${vars.join(';')}}`;
}

function fmt(tpl: string, values: Record<string, string | number> = {}): string {
  return formatIcu(tpl, values);
}

function langChip(locale: Locale): string {
  const common = messages[locale].common as unknown as Record<string, unknown>;
  const names = common.languageName as Record<Locale, string>;
  const b = (l: Locale) =>
    `<button type="button" data-lang="${l}" aria-pressed="${locale === l}" lang="${l}" aria-label="${esc(fmt(String(common.switchTo), { lang: names[l] }))}">${l.toUpperCase()}</button>`;
  return `<div class="lang no-print" role="group" aria-label="${esc(String(common.language))}">${b('sw')}${b('en')}</div>`;
}

function shell(opts: {
  locale: Locale;
  title: string;
  description?: string;
  head?: string;
  palette: Palette;
  body: string;
  script?: string;
}): string {
  return `<!doctype html><html lang="${opts.locale}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(opts.title)}</title>${opts.description ? `<meta name="description" content="${esc(opts.description)}">` : ''}
<meta name="theme-color" content="${opts.palette.primary}">${opts.head ?? ''}<style>${paletteCss(opts.palette)}${CSS}</style></head>
<body>${opts.body}${opts.script ?? ''}</body></html>`;
}

/** Invalid / reissued / unavailable token page (§17.6 visible states). */
export function renderProblem(
  state: 'invalid' | 'reissued' | 'error',
  o: Pick<LightCardOptions, 'locale' | 'domain'>,
): string {
  const m = messages[o.locale] as unknown as { card: Msg; states: Msg };
  const title = state === 'error' ? m.states.errorTitle! : m.card[`${state}Title`]!;
  const body = state === 'error' ? m.states.errorBody! : m.card[`${state}Body`]!;
  return shell({
    locale: o.locale,
    title,
    palette: resolvePalette(undefined),
    body: `<main class="problem" data-testid="card-${state}">
<span aria-hidden="true" style="color:var(--warning)">${icon('x', 'big').replace('width="24" height="24"', 'width="56" height="56"')}</span>
<h1>${esc(title)}</h1><p>${esc(body)}</p>
<a class="btn" href="/k">${esc(m.card.enterCodeInstead)}</a>
<p class="muted" style="font-size:14px">${icon('shield')} ${esc(m.card.trustNever)}</p>
<p class="muted" style="font-size:14px">${esc(o.domain)}</p>${langChip(o.locale)}</main>
<script>document.querySelectorAll('[data-lang]').forEach(function(b){b.onclick=function(){document.cookie='NEXT_LOCALE='+b.getAttribute('data-lang')+'; path=/; max-age=31536000; samesite=lax';location.reload()}})</script>`,
  });
}

export function renderCard(view: CardView, o: LightCardOptions): string {
  const { locale } = o;
  const m = pickMessages(locale, ['card', 'states', 'common']) as unknown as {
    card: Msg;
    states: Msg;
    common: Msg;
  };
  const t = m.card;
  const event = view.event!;
  const cur = event.currency ?? 'TZS';
  const guest = view.guest!;
  const people = (n: number) => fmt(m.common.people!, { count: n });
  const answered = view.rsvp.status !== 'pending';
  const rsvpOpen = view.rsvpOpen && !view.eventPassed;
  const partyMax = Math.max(1, guest.partySizeAllowed);
  const partyShown = Math.max(1, view.rsvp.partySize || partyMax);

  const qr = view.qrPayload ? qrMatrix(view.qrPayload) : null;
  const qrDim = qr ? qr.size + QR_QUIET_ZONE * 2 : 0;
  const qrD = qr ? qrPath(qr) : '';
  const phone = formatPhone(event.committeePhone);
  const mapHref =
    event.venueMapUrl ||
    `https://www.openstreetmap.org/search?query=${encodeURIComponent(event.venueName)}`;
  const cover =
    event.coverGradient && SAFE_GRADIENT.test(event.coverGradient)
      ? ` style="background:${esc(event.coverGradient)}"`
      : '';
  const time =
    locale === 'sw'
      ? `Saa ${swahiliTime(event.dateStart)} (${formatClock(event.dateStart)})`
      : formatTime(event.dateStart, locale);

  const qrSection = qr
    ? `<section class="qr" id="hp-qr" aria-labelledby="qr-title"${view.rsvp.status === 'declined' ? ' hidden' : ''}>
<h2 id="qr-title">${esc(t.qrTitle)}</h2>
<div class="qrbox" data-testid="qr-block"><svg role="img" aria-label="${esc(fmt(t.qrAlt!, { code: guest.shortCode }))}" viewBox="0 0 ${qrDim} ${qrDim}" shape-rendering="crispEdges"><rect width="${qrDim}" height="${qrDim}" fill="#FFFFFF"/><path d="${qrD}" fill="#000000"/></svg></div>
<p><span class="muted" style="font-size:14px;display:block">${esc(t.codeLabel)}</span><span class="code" data-testid="short-code">${esc(guest.shortCode)}</span></p>
<p class="muted" style="font-size:14px">${esc(t.codeHelp)}</p>
<p class="hint">${icon('sun').replace('width="24" height="24"', 'width="16" height="16"')} ${esc(t.brightnessHint)}</p>
${view.isMock ? `<p class="muted" style="font-size:12px">${esc(t.mockToken)}</p>` : ''}
<div class="actions no-print">
<button type="button" class="btn" id="hp-dl-qr" data-testid="download-qr">${esc(t.downloadQr)}</button>
<button type="button" class="btn" id="hp-cal">${esc(t.addCalendar)}</button>
<button type="button" class="btn" id="hp-install">${esc(t.addHome)}</button>
<button type="button" class="btn" id="hp-print">${esc(t.savePdf)}</button>
</div><p id="hp-install-hint" class="muted" style="font-size:14px" role="status" hidden>${esc(t.installHint)}</p>
</section>`
    : '';

  const rsvpBody = view.eventPassed
    ? `<div class="banner info"><b>${esc(t.eventPassedTitle)}</b><br>${esc(t.eventPassedBody)}</div>`
    : `<h2 id="rsvp-title">${esc(t.rsvpQuestion)}</h2>
<div id="hp-rsvp-banner" class="banner" hidden></div>
<p id="hp-saving" class="muted mt" role="status" hidden>${esc(t.rsvpSaving)}</p>
<div id="hp-rsvp-summary" class="summary mt" data-testid="rsvp-summary"${answered ? '' : ' hidden'}>
<span><span id="hp-rsvp-icon" aria-hidden="true">${view.rsvp.status === 'declined' ? '✖' : '✔'}</span> <span id="hp-rsvp-text">${esc(view.rsvp.status === 'confirmed' ? fmt(t.confirmedCompact!, { people: people(view.rsvp.partySize ?? 1) }) : t.declinedCompact)}</span></span>
<button type="button" class="btn ghost" id="hp-change"${rsvpOpen ? '' : ' hidden'}>${esc(t.changeAnswer)}</button></div>
${!rsvpOpen && !answered ? `<div class="banner warning mt">${esc(t.rsvpClosed)}</div>` : ''}
<div id="hp-rsvp-form" class="stack mt"${answered || !rsvpOpen ? ' hidden' : ''}>
${event.rsvpDeadline ? `<p class="muted" style="font-size:14px">${esc(fmt(t.rsvpDeadline!, { date: formatDateShort(event.rsvpDeadline, locale) }))}</p>` : ''}
<div id="hp-party-panel" class="panel" hidden>
<div class="stepper"><span id="hp-party-label">${esc(t.partySize)}<br><span class="muted" style="font-size:14px">${esc(fmt(t.partySizeHelp!, { max: partyMax }))}</span></span>
<span class="stepper"><button type="button" class="btn" id="hp-dec" aria-label="${esc(t.decrease)}">−</button><b id="hp-party-count" aria-live="polite">${partyShown}</b><button type="button" class="btn" id="hp-inc" aria-label="${esc(t.increase)}">+</button></span></div>
<button type="button" class="btn primary lg block" id="hp-send" data-testid="rsvp-submit">${esc(t.sendAnswer)}</button></div>
<div id="hp-answer-row" class="grid2"><button type="button" class="btn primary lg" id="hp-yes" data-testid="rsvp-yes">${esc(t.rsvpYes)}</button><button type="button" class="btn accent lg" id="hp-no" data-testid="rsvp-no">${esc(t.rsvpNo)}</button></div>
</div>`;

  const pledge =
    event.pledgesEnabled && !view.eventPassed
      ? `<section class="no-print"><h2>${esc(t.pledgeTitle)}</h2>${
          view.pledge && view.pledge.amount > 0
            ? `<p data-testid="pledge-summary">${esc(fmt(t.pledgeSummary!, { pledged: formatMoney(view.pledge.amount, cur), paid: formatMoney(view.pledge.paid, cur), balance: formatMoney(view.pledge.balance, cur) }))}</p>`
            : `<p class="muted">${esc(t.pledgeNone)}</p>`
        }${
          view.pledge && view.pledge.amount > 0 && view.pledge.balance === 0
            ? `<p class="mt"><b>✔ ${esc(t.pledgePaidInFull)}</b></p>`
            : `<a class="btn primary block mt" href="/c/${encodeURIComponent(view.token)}/pay" data-testid="pay-link">${esc(t.pay)}</a>`
        }</section>`
      : '';

  const trust = `<section id="hp-trust-section" style="padding-top:16px"><div class="trust" data-testid="trust-strip"><div>${icon('shield')}<div><p><b>${esc(fmt(t.trustSender!, { sender: event.senderName }))}</b></p><p>${esc(fmt(t.trustCommitteePhone!, { phone }))}</p><p class="muted">${esc(fmt(t.trustDomain!, { domain: o.domain }))}</p><p class="muted" style="margin-top:4px">${esc(t.trustNever)}</p></div></div>
<a class="btn block" href="tel:${esc(event.committeePhone)}" aria-label="${esc(fmt(t.callCommittee!, { phone }))}">${icon('phone').replace('width="24" height="24"', 'width="16" height="16"')} ${esc(t.call)}</a></div></section>`;

  const confirmed = view.rsvp.status === 'confirmed';
  const rsvpSection = `<section id="hp-rsvp-section" aria-labelledby="rsvp-title">${rsvpBody}</section>`;

  const body = `<div id="hp-offline" class="offline-bar" role="status" hidden>${esc(m.states.offlineCached)}</div>
<main class="card" data-testid="guest-card">
<header class="cover"${cover}><div><p class="eyebrow">${esc(fmt(t.weddingOf!, { kind: eventKindLabel(event.eventKind, locale) }))}</p>
<h1 class="names">${esc(event.partnerA)}${event.partnerB ? ` <small>&amp;</small> ${esc(event.partnerB)}` : ''}</h1>
<p class="when">${esc(formatWeekday(event.dateStart, locale))} ${esc(formatDate(event.dateStart, locale))}</p><p>${esc(time)}</p></div></header><div class="band" aria-hidden="true"></div>
${
  event.greeting
    ? `<p class="lead">${esc(event.greeting)}.<span><b>${esc(fmt(t.dearGuest!, { guest: guest.displayName }))}</b></span></p>`
    : `<p class="lead">${esc(fmt(t.invitesYou!, { guest: guest.displayName }))}</p>`
}
${trust}
${confirmed ? qrSection : ''}
<section><div class="row">${icon('pin')}<div><p class="muted" style="font-size:14px">${esc(t.venue)}</p><p style="font-size:18px;font-weight:600">${esc(event.venueName)}</p></div></div>
<a class="btn block mt" href="${esc(mapHref)}" target="_blank" rel="noopener noreferrer">${esc(t.openMap)}</a>
${event.dressCode ? `<p class="row mt">${icon('shirt')}<span>${esc(fmt(t.dressCode!, { dressCode: event.dressCode }))}</span></p>` : ''}
${event.extraNote ? `<p class="muted mt">${esc(event.extraNote)}</p>` : ''}</section>
${rsvpSection}
${confirmed ? '' : qrSection}
${pledge}
<footer class="no-print">${langChip(locale)}<nav><a href="/privacy">${esc(t.privacyLink)}</a><a href="tel:${esc(event.committeePhone)}">${esc(t.footerContact)} · ${esc(phone)}</a></nav><p class="muted">${esc(o.domain)}</p><button type="button" id="hp-optout" class="btn" data-testid="stop-reminders" style="margin-top:8px">${esc(t.stopReminders)}</button><p id="hp-optout-msg" class="muted" style="font-size:14px" role="status" hidden></p></footer>
</main>`;

  // Strings and state the script needs (no ICU in the browser: plurals are pre-split here).
  const T: Record<string, string> = { ...pickKeys(t, SCRIPT_KEYS) };
  T.people1 = people(1);
  T.peopleN = people(2).replace('2', '{n}');
  const data = {
    t: T,
    s: {
      token: view.token,
      mode: o.mode,
      api: o.apiUrl,
      sw: true,
      partyShown,
      partyMax,
      rsvpOpen,
      qrDim,
      qrPath: qrD,
      shortCode: guest.shortCode,
      start: event.dateStart,
      couple: event.coupleNames,
      kind: eventKindLabel(event.eventKind, locale),
      venue: event.venueName,
      dress: event.dressCode ?? '',
      domain: o.domain,
    },
  };

  const title = fmt(t.metaTitle!, {
    couple: event.coupleNames,
    kind: eventKindLabel(event.eventKind, locale),
  });
  const description = fmt(t.metaDescription!, {
    date: formatDate(event.dateStart, locale),
    venue: event.venueName,
  });
  const enc = encodeURIComponent(view.token);
  return shell({
    locale,
    title,
    description,
    palette: resolvePalette(event.themeId, event.palette),
    head: `<link rel="manifest" href="/c/${enc}/manifest.webmanifest"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="/c/${enc}/opengraph-image"><meta name="twitter:card" content="summary_large_image">`,
    body,
    script: `<script type="application/json" id="hp-data">${jsonForScript(data)}</script><script>${CLIENT_SCRIPT}</script>`,
  });
}

const SCRIPT_KEYS = [
  'stopRemindersDone',
  'stopRemindersFailed',
  'confirmedCompact',
  'declinedCompact',
  'rsvpConfirmedBody',
  'rsvpDeclinedBody',
  'rsvpQueued',
  'rsvpClosed',
  'rsvpFailed',
  'calendarTitle',
  'dressCode',
  'codeLabel',
];

function pickKeys(src: Msg, keys: string[]): Msg {
  return Object.fromEntries(keys.map((k) => [k, src[k] ?? '']));
}
