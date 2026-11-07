import type { CardView } from '@harusi/api-client';
import type { ThemeId } from '@harusi/ui-tokens/themes';
import { resolvePalette } from '@harusi/ui-tokens/palette';
import { renderCard, shell } from '@/lib/light-card/render';

/**
 * Chunk-split so the heavy `renderCard + shell + resolvePalette` tree is only pulled when a
 * visitor actually clicks the hero's Download button — the home page's LCP budget (§10) can't
 * afford to bundle this at the entry point.
 */

const CARD_PNG_WIDTH = 1080;
const CARD_PNG_HEIGHT = 1920;

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/**
 * Build the exact `/jaribu` document for a view, then hand it to the browser as an SVG download
 * that carries the complete card template. SVG (not PNG) because Chrome taints any canvas that
 * drew foreignObject content, and the SVG is the truest representation anyway: vector, inline
 * CSS, inline QR, every element of the real `renderCard + shell` output.
 */
export async function renderDemoCardToSvg(opts: {
  view: CardView;
  locale: 'sw' | 'en';
  themeId: ThemeId;
  filename: string;
}): Promise<void> {
  const { view, locale, filename } = opts;
  const palette = resolvePalette(view.event?.themeId, view.event?.palette);
  const inner = renderCard(view, {
    token: 'demo',
    locale,
    domain: 'kadisasa.co.tz',
    mode: 'mock',
    apiUrl: 'https://kadisasa.co.tz',
  });
  const doc = shell({ locale, title: 'Kadi', palette, body: inner });

  // Pull the inlined <style> and the sanitised body out of the document so we can drop them
  // inside an <svg><foreignObject>...</foreignObject></svg> wrapper. Scripts are removed because
  // foreignObject needs XHTML-well-formed content and the card's CLIENT_SCRIPT uses raw `<` / `&`.
  const parsed = new DOMParser().parseFromString(doc, 'text/html');
  const styleBlocks = Array.from(parsed.head.querySelectorAll('style'))
    .map((s) => s.textContent ?? '')
    .join('\n');
  parsed.body.querySelectorAll('script').forEach((n) => n.remove());
  const serializer = new XMLSerializer();
  const bodyXml = Array.from(parsed.body.childNodes)
    .map((n) => serializer.serializeToString(n))
    .join('');
  const styleCdata = `/*<![CDATA[*/${styleBlocks}/*]]>*/`;
  const bgColor = escapeHtml(palette.bg);
  const w = CARD_PNG_WIDTH;
  const h = CARD_PNG_HEIGHT;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;background:${bgColor};font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;align-items:flex-start;justify-content:center;overflow:hidden">` +
    `<style>${styleCdata}</style>` +
    `<div style="width:640px;transform:scale(1.25);transform-origin:top center">${bodyXml}</div>` +
    `</div></foreignObject></svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Delay revoke so the browser can finish fetching the blob for download.
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
