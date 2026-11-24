import { pickMessages } from '@harusi/i18n';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import {
  POSITIVE_REACTIONS,
  type GuestMemoriesView,
  type MemoryPhotoSize,
  type PositiveReaction,
} from '@harusi/api-client';
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
  LANG_SCRIPT,
} from './render';

export interface MemoriesOptions extends LightCardOptions {
  /** Where a photo is fetched from; the API by default (mock mode serves sample files instead). */
  photoUrl?: (memoryId: string, size: MemoryPhotoSize) => string;
}

const SIZES = '(min-width: 32rem) 472px, calc(100vw - 40px)';

const CSS = `
.mem-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;padding-bottom:12px}
.mem-count{display:inline-flex;align-items:center;padding:4px 12px;border-radius:999px;background:var(--bg);border:1px solid var(--border);font-size:13px;font-weight:600;color:var(--muted)}
.mem ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:18px}
@media(min-width:420px){.mem ol{grid-template-columns:1fr 1fr;gap:14px}.mem ol:has(li:nth-child(3)) li:first-child{grid-column:1/-1}}
.mem figure{margin:0;background:var(--bg);border:1px solid var(--border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;height:100%}
.mem figure a{display:block;position:relative;overflow:hidden;background:var(--border)}
.mem img{width:100%;height:auto;display:block;transition:transform .25s ease}
.mem figure a:hover img{transform:scale(1.02)}
.mem .meta{padding:10px 12px 6px;display:flex;flex-direction:column;gap:4px}
.mem time{display:block;font-size:12.5px;font-weight:600;color:var(--muted)}
.mem figcaption{font-size:14.5px;line-height:1.4}
.mem-act{padding:8px 12px 12px;margin-top:auto;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
.mem-reacts{display:flex;flex-wrap:wrap;gap:6px}
.mem-r{display:inline-flex;align-items:center;gap:4px;min-height:32px;padding:4px 9px;border-radius:999px;border:1px solid var(--border);background:var(--surface, #fff);color:inherit;font:600 12.5px/1 inherit;cursor:pointer}
.mem-r[aria-pressed="true"]{border-color:var(--hp-primary);background:rgba(15,92,77,.09)}
.mem-msgs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:12.5px;line-height:1.35}
.mem-msgs li{padding:5px 8px;border-radius:8px;background:rgba(0,0,0,.035)}
.mem-msgs strong{font-weight:600;margin-right:4px}
.mem-form{display:flex;gap:6px}
.mem-form input{flex:1;min-width:0;min-height:34px;padding:4px 9px;border-radius:8px;border:1px solid var(--border);background:#fff;color:inherit;font:400 13px/1.2 inherit}
.mem-form button{min-height:34px;padding:0 11px;border-radius:8px;border:0;background:var(--hp-primary);color:#fff;font:600 12.5px/1 inherit;cursor:pointer}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.back{display:inline-flex;align-items:center;min-height:48px;color:var(--hp-primary);font-weight:600;text-decoration:none}
dialog.viewer{padding:0;border:0;width:100vw;max-width:100vw;max-height:100dvh;background:rgba(10,14,18,.96);color:#fff;margin:auto}
dialog.viewer::backdrop{background:rgba(0,0,0,.88)}
dialog.viewer .v-wrap{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:min(86dvh,720px);padding:56px 48px 64px}
dialog.viewer img{display:block;max-width:calc(100vw - 96px);max-height:74dvh;width:auto;height:auto;border-radius:10px;object-fit:contain}
dialog.viewer button{position:absolute;top:10px;right:10px;min-width:48px;min-height:48px;border-radius:999px;border:0;background:rgba(255,255,255,.94);color:#000;font:600 20px/1 inherit;cursor:pointer;z-index:2}
dialog.viewer .v-nav{position:absolute;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;font-size:26px;font-weight:700;text-decoration:none;cursor:pointer;user-select:none}
dialog.viewer .v-nav:hover{background:rgba(255,255,255,.28)}
dialog.viewer .v-prev{left:8px}
dialog.viewer .v-next{right:8px}
dialog.viewer .v-bar{position:absolute;left:16px;right:16px;bottom:14px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;font-size:14px;color:rgba(255,255,255,.9)}
dialog.viewer .v-cap{font-weight:600}
dialog.viewer .v-idx{font-size:12.5px;color:rgba(255,255,255,.68);font-variant-numeric:tabular-nums}
`;

/** The language chip reloads the page with the chosen language, as on the problem pages. */
export const MEMORIES_SCRIPT =
  "(function(){var m=document.querySelector('[data-testid=\"memories-page\"]'),api=m&&m.getAttribute('data-api')||'',tok=m&&m.getAttribute('data-token')||'',mode=m&&m.getAttribute('data-mode')||'api';var d=document.getElementById('hp-viewer');if(d&&d.showModal){var i=d.querySelector('img'),cap=d.querySelector('[data-cap]'),idx=d.querySelector('[data-idx]'),links=[].slice.call(document.querySelectorAll('[data-full]')),cur=0;function show(n){if(!links.length)return;cur=(n+links.length)%links.length;var a=links[cur],im=a.querySelector('img');i.src=a.getAttribute('href');i.alt=im?im.alt:'';if(cap)cap.textContent=a.getAttribute('data-caption')||'';if(idx)idx.textContent=(cur+1)+' / '+links.length}links.forEach(function(a,k){a.addEventListener('click',function(e){e.preventDefault();show(k);d.showModal()})});var prev=d.querySelector('[data-prev]'),next=d.querySelector('[data-next]');if(prev)prev.onclick=function(e){e.preventDefault();show(cur-1)};if(next)next.onclick=function(e){e.preventDefault();show(cur+1)};d.querySelector('button').onclick=function(){d.close()};d.addEventListener('click',function(e){if(e.target===d)d.close()});document.addEventListener('keydown',function(e){if(!d.open)return;if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='ArrowRight')show(cur+1)});d.addEventListener('close',function(){i.removeAttribute('src')})}document.querySelectorAll('[data-react]').forEach(function(b){b.onclick=function(){var mid=b.getAttribute('data-mid'),k=b.getAttribute('data-react');if(!mid||!k)return;if(mode==='mock'){var on=b.getAttribute('aria-pressed')==='true',c=b.querySelector('[data-count]'),n=parseInt(c&&c.textContent||'0',10)||0;n=on?Math.max(0,n-1):n+1;b.setAttribute('aria-pressed',on?'false':'true');if(c)c.textContent=n>0?String(n):'';return}b.disabled=true;fetch(api+'/v1/c/'+encodeURIComponent(tok)+'/memories/'+encodeURIComponent(mid)+'/reactions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reaction:k})}).then(function(r){return r.ok?r.json():null}).then(function(j){if(!j||!j.reactions)return;var mine=j.myReactions||[];document.querySelectorAll('[data-react][data-mid]').forEach(function(el){if(el.getAttribute('data-mid')!==mid)return;var rk=el.getAttribute('data-react'),cnt=j.reactions[rk]||0,sp=el.querySelector('[data-count]');el.setAttribute('aria-pressed',mine.indexOf(rk)>=0?'true':'false');if(sp)sp.textContent=cnt>0?String(cnt):''})}).finally(function(){b.disabled=false})}});document.querySelectorAll('[data-msg-form]').forEach(function(f){f.onsubmit=function(e){e.preventDefault();var mid=f.getAttribute('data-msg-form'),inp=f.querySelector('input'),btn=f.querySelector('button'),val=inp&&inp.value.trim()||'';if(!mid||!val)return;function append(who,txt){var ul=document.querySelector('[data-msgs=\"'+mid+'\"]');if(!ul)return;var li=document.createElement('li'),st=document.createElement('strong');st.textContent=who+':';li.appendChild(st);li.appendChild(document.createTextNode(' '+txt));ul.appendChild(li)}if(mode==='mock'){append(m&&m.getAttribute('data-you')||'Guest',val);if(inp)inp.value='';return}if(btn)btn.disabled=true;fetch(api+'/v1/c/'+encodeURIComponent(tok)+'/memories/'+encodeURIComponent(mid)+'/messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body:val})}).then(function(r){return r.ok?r.json():null}).then(function(j){if(!j||!j.body)return;append(j.authorName||'Guest',j.body);if(inp)inp.value=''}).finally(function(){if(btn)btn.disabled=false})}});document.querySelectorAll('[data-lang]').forEach(function(b){b.onclick=function(){document.cookie='NEXT_LOCALE='+b.getAttribute('data-lang')+'; path=/; max-age=31536000; samesite=lax';location.reload()}})})()";
const SCRIPT = `<script>${MEMORIES_SCRIPT}</script>`;

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
    ((id: string, size: MemoryPhotoSize) =>
      `${o.apiUrl}/v1/c/${enc}/memories/${encodeURIComponent(id)}/${size}`);
  // 320 px alone looked soft on 2-3× phone screens; the browser picks by screen density (the column
  // is the card width less its 20 px padding), and the 1280 px file is only for the full view.
  const srcset = (id: string) =>
    `${photo(id, 'thumb')} 320w, ${photo(id, 'medium')} 640w, ${photo(id, 'full')} 1280w`;
  const REACTION_META: Record<PositiveReaction, { emoji: string; label: string }> = {
    heart: { emoji: '❤️', label: locale === 'sw' ? 'Upendo' : 'Love' },
    clap: { emoji: '👏', label: locale === 'sw' ? 'Hongera' : 'Applause' },
    cheers: { emoji: '🥂', label: locale === 'sw' ? 'Sherehe' : 'Cheers' },
    sparkle: { emoji: '✨', label: locale === 'sw' ? 'Nzuri sana' : 'Wonderful' },
  };
  const msgPlaceholder = locale === 'sw' ? 'Andika pongezi fupi…' : 'Write a short wish…';
  const sendLabel = locale === 'sw' ? 'Tuma' : 'Send';
  const youLabel = view.card.guest?.displayName ?? (locale === 'sw' ? 'Mgeni' : 'Guest');
  const items = view.memories
    .map((x) => {
      const alt = x.caption ? formatIcu(t.photoAlt!, { caption: x.caption }) : t.photoAltNoCaption!;
      const when = x.takenOn
        ? `<time datetime="${esc(x.takenOn)}">${esc(formatDate(x.takenOn, locale))}</time>`
        : '';
      const caption = x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : '';
      const meta = when || caption ? `<div class="meta">${when}${caption}</div>` : '';
      const fullMeta = [x.takenOn ? formatDate(x.takenOn, locale) : '', x.caption ?? '']
        .filter(Boolean)
        .join(' · ');
      const reacts = POSITIVE_REACTIONS.map((key) => {
        const cnt = x.reactions?.[key] ?? 0;
        const pressed = x.myReactions?.includes(key) ? 'true' : 'false';
        const info = REACTION_META[key];
        return `<button type="button" class="mem-r" data-react="${key}" data-mid="${esc(x.id)}" aria-pressed="${pressed}"><span aria-hidden="true">${info.emoji}</span><span class="sr-only">${esc(info.label)} </span><span data-count>${cnt > 0 ? cnt : ''}</span></button>`;
      }).join('');
      const msgs = (x.messages ?? [])
        .map((m) => `<li><strong>${esc(m.authorName)}:</strong> ${esc(m.body)}</li>`)
        .join('');
      const actions = `<div class="mem-act"><div class="mem-reacts">${reacts}</div><ul class="mem-msgs" data-msgs="${esc(x.id)}">${msgs}</ul><form class="mem-form" data-msg-form="${esc(x.id)}"><input type="text" maxlength="140" required placeholder="${esc(msgPlaceholder)}" aria-label="${esc(msgPlaceholder)}"><button type="submit">${esc(sendLabel)}</button></form></div>`;
      return `<li><figure><a href="${esc(photo(x.id, 'full'))}" data-full data-caption="${esc(fullMeta)}"><img src="${esc(photo(x.id, 'medium'))}" srcset="${esc(srcset(x.id))}" sizes="${SIZES}" alt="${esc(alt)}" width="${x.width}" height="${x.height}" loading="lazy" decoding="async"></a>${meta}${actions}</figure></li>`;
    })
    .join('');
  const countLabel =
    locale === 'sw'
      ? `Picha ${view.memories.length}`
      : `${view.memories.length} ${view.memories.length === 1 ? 'photo' : 'photos'}`;
  const prevLabel = locale === 'sw' ? 'Iliyotangulia' : 'Previous';
  const nextLabel = locale === 'sw' ? 'Inayofuata' : 'Next';
  const body = `<main class="card mem" data-testid="memories-page" data-api="${esc(o.apiUrl)}" data-token="${esc(o.token)}" data-mode="${esc(o.mode)}" data-you="${esc(youLabel)}">
<header class="cover"><div><p class="eyebrow">${esc(t.title)}</p>
<h1 class="names">${esc(event.partnerA)}${event.partnerB ? ` <small>&amp;</small> ${esc(event.partnerB)}` : ''}</h1></div></header><div class="band" aria-hidden="true"></div>
<section class="mem-top"><a class="back" href="/c/${enc}">← ${esc(t.backToCard)}</a><span class="mem-count">${esc(countLabel)}</span></section>
<section><ol data-testid="memories-list">${items}</ol></section>
${trustStrip(view.card, locale, o.domain)}
<footer class="no-print">${langChip(locale)}${brandLogo(o.brand)}<p class="muted">${esc(o.domain)}</p></footer>
</main>
<dialog id="hp-viewer" class="viewer"><div class="v-wrap"><button type="button" aria-label="${esc(t.close)}">✕</button><a role="button" tabindex="0" class="v-nav v-prev" data-prev aria-label="${esc(prevLabel)}">‹</a><img alt=""><a role="button" tabindex="0" class="v-nav v-next" data-next aria-label="${esc(nextLabel)}">›</a><div class="v-bar"><span class="v-cap" data-cap></span><span class="v-idx" data-idx></span></div></div></dialog>`;
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
<script>${LANG_SCRIPT}</script>`,
  });
}
