import type { CardFont } from '@harusi/schemas';

export interface FontOption {
  id: CardFont;
  label: string;
  cssFamily: string;
  sample: string;
  category: 'serif' | 'script' | 'sans' | 'mono';
}

export const STUDIO_FONTS: readonly FontOption[] = [
  {
    id: 'playfair',
    label: 'Playfair Display',
    cssFamily: '"Playfair Display", Georgia, serif',
    sample: 'Sherehe ya Harusi',
    category: 'serif',
  },
  {
    id: 'script',
    label: 'Mrs Saint Delafield',
    cssFamily: '"Mrs Saint Delafield", cursive',
    sample: 'Asha & Juma',
    category: 'script',
  },
  {
    id: 'dmsans',
    label: 'DM Sans',
    cssFamily: '"DM Sans", -apple-system, sans-serif',
    sample: 'Mlimani City Hall',
    category: 'sans',
  },
  {
    id: 'cinzel',
    label: 'Cinzel Decorative',
    cssFamily: 'Cinzel, "Playfair Display", Georgia, serif',
    sample: 'KARIBUNI WOTE',
    category: 'serif',
  },
  {
    id: 'cormorant',
    label: 'Cormorant Garamond',
    cssFamily: '"Cormorant Garamond", Garamond, serif',
    sample: 'Wapendwa Wageni',
    category: 'serif',
  },
  {
    id: 'greatvibes',
    label: 'Great Vibes',
    cssFamily: '"Great Vibes", "Mrs Saint Delafield", cursive',
    sample: 'Together Forever',
    category: 'script',
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    cssFamily: 'Montserrat, "DM Sans", sans-serif',
    sample: 'SAVE THE DATE',
    category: 'sans',
  },
  {
    id: 'mono',
    label: 'Monospace Ticket',
    cssFamily: 'ui-monospace, Menlo, Consolas, monospace',
    sample: 'KH-4826 · DOUBLE',
    category: 'mono',
  },
] as const;

export interface ColorPreset {
  id: string;
  nameSw: string;
  nameEn: string;
  hex: string;
}

export const LUXURY_BG_COLORS: readonly ColorPreset[] = [
  { id: 'ivory', nameSw: 'Krimu ya Pembe za Ndovu', nameEn: 'Warm Ivory', hex: '#FAF7F2' },
  { id: 'white', nameSw: 'Nyeupe Safi', nameEn: 'Pure Pearl', hex: '#FFFFFF' },
  { id: 'sand', nameSw: 'Mchanga wa Pwani', nameEn: 'Coastal Sand', hex: '#F4ECE1' },
  { id: 'blush', nameSw: 'Waridi Nyepesi', nameEn: 'Blush Rose', hex: '#F9F1F1' },
  { id: 'emerald', nameSw: 'Zumaridi ya Kifalme', nameEn: 'Royal Emerald', hex: '#0B2E1A' },
  { id: 'obsidian', nameSw: 'Nyeusi ya Kifahari', nameEn: 'Obsidian Black', hex: '#121413' },
  { id: 'navy', nameSw: 'Bluu ya Bahari Kuu', nameEn: 'Midnight Navy', hex: '#0E1B2E' },
  { id: 'burgundy', nameSw: 'Zambarau Nzito', nameEn: 'Deep Burgundy', hex: '#3B121C' },
  { id: 'terracotta', nameSw: 'Udongo Mwekundu', nameEn: 'Terracotta', hex: '#4A2318' },
] as const;

export interface GradientPreset {
  id: string;
  nameSw: string;
  nameEn: string;
  value: string;
  preview: string;
}

export const LUXURY_GRADIENTS: readonly GradientPreset[] = [
  {
    id: 'sunset',
    nameSw: 'Machweo ya Dhahabu',
    nameEn: 'Sunset Gold',
    value: 'linear-gradient(135deg, #7A3E2B 0%, #C2703D 50%, #E8B66B 100%)',
    preview: '#C2703D',
  },
  {
    id: 'emerald',
    nameSw: 'Msitu wa Zumaridi',
    nameEn: 'Emerald Forest',
    value: 'linear-gradient(135deg, #0B2E1A 0%, #165B33 50%, #2E8B57 100%)',
    preview: '#165B33',
  },
  {
    id: 'royal',
    nameSw: 'Zambarau ya Kifalme',
    nameEn: 'Royal Velvet',
    value: 'linear-gradient(135deg, #1C1938 0%, #3B2A5A 50%, #6B4E8C 100%)',
    preview: '#3B2A5A',
  },
  {
    id: 'midnight',
    nameSw: 'Giza la Manane',
    nameEn: 'Midnight Silk',
    value: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
    preview: '#1E293B',
  },
  {
    id: 'rose',
    nameSw: 'Waridi na Shampeni',
    nameEn: 'Rose Champagne',
    value: 'linear-gradient(135deg, #4A1D2F 0%, #8B3A5A 50%, #D49BAE 100%)',
    preview: '#8B3A5A',
  },
  {
    id: 'gold',
    nameSw: 'Mng’ao wa Dhahabu',
    nameEn: 'Golden Amber',
    value: 'linear-gradient(135deg, #2D2316 0%, #5C4524 50%, #C5A059 100%)',
    preview: '#C5A059',
  },
] as const;

export const ACCENT_SWATCHES = [
  '#E8B66B', // Gold
  '#C5A059', // Classic Brass
  '#059669', // Emerald
  '#DC2626', // Crimson
  '#D97706', // Amber
  '#2563EB', // Sapphire
  '#9333EA', // Purple
  '#DB2777', // Rose
  '#FFFFFF', // White
  '#1C1917', // Dark Ink
] as const;

export interface DecorativeSticker {
  id: string;
  nameSw: string;
  nameEn: string;
  svgDataUri: string;
}

export const DECORATIVE_STICKERS: readonly DecorativeSticker[] = [
  {
    id: 'rings',
    nameSw: 'Pete za Harusi',
    nameEn: 'Wedding Rings',
    svgDataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23E8B66B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="12" r="6"/><circle cx="16" cy="12" r="6"/></svg>',
  },
  {
    id: 'heart',
    nameSw: 'Moyo wa Kifalme',
    nameEn: 'Royal Heart',
    svgDataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="%23E8B66B" stroke="%23E8B66B" stroke-width="1"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  },
  {
    id: 'laurel',
    nameSw: 'Taji ya Majani',
    nameEn: 'Laurel Garland',
    svgDataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23E8B66B" stroke-width="1.6"><path d="M12 2C8 6 8 18 12 22"/><path d="M12 2C16 6 16 18 12 22"/><circle cx="12" cy="12" r="2" fill="%23E8B66B"/></svg>',
  },
  {
    id: 'diamond',
    nameSw: 'Almasi ya Sherehe',
    nameEn: 'Celebration Diamond',
    svgDataUri:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="%23E8B66B" stroke="%23E8B66B" stroke-width="1"><polygon points="6 3 18 3 22 9 12 22 2 9"/></svg>',
  },
] as const;

export interface StudioEventData {
  partnerA: string;
  partnerB?: string | null;
  coupleNames: string;
  eventKind?: string | null;
  dateStart: string;
  venueName: string;
  dressCode?: string;
  senderName?: string;
  committeePhone?: string;
  guestName?: string;
  shortCode?: string;
  domain?: string;
  themeId?: string;
}

