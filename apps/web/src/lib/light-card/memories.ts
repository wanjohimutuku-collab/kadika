import { pickMessages } from '@harusi/i18n';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import type { GuestMemoriesView } from '@harusi/api-client';
import { formatIcu } from '../icu';
import { formatDate } from '../format';
import {
  brandLogo,
  esc,
  langChip,
  shell,
  trustStrip,
  type LightCardOptions,
  type Msg,
} from './render';

export interface MemoriesOptions extends LightCardOptions {
  /** Where a photo is fetched from; the API by default (mock mode serves sample files instead). */
  photoUrl?: (memoryId: string, size: 'thumb' | 'full') => string;
}

const CSS = `
.mem ol{list-style:none;margin:0;padding:0;display:grid;gap:24px}
.mem figure{margin:0}
.mem img{width:100%;height:auto;border-radius:12px;background:var(--border);display:block}
.mem time{display:block;font-size:14px;color:var(--muted);margin:0 0 8px}
.mem figcaption{margin-top:8px}
.back{display:inline-flex;align-items:center;min-height:48px;color:var(--hp-primary);font-weight:600}
dialog.viewer{padding:0;border:0;max-width:100vw;max-height:100dvh;background:#000}
dialog.viewer::backdrop{background:rgba(0,0,0,.85)}
dialog.viewer img{display:block;max-width:100vw;max-height:90dvh;width:auto;height:auto}
dialog.viewer button{position:absolute;top:8px;right:8px;min-width:48px;min-height:48px;border-radius:999px;border:0;background:#fff;color:#000;font:600 20px/1 inherit}
`;

/** The language chip reloads the page with the chosen language, as on the problem pages. */
const SCRIPT = `<script>(function(){var d=document.getElementById('hp-viewer');if(d&&d.showModal){var i=d.querySelector('img');document.querySelectorAll('[data-full]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();i.src=a.getAttribute('href');i.alt=a.querySelector('img').alt;d.showModal()})});d.querySelector('button').onclick=function(){d.close()};d.addEventListener('close',function(){i.removeAttribute('src')})}document.querySelectorAll('[data-lang]').forEach(function(b){b.onclick=function(){document.cookie='NEXT_LOCALE='+b.getAttribute('data-lang')+'; path=/; max-age=31536000; samesite=lax';location.reload()}})})()</script>`;

/**
 * Kumbukumbu (ADR 050): the couple's photos for one guest, as plain HTML like the card (ADR 014).
 * Thumbnails load lazily with their size reserved; tapping one opens the full photo in a dialog.
 */
export function renderMemories(view: GuestMemoriesView, o: MemoriesOptions): string {
  const { locale } = o;
  const event = view.card.event!;
  const t = (
    pickMessages(locale, ['memories'], event.country ?? 'TZ') as unknown as { memories: Msg }
  ).memories;
  const hosts = event.coupleNames;
  const title = formatIcu(t.guestPageTitle!, { hosts });
  const enc = encodeURIComponent(o.token);
  const photo =
    o.photoUrl ??
    ((id: string, size: 'thumb' | 'full') =>
      `${o.apiUrl}/v1/c/${enc}/memories/${encodeURIComponent(id)}/${size}`);
  const items = view.memories
    .map((x) => {
      const alt = x.caption ? formatIcu(t.photoAlt!, { caption: x.caption }) : t.photoAltNoCaption!;
      const when = x.takenOn
        ? `<time datetime="${esc(x.takenOn)}">${esc(formatDate(x.takenOn, locale))}</time>`
        : '';
      const caption = x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : '';
      return `<li><figure>${when}<a href="${esc(photo(x.id, 'full'))}" data-full><img src="${esc(photo(x.id, 'thumb'))}" alt="${esc(alt)}" width="${x.width}" height="${x.height}" loading="lazy" decoding="async"></a>${caption}</figure></li>`;
    })
    .join('');
  const body = `<main class="card mem" data-testid="memories-page">
<header class="cover"><div><p class="eyebrow">${esc(t.title)}</p>
<h1 class="names">${esc(event.partnerA)}${event.partnerB ? ` <small>&amp;</small> ${esc(event.partnerB)}` : ''}</h1></div></header><div class="band" aria-hidden="true"></div>
<section><a class="back" href="/c/${enc}">← ${esc(t.backToCard)}</a></section>
<section><ol data-testid="memories-list">${items}</ol></section>
${trustStrip(view.card, locale, o.domain)}
<footer class="no-print">${langChip(locale)}${brandLogo(o.brand)}<p class="muted">${esc(o.domain)}</p></footer>
</main>
<dialog id="hp-viewer" class="viewer"><img alt=""><button type="button" aria-label="${esc(t.close)}">✕</button></dialog>`;
  return shell({
    locale,
    title,
    palette: resolvePalette(event.themeId, event.palette),
    head: `<style>${CSS}</style>`,
    body,
    script: SCRIPT,
  });
}

/** Switched off, not unlocked, or empty: the guest is told only that it is not available. */
export function renderMemoriesUnavailable(
  o: Pick<LightCardOptions, 'locale' | 'domain' | 'brand'>,
): string {
  const t = (pickMessages(o.locale, ['memories']) as unknown as { memories: Msg }).memories;
  return shell({
    locale: o.locale,
    title: t.unavailableTitle!,
    palette: resolvePalette(undefined),
    body: `<main class="problem" data-testid="memories-unavailable">${brandLogo(o.brand)}
<h1>${esc(t.unavailableTitle)}</h1><p>${esc(t.unavailableBody)}</p>
<p class="muted" style="font-size:14px">${esc(o.domain)}</p>${langChip(o.locale)}</main>
<script>document.querySelectorAll('[data-lang]').forEach(function(b){b.onclick=function(){document.cookie='NEXT_LOCALE='+b.getAttribute('data-lang')+'; path=/; max-age=31536000; samesite=lax';location.reload()}})</script>`,
  });
}
