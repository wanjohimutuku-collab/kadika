import type { CustomCardDesign } from '@harusi/schemas';
import { defaultCustomElements } from '@harusi/schemas';

export type OrnatePresetId =
  | 'floralCorner'
  | 'wildflowerArch'
  | 'mandalaArch'
  | 'marigoldGarland';

function toSvgDataUri(svg: string): string {
  // Works in both browser (btoa) and Node (Buffer) without escaping issues in CSS url(...)
  const encoded =
    typeof Buffer !== 'undefined'
      ? Buffer.from(svg, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

const FLORAL_CORNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="940" viewBox="0 0 640 940">
  <rect width="640" height="940" fill="#FAF7F0"/>
  <g transform="translate(-8,-8)">
    <path d="M 190 12 Q 245 35 285 8" stroke="#7A6D5D" stroke-width="1.6" fill="none"/>
    <path d="M 165 40 Q 210 68 232 108 Q 190 88 165 40 Z" fill="#8C747E" opacity="0.88"/>
    <path d="M 188 28 Q 240 48 265 82 Q 218 70 188 28 Z" fill="#A08992" opacity="0.82"/>
    <path d="M 55 185 Q 85 215 88 258 Q 52 232 55 185 Z" fill="#A43242"/>
    <path d="M 35 198 Q 58 242 46 286 Q 20 250 35 198 Z" fill="#C2515E" opacity="0.9"/>
    <path d="M 92 145 Q 130 155 152 178 Q 112 174 92 145 Z" fill="#7B7D5E"/>
    <circle cx="52" cy="34" r="34" fill="#E8BC5E"/>
    <circle cx="52" cy="34" r="20" fill="#F4D27E"/>
    <circle cx="52" cy="34" r="10" fill="#BD8228"/>
    <circle cx="175" cy="22" r="26" fill="#F3CBB4"/>
    <circle cx="175" cy="22" r="10" fill="#D48D72"/>
    <circle cx="116" cy="70" r="30" fill="#F8F1EA" stroke="#E4D2C4"/>
    <circle cx="50" cy="100" r="28" fill="#CE8E74"/>
    <circle cx="94" cy="118" r="18" fill="#A6382E"/>
    <circle cx="32" cy="162" r="30" fill="#F6D8C6" stroke="#E2B69E"/>
  </g>
  <g transform="translate(648,948) rotate(180)">
    <path d="M 190 12 Q 245 35 285 8" stroke="#7A6D5D" stroke-width="1.6" fill="none"/>
    <path d="M 165 40 Q 210 68 232 108 Q 190 88 165 40 Z" fill="#8C747E" opacity="0.88"/>
    <path d="M 188 28 Q 240 48 265 82 Q 218 70 188 28 Z" fill="#A08992" opacity="0.82"/>
    <path d="M 55 185 Q 85 215 88 258 Q 52 232 55 185 Z" fill="#A43242"/>
    <path d="M 35 198 Q 58 242 46 286 Q 20 250 35 198 Z" fill="#C2515E" opacity="0.9"/>
    <path d="M 92 145 Q 130 155 152 178 Q 112 174 92 145 Z" fill="#7B7D5E"/>
    <circle cx="52" cy="34" r="34" fill="#E8BC5E"/>
    <circle cx="52" cy="34" r="20" fill="#F4D27E"/>
    <circle cx="52" cy="34" r="10" fill="#BD8228"/>
    <circle cx="175" cy="22" r="26" fill="#F3CBB4"/>
    <circle cx="175" cy="22" r="10" fill="#D48D72"/>
    <circle cx="116" cy="70" r="30" fill="#F8F1EA" stroke="#E4D2C4"/>
    <circle cx="50" cy="100" r="28" fill="#CE8E74"/>
    <circle cx="94" cy="118" r="18" fill="#A6382E"/>
    <circle cx="32" cy="162" r="30" fill="#F6D8C6" stroke="#E2B69E"/>
  </g>
</svg>`;

const WILDFLOWER_ARCH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="940" viewBox="0 0 640 940">
  <rect width="640" height="940" fill="#F9F7F2"/>
  <g stroke="#B29456" stroke-width="1.8" fill="none">
    <path d="M 92 795 L 92 318 A 228 228 0 0 1 548 318 L 548 795 Z"/>
    <path d="M 120 767 L 120 318 A 200 200 0 0 1 520 318 L 520 767 Z"/>
  </g>
  <g stroke="#4E6F44" stroke-width="1.8" fill="none">
    <path d="M 90 780 Q 65 650 86 500 Q 105 360 88 230 Q 130 130 220 96"/>
    <path d="M 552 770 Q 575 630 554 480 Q 535 340 546 210 Q 510 120 430 98"/>
  </g>
  <circle cx="78" cy="340" r="22" fill="#9CB7DC" stroke="#7A99C4"/>
  <circle cx="562" cy="405" r="24" fill="#9CB7DC" stroke="#7A99C4"/>
  <circle cx="536" cy="605" r="22" fill="#9CB7DC" stroke="#7A99C4"/>
  <circle cx="500" cy="168" r="20" fill="#F3EFE6" stroke="#D6CFC2"/>
  <circle cx="64" cy="740" r="18" fill="#E8A9B2" stroke="#CF8692"/>
  <circle cx="432" cy="766" r="12" fill="#E8AC3C"/>
</svg>`;

const MANDALA_ARCH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="940" viewBox="0 0 640 940">
  <rect width="640" height="940" fill="#FCF9EE"/>
  <g stroke="#B89B5E" fill="none" opacity="0.65">
    <circle cx="320" cy="40" r="185" stroke-width="1.2"/>
    <circle cx="320" cy="40" r="158" stroke-width="1" stroke-dasharray="4 4"/>
    <circle cx="320" cy="40" r="130" stroke-width="1.4"/>
    <circle cx="60" cy="20" r="120" stroke-width="1"/>
    <circle cx="580" cy="20" r="120" stroke-width="1"/>
  </g>
  <path d="M 56 940 L 56 268 Q 56 218 112 214 L 166 210 Q 190 156 246 142 Q 290 130 320 92 Q 350 130 394 142 Q 450 156 474 210 L 528 214 Q 584 218 584 268 L 584 940 Z" fill="#FFFFFF" stroke="#A48642" stroke-width="3"/>
  <path d="M 76 940 L 76 276 Q 76 236 126 232 L 178 228 Q 200 176 252 162 Q 294 150 320 116 Q 346 150 388 162 Q 440 176 462 228 L 514 232 Q 564 236 564 276 L 564 940" fill="none" stroke="#C7AD6A" stroke-width="1.5"/>
</svg>`;

const MARIGOLD_GARLAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="940" viewBox="0 0 640 940">
  <rect width="640" height="940" fill="#FBF8F0"/>
  <path d="M 0 0 L 270 0 Q 210 55 150 40 Q 95 130 35 160 L 0 210 Z" fill="#3B7A28"/>
  <path d="M 640 0 L 370 0 Q 430 55 490 40 Q 545 130 605 160 L 640 210 Z" fill="#3B7A28"/>
  <path d="M 0 940 L 0 650 Q 50 720 65 820 L 140 940 Z" fill="#3B7A28"/>
  <path d="M 640 940 L 640 650 Q 590 720 575 820 L 500 940 Z" fill="#3B7A28"/>
  <path d="M 100 735 L 100 260 Q 100 222 140 212 Q 146 168 198 156 Q 216 116 266 106 Q 294 64 320 42 Q 346 64 374 106 Q 424 116 442 156 Q 494 168 500 212 Q 540 222 540 260 L 540 735" fill="none" stroke="#9E7B30" stroke-width="2.5"/>
  <path d="M 108 735 L 108 264 Q 108 230 146 220 Q 152 178 204 166 Q 222 126 270 116 Q 296 76 320 56 Q 344 76 370 116 Q 418 126 436 166 Q 488 178 494 220 Q 532 230 532 264 L 532 735" fill="none" stroke="#9E7B30" stroke-width="1.2"/>
  <circle cx="52" cy="110" r="14" fill="#EB6D14"/>
  <circle cx="52" cy="180" r="14" fill="#F6931E"/>
  <circle cx="52" cy="250" r="14" fill="#EB6D14"/>
  <circle cx="52" cy="320" r="14" fill="#F6931E"/>
  <circle cx="52" cy="390" r="14" fill="#EB6D14"/>
  <circle cx="588" cy="110" r="14" fill="#EB6D14"/>
  <circle cx="588" cy="180" r="14" fill="#F6931E"/>
  <circle cx="588" cy="250" r="14" fill="#EB6D14"/>
  <circle cx="588" cy="320" r="14" fill="#F6931E"/>
  <circle cx="588" cy="390" r="14" fill="#EB6D14"/>
</svg>`;

export function ornateStudioPreset(preset: OrnatePresetId): CustomCardDesign {
  const baseElements = defaultCustomElements();
  if (preset === 'floralCorner') {
    return {
      background: { type: 'image', imageUrl: toSvgDataUri(FLORAL_CORNER_SVG) },
      frame: { show: false, style: 'none' },
      textColor: '#3D3734',
      accentColor: '#A43242',
      elements: baseElements.map((el) => {
        if (el.type === 'names') return { ...el, fontFamily: 'script', fontSize: 54, y: 34, color: '#2B2624' };
        if (el.type === 'eyebrow') return { ...el, fontFamily: 'dmsans', y: 16, color: '#3D3734' };
        if (el.type === 'title') return { ...el, fontFamily: 'playfair', fontStyle: 'normal', fontSize: 22, y: 22 };
        if (el.type === 'guest') return { ...el, y: 29, color: '#6B625D' };
        if (el.type === 'date') return { ...el, y: 47, color: '#3D3734' };
        if (el.type === 'venue') return { ...el, y: 53 };
        if (el.type === 'message') return { ...el, y: 60 };
        if (el.type === 'qr') return { ...el, y: 71 };
        return el;
      }),
    };
  }
  if (preset === 'wildflowerArch') {
    return {
      background: { type: 'image', imageUrl: toSvgDataUri(WILDFLOWER_ARCH_SVG) },
      frame: { show: false, style: 'none' },
      textColor: '#33312E',
      accentColor: '#7E6D41',
      elements: baseElements.map((el) => {
        if (el.type === 'eyebrow') return { ...el, fontFamily: 'dmsans', fontSize: 11, y: 19, color: '#33312E' };
        if (el.type === 'guest') return { ...el, fontFamily: 'playfair', fontStyle: 'italic', y: 24, color: '#5E5A52' };
        if (el.type === 'names') return { ...el, fontFamily: 'playfair', fontSize: 32, y: 30, textTransform: 'uppercase', color: '#7E6D41' };
        if (el.type === 'title') return { ...el, fontFamily: 'dmsans', fontStyle: 'normal', fontSize: 12, y: 40 };
        if (el.type === 'date') return { ...el, fontFamily: 'playfair', fontSize: 18, y: 47, color: '#33312E' };
        if (el.type === 'venue') return { ...el, fontFamily: 'dmsans', fontSize: 11, y: 54 };
        if (el.type === 'qr') return { ...el, y: 65 };
        if (el.type === 'sender') return { ...el, y: 88, fontFamily: 'playfair', fontStyle: 'italic' };
        return el;
      }),
    };
  }
  if (preset === 'mandalaArch') {
    return {
      background: { type: 'image', imageUrl: toSvgDataUri(MANDALA_ARCH_SVG) },
      frame: { show: false, style: 'none' },
      textColor: '#3D3832',
      accentColor: '#A48642',
      elements: baseElements.map((el) => {
        if (el.type === 'eyebrow') return { ...el, fontFamily: 'dmsans', fontSize: 11, y: 20, color: '#9C8042' };
        if (el.type === 'title') return { ...el, fontFamily: 'playfair', fontWeight: 'bold', fontStyle: 'normal', fontSize: 22, y: 24, color: '#5E4923' };
        if (el.type === 'names') return { ...el, fontFamily: 'playfair', fontStyle: 'italic', fontSize: 30, y: 33, color: '#3D3832' };
        if (el.type === 'date') return { ...el, fontFamily: 'playfair', fontSize: 18, y: 46, color: '#3D3832' };
        if (el.type === 'guest') return { ...el, y: 52, color: '#5E4923' };
        if (el.type === 'venue') return { ...el, y: 58 };
        if (el.type === 'qr') return { ...el, y: 72 };
        return el;
      }),
    };
  }
  // marigoldGarland
  return {
    background: { type: 'image', imageUrl: toSvgDataUri(MARIGOLD_GARLAND_SVG) },
    frame: { show: false, style: 'none' },
    textColor: '#2B2118',
    accentColor: '#9E7B30',
    elements: baseElements.map((el) => {
      if (el.type === 'eyebrow') return { ...el, fontFamily: 'playfair', fontSize: 12, textTransform: 'none', letterSpacing: 0, y: 17, color: '#2B2118' };
      if (el.type === 'names') return { ...el, fontFamily: 'script', fontSize: 48, y: 25, color: '#5E1A22' };
      if (el.type === 'venue') return { ...el, fontFamily: 'playfair', fontSize: 14, y: 40, color: '#5E1A22' };
      if (el.type === 'date') return { ...el, fontFamily: 'playfair', fontSize: 14, y: 47, color: '#2B2118' };
      if (el.type === 'title') return { ...el, fontFamily: 'playfair', fontSize: 16, y: 54, color: '#5E1A22' };
      if (el.type === 'message') return { ...el, fontFamily: 'playfair', fontSize: 12, y: 61, color: '#5C4D3C' };
      if (el.type === 'qr') return { ...el, y: 74 };
      return el;
    }),
  };
}
