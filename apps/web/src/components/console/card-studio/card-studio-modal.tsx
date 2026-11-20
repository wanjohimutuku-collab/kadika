'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Dialog } from 'radix-ui';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Italic,
  Move,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import type {
  CardFont,
  CustomCardDesign,
  CustomCardFrame,
  CustomElement,
} from '@harusi/schemas';
import { defaultCustomElements, pick } from '@harusi/schemas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { canonicalFont } from '@/lib/card-image/custom-layout';
import { CardCanvasView } from './card-canvas-view';
import {
  ACCENT_SWATCHES,
  DECORATIVE_STICKERS,
  LUXURY_BG_COLORS,
  LUXURY_GRADIENTS,
  STUDIO_FONTS,
  type StudioEventData,
} from './types';

export interface CardStudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDesign?: CustomCardDesign;
  onSave: (design: CustomCardDesign) => void;
  event: StudioEventData;
  locale: 'sw' | 'en';
}

async function compressImageFile(file: File, maxDim = 960): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  // Keep small files or SVGs untouched.
  if (file.type === 'image/svg+xml' || dataUrl.length <= 220_000) return dataUrl;
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function createDefaultDesign(): CustomCardDesign {
  return {
    background: {
      type: 'color',
      color: '#FAF7F2',
    },
    frame: {
      show: true,
      style: 'double',
      color: '#E8B66B',
      width: 2,
      inset: 24,
    },
    textColor: '#1C1917',
    accentColor: '#E8B66B',
    elements: defaultCustomElements(),
  };
}

export function CardStudioModal({
  open,
  onOpenChange,
  initialDesign,
  onSave,
  event,
  locale,
}: CardStudioModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const [design, setDesign] = useState<CustomCardDesign>(() => {
    if (initialDesign && initialDesign.elements && initialDesign.elements.length > 0) {
      return JSON.parse(JSON.stringify(initialDesign));
    }
    return createDefaultDesign();
  });

  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'elements' | 'background' | 'frame' | 'presets'>('elements');
  const [bgTab, setBgTab] = useState<'color' | 'gradient' | 'image'>(
    design.background?.type || 'color',
  );

  const elements = design.elements ?? [];
  const activeElement = elements.find((el) => el.id === activeElementId) ?? null;

  // Helpers to mutate design
  const updateElement = (id: string, patch: Partial<CustomElement>) => {
    setDesign((prev) => ({
      ...prev,
      elements: (prev.elements ?? []).map((el) => (el.id === id ? { ...el, ...patch } : el)),
    }));
  };

  const deleteElement = (id: string) => {
    setDesign((prev) => ({
      ...prev,
      elements: (prev.elements ?? []).filter((el) => el.id !== id),
    }));
    if (activeElementId === id) {
      setActiveElementId(null);
    }
  };

  const addFreeText = () => {
    const id = `text-${Date.now().toString(36)}`;
    const newElem: CustomElement = {
      id,
      type: 'freeText',
      x: 50,
      y: 52,
      fontSize: 18,
      fontFamily: 'dmsans',
      color: design.textColor || '#1C1917',
      fontWeight: 'normal',
      textAlign: 'center',
      content: { [locale]: locale === 'sw' ? 'Maandishi Mapya' : 'Custom Note' },
      visible: true,
    };
    setDesign((prev) => ({
      ...prev,
      elements: [...(prev.elements ?? []), newElem],
    }));
    setActiveElementId(id);
    setActiveTab('elements');
  };

  const handleUploadImageFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await compressImageFile(file);
    const id = `img-${Date.now().toString(36)}`;
    const newElem: CustomElement = {
      id,
      type: 'image',
      x: 50,
      y: 45,
      width: 25,
      height: 25,
      imageUrl: result,
      borderRadius: 8,
      opacity: 100,
      visible: true,
    };
    setDesign((prev) => ({
      ...prev,
      elements: [...(prev.elements ?? []), newElem],
    }));
    setActiveElementId(id);
    setActiveTab('elements');
  };

  const addSticker = (stickerUri: string) => {
    const id = `sticker-${Date.now().toString(36)}`;
    const newElem: CustomElement = {
      id,
      type: 'image',
      x: 50,
      y: 40,
      width: 18,
      height: 18,
      imageUrl: stickerUri,
      borderRadius: 0,
      opacity: 100,
      visible: true,
    };
    setDesign((prev) => ({
      ...prev,
      elements: [...(prev.elements ?? []), newElem],
    }));
    setActiveElementId(id);
  };

  const handleUploadBgFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = await compressImageFile(file);
    setDesign((prev) => ({
      ...prev,
      background: {
        type: 'image',
        imageUrl: result,
        overlayOpacity: prev.background?.overlayOpacity ?? 35,
      },
    }));
    setBgTab('image');
  };

  const moveElementOrder = (id: string, direction: 'up' | 'down') => {
    setDesign((prev) => {
      const currentList = prev.elements ?? [];
      const idx = currentList.findIndex((e) => e.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= currentList.length) return prev;
      const copy = [...currentList];
      const [item] = copy.splice(idx, 1);
      if (!item) return prev;
      copy.splice(targetIdx, 0, item);
      return { ...prev, elements: copy };
    });
  };

  const resetToDefault = () => {
    if (
      window.confirm(
        locale === 'sw'
          ? 'Je, una uhakika unataka kurudisha kadi kwenye muundo wa kawaida?'
          : 'Are you sure you want to reset the card to the default layout?',
      )
    ) {
      setDesign(createDefaultDesign());
      setActiveElementId(null);
    }
  };

  // Presets loader
  const applyPreset = (
    presetName:
      | 'classicGold'
      | 'royalEmerald'
      | 'modernClean'
      | 'roseRomantic'
      | 'botanicalSage'
      | 'midnightLuxury',
  ) => {
    if (presetName === 'classicGold') {
      setDesign({
        background: { type: 'color', color: '#FAF7F2' },
        frame: { show: true, style: 'double', color: '#E8B66B', width: 2, inset: 24 },
        textColor: '#1C1917',
        accentColor: '#E8B66B',
        elements: defaultCustomElements(),
      });
    } else if (presetName === 'royalEmerald') {
      setDesign({
        background: {
          type: 'gradient',
          gradient: 'linear-gradient(135deg, #0B2E1A 0%, #165B33 50%, #2E8B57 100%)',
        },
        frame: { show: true, style: 'single', color: '#E8B66B', width: 2, inset: 20 },
        textColor: '#FFFFFF',
        accentColor: '#E8B66B',
        elements: defaultCustomElements().map((el) => ({
          ...el,
          color: el.type === 'divider' ? '#E8B66B' : '#FFFFFF',
        })),
      });
    } else if (presetName === 'modernClean') {
      setDesign({
        background: { type: 'color', color: '#FFFFFF' },
        frame: { show: false, style: 'none' },
        textColor: '#0F172A',
        accentColor: '#2563EB',
        elements: defaultCustomElements().map((el) => ({
          ...el,
          fontFamily: el.type === 'names' ? 'cinzel' : 'dmsans',
          color: '#0F172A',
        })),
      });
    } else if (presetName === 'roseRomantic') {
      setDesign({
        background: {
          type: 'gradient',
          gradient: 'linear-gradient(135deg, #4A1D2F 0%, #8B3A5A 50%, #D49BAE 100%)',
        },
        frame: { show: true, style: 'dashed', color: '#F9F1F1', width: 2, inset: 24 },
        textColor: '#FFFFFF',
        accentColor: '#F9F1F1',
        elements: defaultCustomElements().map((el) => ({
          ...el,
          fontFamily: el.type === 'names' ? 'greatvibes' : 'cormorant',
          color: '#FFFFFF',
        })),
      });
    } else if (presetName === 'botanicalSage') {
      setDesign({
        background: { type: 'color', color: '#F4F7F4' },
        frame: { show: true, style: 'double', color: '#2D5A3D', width: 2, inset: 24 },
        textColor: '#1A3323',
        accentColor: '#2D5A3D',
        elements: defaultCustomElements().map((el) => ({
          ...el,
          fontFamily: el.type === 'names' ? 'cormorant' : el.type === 'eyebrow' ? 'dmsans' : 'playfair',
          color: el.type === 'divider' ? '#2D5A3D' : '#1A3323',
        })),
      });
    } else if (presetName === 'midnightLuxury') {
      setDesign({
        background: {
          type: 'gradient',
          gradient: 'linear-gradient(135deg, #0A1128 0%, #101F42 50%, #1C2541 100%)',
        },
        frame: { show: true, style: 'double', color: '#D4AF37', width: 2, inset: 24 },
        textColor: '#FAF7F2',
        accentColor: '#D4AF37',
        elements: defaultCustomElements().map((el) => ({
          ...el,
          color: el.type === 'divider' ? '#D4AF37' : '#FAF7F2',
        })),
      });
    }
  };

  const handleSave = () => {
    onSave(design);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fade-in fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl md:inset-6 lg:inset-8">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-semibold md:text-lg">
                  {locale === 'sw' ? 'Studio ya Kubuni Kadi' : 'Card Design Studio'}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted md:text-sm">
                  {locale === 'sw'
                    ? 'Sogeza vitu kwa kuburuta, badili fonti, weka picha au rekebisha mandhari'
                    : 'Drag elements freely, customize fonts, upload images and style backgrounds'}
                </Dialog.Description>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={resetToDefault}
                title={locale === 'sw' ? 'Rudisha mwanzo' : 'Reset layout'}
              >
                <RotateCcw className="mr-1.5 size-4" />
                <span className="hidden sm:inline">
                  {locale === 'sw' ? 'Rudisha' : 'Reset'}
                </span>
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-primary text-on-primary hover:bg-primary/90"
              >
                <Check className="mr-1.5 size-4" />
                {locale === 'sw' ? 'Hifadhi kwenye Kadi' : 'Save & Apply'}
              </Button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full p-2 text-muted hover:bg-ink/6 hover:text-ink"
                  aria-label={locale === 'sw' ? 'Funga' : 'Close'}
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Main workspace layout: Toolbar / Panels + Canvas */}
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[380px_1fr]">
            {/* Sidebar / Controls Panel */}
            <div className="flex flex-col border-b border-border bg-surface-raised lg:border-r lg:border-b-0">
              {/* Tabs */}
              <div className="flex border-b border-border px-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('elements')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-medium transition-colors md:text-sm',
                    activeTab === 'elements'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  <Type className="size-4" />
                  {locale === 'sw' ? 'Maandishi' : 'Elements'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('background')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-medium transition-colors md:text-sm',
                    activeTab === 'background'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  <Palette className="size-4" />
                  {locale === 'sw' ? 'Mandhari' : 'Background'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('frame')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-medium transition-colors md:text-sm',
                    activeTab === 'frame'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  <Square className="size-4" />
                  {locale === 'sw' ? 'Fremu' : 'Frame'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-medium transition-colors md:text-sm',
                    activeTab === 'presets'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  <Sparkles className="size-4" />
                  {locale === 'sw' ? 'Violezo vya Kadi' : 'Card Templates'}
                </button>
              </div>

              {/* Tab Contents with Scroll */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {/* 1. ELEMENTS TAB */}
                {activeTab === 'elements' && (
                  <div className="flex flex-col gap-5">
                    {/* Actions: Add Text & Add Image */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={addFreeText}
                        className="w-full"
                      >
                        <Plus className="mr-1.5 size-4 text-primary" />
                        {locale === 'sw' ? '+ Maandishi' : '+ Free Text'}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <ImageIcon className="mr-1.5 size-4 text-primary" />
                        {locale === 'sw' ? '+ Weka Picha' : '+ Add Image'}
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="sr-only"
                        onChange={handleUploadImageFile}
                      />
                    </div>

                    {/* Quick Stickers */}
                    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
                      <span className="text-xs font-semibold text-muted">
                        {locale === 'sw' ? 'Nembo na Nakshi za Harusi' : 'Wedding Stickers & Icons'}
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {DECORATIVE_STICKERS.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => addSticker(st.svgDataUri)}
                            className="flex flex-col items-center justify-center rounded-lg border border-border p-2 hover:border-primary hover:bg-primary/5 transition-all"
                            title={locale === 'sw' ? st.nameSw : st.nameEn}
                          >
                            <img src={st.svgDataUri} alt="" className="size-6 object-contain" />
                            <span className="mt-1 text-[10px] text-muted truncate max-w-full">
                              {locale === 'sw' ? st.nameSw : st.nameEn}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Element Inspector */}
                    {activeElement ? (
                      <div className="flex flex-col gap-3 rounded-xl border-2 border-primary/30 bg-surface p-3.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">
                            {locale === 'sw'
                              ? `Uhariri: ${activeElement.type}`
                              : `Edit: ${activeElement.type}`}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveElementOrder(activeElement.id, 'down')}
                              className="rounded p-1 text-muted hover:bg-ink/6 hover:text-ink"
                              title={locale === 'sw' ? 'Sogeza nyuma' : 'Send backward'}
                            >
                              <ChevronDown className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveElementOrder(activeElement.id, 'up')}
                              className="rounded p-1 text-muted hover:bg-ink/6 hover:text-ink"
                              title={locale === 'sw' ? 'Sogeza mbele' : 'Bring forward'}
                            >
                              <ChevronUp className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateElement(activeElement.id, {
                                  visible: activeElement.visible === false,
                                })
                              }
                              className="rounded p-1 text-muted hover:bg-ink/6 hover:text-ink"
                              title={activeElement.visible === false ? 'Show' : 'Hide'}
                            >
                              {activeElement.visible === false ? (
                                <EyeOff className="size-4 text-warning" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteElement(activeElement.id)}
                              className="rounded p-1 text-danger hover:bg-danger/10"
                              title={locale === 'sw' ? 'Futa' : 'Delete'}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        {/* Content editor for freeText or override */}
                        {(activeElement.type === 'freeText' ||
                          activeElement.type === 'title' ||
                          activeElement.type === 'message' ||
                          activeElement.type === 'footer') && (
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted">
                              {locale === 'sw' ? 'Maneno' : 'Text Content'}
                            </label>
                            <input
                              type="text"
                              value={pick(activeElement.content, locale) ?? ''}
                              onChange={(e) =>
                                updateElement(activeElement.id, {
                                  content: {
                                    ...(typeof activeElement.content === 'object'
                                      ? activeElement.content
                                      : {}),
                                    [locale]: e.target.value,
                                  },
                                })
                              }
                              placeholder={
                                locale === 'sw' ? 'Andika maneno hapa...' : 'Type text here...'
                              }
                              className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        )}

                        {/* Font options (for text elements) */}
                        {activeElement.type !== 'image' && activeElement.type !== 'divider' && (
                          <>
                            {/* Font Family */}
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium text-muted">
                                {locale === 'sw' ? 'Fonti' : 'Font Family'}
                              </label>
                              <select
                                value={canonicalFont(activeElement.fontFamily)}
                                onChange={(e) =>
                                  updateElement(activeElement.id, {
                                    fontFamily: e.target.value as CardFont,
                                  })
                                }
                                className="h-9 w-full rounded-lg border border-border bg-surface px-2.5 text-sm focus:border-primary focus:outline-none"
                              >
                                {STUDIO_FONTS.filter((f) =>
                                  ['playfair', 'script', 'dmsans', 'mono'].includes(f.id),
                                ).map((font) => (
                                  <option key={font.id} value={font.id}>
                                    {font.label} ({font.category})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Font Size & Weight & Style */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-muted">
                                  {locale === 'sw' ? 'Ukubwa' : 'Size'} ({activeElement.fontSize ?? 16}px)
                                </label>
                                <input
                                  type="range"
                                  min={10}
                                  max={56}
                                  value={activeElement.fontSize ?? 16}
                                  onChange={(e) =>
                                    updateElement(activeElement.id, {
                                      fontSize: Number(e.target.value),
                                    })
                                  }
                                  className="h-2 w-full cursor-pointer accent-primary"
                                />
                              </div>

                              <div className="flex items-end justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateElement(activeElement.id, {
                                      fontWeight:
                                        activeElement.fontWeight === 'bold' ? 'normal' : 'bold',
                                    })
                                  }
                                  className={cn(
                                    'flex size-9 items-center justify-center rounded-lg border text-sm transition-colors',
                                    activeElement.fontWeight === 'bold'
                                      ? 'border-primary bg-primary/10 text-primary font-bold'
                                      : 'border-border text-muted hover:text-ink',
                                  )}
                                  title="Bold"
                                >
                                  <Bold className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateElement(activeElement.id, {
                                      fontStyle:
                                        activeElement.fontStyle === 'italic'
                                          ? 'normal'
                                          : 'italic',
                                    })
                                  }
                                  className={cn(
                                    'flex size-9 items-center justify-center rounded-lg border text-sm transition-colors',
                                    activeElement.fontStyle === 'italic'
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border text-muted hover:text-ink',
                                  )}
                                  title="Italic"
                                >
                                  <Italic className="size-4" />
                                </button>
                              </div>
                            </div>

                            {/* Alignment */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-muted">
                                {locale === 'sw' ? 'Mpangilio' : 'Alignment'}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateElement(activeElement.id, { textAlign: 'left' })}
                                  className={cn(
                                    'rounded-lg border p-1.5 transition-colors',
                                    activeElement.textAlign === 'left'
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border text-muted',
                                  )}
                                >
                                  <AlignLeft className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateElement(activeElement.id, { textAlign: 'center' })}
                                  className={cn(
                                    'rounded-lg border p-1.5 transition-colors',
                                    activeElement.textAlign === 'center' || !activeElement.textAlign
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border text-muted',
                                  )}
                                >
                                  <AlignCenter className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateElement(activeElement.id, { textAlign: 'right' })}
                                  className={cn(
                                    'rounded-lg border p-1.5 transition-colors',
                                    activeElement.textAlign === 'right'
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border text-muted',
                                  )}
                                >
                                  <AlignRight className="size-4" />
                                </button>
                              </div>
                            </div>

                            {/* Text Color */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted">
                                  {locale === 'sw' ? 'Rangi ya Maandishi' : 'Text Color'}
                                </span>
                                <input
                                  type="color"
                                  value={activeElement.color ?? design.textColor ?? '#1C1917'}
                                  onChange={(e) =>
                                    updateElement(activeElement.id, { color: e.target.value })
                                  }
                                  className="size-7 cursor-pointer rounded border border-border"
                                />
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {ACCENT_SWATCHES.map((hex) => (
                                  <button
                                    key={hex}
                                    type="button"
                                    onClick={() => updateElement(activeElement.id, { color: hex })}
                                    className="size-5 rounded-full border border-black/20 transition-transform hover:scale-110"
                                    style={{ backgroundColor: hex }}
                                    title={hex}
                                  />
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Image inspector */}
                        {activeElement.type === 'image' && (
                          <div className="flex flex-col gap-3">
                            {/* Width / Height in % */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-muted">
                                  {locale === 'sw' ? 'Upana' : 'Width'} ({activeElement.width ?? 25}%)
                                </label>
                                <input
                                  type="range"
                                  min={5}
                                  max={80}
                                  value={activeElement.width ?? 25}
                                  onChange={(e) =>
                                    updateElement(activeElement.id, {
                                      width: Number(e.target.value),
                                    })
                                  }
                                  className="h-2 w-full cursor-pointer accent-primary"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-muted">
                                  {locale === 'sw' ? 'Urefu' : 'Height'} ({activeElement.height ?? 25}%)
                                </label>
                                <input
                                  type="range"
                                  min={5}
                                  max={80}
                                  value={activeElement.height ?? 25}
                                  onChange={(e) =>
                                    updateElement(activeElement.id, {
                                      height: Number(e.target.value),
                                    })
                                  }
                                  className="h-2 w-full cursor-pointer accent-primary"
                                />
                              </div>
                            </div>

                            {/* Corner Radius */}
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-muted">
                                {locale === 'sw' ? 'Mviringo wa Pembe' : 'Corner Radius'} (
                                {activeElement.borderRadius ?? 0}%)
                              </label>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[0, 10, 20, 50].map((radius) => (
                                  <button
                                    key={radius}
                                    type="button"
                                    onClick={() =>
                                      updateElement(activeElement.id, { borderRadius: radius })
                                    }
                                    className={cn(
                                      'rounded border py-1 text-xs transition-colors',
                                      (activeElement.borderRadius ?? 0) === radius
                                        ? 'border-primary bg-primary/10 text-primary font-medium'
                                        : 'border-border text-muted hover:text-ink',
                                    )}
                                  >
                                    {radius === 50 ? '⚪' : `${radius}%`}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Opacity */}
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-muted">
                                {locale === 'sw' ? 'Mwangaza (Opacity)' : 'Opacity'} (
                                {activeElement.opacity ?? 100}%)
                              </label>
                              <input
                                type="range"
                                min={10}
                                max={100}
                                step={5}
                                value={activeElement.opacity ?? 100}
                                onChange={(e) =>
                                  updateElement(activeElement.id, {
                                    opacity: Number(e.target.value),
                                  })
                                }
                                className="h-2 w-full cursor-pointer accent-primary"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted text-center py-2 italic">
                        {locale === 'sw'
                          ? 'Bofya kipengele chochote kwenye kadi kukihariri au kukiburuta.'
                          : 'Click any element on the card to edit its font, colors, or drag its position.'}
                      </p>
                    )}

                    {/* Layers List */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                        {locale === 'sw' ? 'Mpangilio wa Vipengele (Layers)' : 'Layers & Elements'}
                      </span>
                      <div className="flex flex-col gap-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface p-1">
                        {elements.map((el) => {
                          const isSelected = el.id === activeElementId;
                          const labelText = pick(el.content, locale);
                          return (
                            <div
                              key={el.id}
                              onClick={() => setActiveElementId(el.id)}
                              className={cn(
                                'flex items-center justify-between rounded px-2.5 py-1.5 text-xs cursor-pointer transition-colors',
                                isSelected
                                  ? 'bg-primary/10 font-semibold text-primary'
                                  : 'hover:bg-ink/4 text-ink',
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Move className="size-3 text-muted shrink-0" />
                                <span className="capitalize truncate">
                                  {labelText ? `"${labelText}"` : el.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {el.visible === false && (
                                  <EyeOff className="size-3 text-muted" />
                                )}
                                <span className="text-[10px] text-muted">
                                  {Math.round(el.x)}%, {Math.round(el.y)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. BACKGROUND TAB */}
                {activeTab === 'background' && (
                  <div className="flex flex-col gap-5">
                    {/* Background Type Sub-tabs */}
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1 border border-border">
                      <button
                        type="button"
                        onClick={() => {
                          setBgTab('color');
                          setDesign((prev) => ({
                            ...prev,
                            background: {
                              type: 'color',
                              color: prev.background?.color || '#FAF7F2',
                            },
                          }));
                        }}
                        className={cn(
                          'rounded-lg py-1.5 text-xs font-medium transition-colors',
                          bgTab === 'color'
                            ? 'bg-primary text-on-primary'
                            : 'text-muted hover:text-ink',
                        )}
                      >
                        {locale === 'sw' ? 'Rangi Moja' : 'Solid Color'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBgTab('gradient');
                          setDesign((prev) => ({
                            ...prev,
                            background: {
                              type: 'gradient',
                              gradient:
                                prev.background?.gradient ||
                                LUXURY_GRADIENTS[0]?.value ||
                                'linear-gradient(135deg, #7A3E2B 0%, #C2703D 50%, #E8B66B 100%)',
                            },
                          }));
                        }}
                        className={cn(
                          'rounded-lg py-1.5 text-xs font-medium transition-colors',
                          bgTab === 'gradient'
                            ? 'bg-primary text-on-primary'
                            : 'text-muted hover:text-ink',
                        )}
                      >
                        {locale === 'sw' ? 'Mseto (Gradient)' : 'Gradient'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBgTab('image');
                          setDesign((prev) => ({
                            ...prev,
                            background: {
                              type: 'image',
                              imageUrl: prev.background?.imageUrl || '',
                              overlayOpacity: prev.background?.overlayOpacity ?? 35,
                            },
                          }));
                        }}
                        className={cn(
                          'rounded-lg py-1.5 text-xs font-medium transition-colors',
                          bgTab === 'image'
                            ? 'bg-primary text-on-primary'
                            : 'text-muted hover:text-ink',
                        )}
                      >
                        {locale === 'sw' ? 'Picha' : 'Photo'}
                      </button>
                    </div>

                    {/* Color Sub-tab */}
                    {bgTab === 'color' && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
                          <span className="text-xs font-semibold text-muted">
                            {locale === 'sw' ? 'Chagua Rangi Maalum' : 'Pick Custom Color'}
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={design.background?.color || '#FAF7F2'}
                              onChange={(e) =>
                                setDesign((prev) => ({
                                  ...prev,
                                  background: { type: 'color', color: e.target.value },
                                }))
                              }
                              className="h-8 w-24 rounded border border-border px-2 text-xs font-mono uppercase"
                            />
                            <input
                              type="color"
                              value={design.background?.color || '#FAF7F2'}
                              onChange={(e) =>
                                setDesign((prev) => ({
                                  ...prev,
                                  background: { type: 'color', color: e.target.value },
                                }))
                              }
                              className="size-8 cursor-pointer rounded border border-border"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-semibold text-muted">
                            {locale === 'sw' ? 'Rangi za Kifahari za Harusi' : 'Luxury Wedding Colors'}
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            {LUXURY_BG_COLORS.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() =>
                                  setDesign((prev) => ({
                                    ...prev,
                                    background: { type: 'color', color: c.hex },
                                  }))
                                }
                                className={cn(
                                  'flex items-center gap-2 rounded-lg border p-2 text-left transition-all',
                                  design.background?.color === c.hex
                                    ? 'border-primary ring-2 ring-primary/20'
                                    : 'border-border hover:border-primary/40',
                                )}
                              >
                                <span
                                  className="size-5 shrink-0 rounded-full border border-black/10"
                                  style={{ backgroundColor: c.hex }}
                                />
                                <span className="text-xs font-medium truncate">
                                  {locale === 'sw' ? c.nameSw : c.nameEn}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gradient Sub-tab */}
                    {bgTab === 'gradient' && (
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-semibold text-muted">
                          {locale === 'sw' ? 'Mifumo ya Gradient ya Kifahari' : 'Luxury Gradient Presets'}
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {LUXURY_GRADIENTS.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() =>
                                setDesign((prev) => ({
                                  ...prev,
                                  background: { type: 'gradient', gradient: g.value },
                                }))
                              }
                              className={cn(
                                'flex flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-all',
                                design.background?.gradient === g.value
                                  ? 'border-primary ring-2 ring-primary/20'
                                  : 'border-border hover:border-primary/40',
                              )}
                            >
                              <div
                                className="h-12 w-full rounded-lg border border-black/10"
                                style={{ background: g.value }}
                              />
                              <span className="text-xs font-medium truncate">
                                {locale === 'sw' ? g.nameSw : g.nameEn}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Image Sub-tab */}
                    {bgTab === 'image' && (
                      <div className="flex flex-col gap-4">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => bgFileInputRef.current?.click()}
                          className="w-full justify-center"
                        >
                          <Upload className="mr-2 size-4 text-primary" />
                          {locale === 'sw' ? 'Pakia Picha ya Mandhari' : 'Upload Background Photo'}
                        </Button>
                        <input
                          type="file"
                          ref={bgFileInputRef}
                          accept="image/*"
                          className="sr-only"
                          onChange={handleUploadBgFile}
                        />

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-muted">
                            {locale === 'sw' ? 'Au weka kiungo cha picha (URL)' : 'Or image URL'}
                          </label>
                          <input
                            type="text"
                            value={design.background?.imageUrl || ''}
                            onChange={(e) =>
                              setDesign((prev) => ({
                                ...prev,
                                background: {
                                  type: 'image',
                                  imageUrl: e.target.value,
                                  overlayOpacity: prev.background?.overlayOpacity ?? 35,
                                },
                              }))
                            }
                            placeholder="https://images.unsplash.com/..."
                            className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs"
                          />
                        </div>

                        {/* Scrim / Overlay opacity */}
                        <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted">
                              {locale === 'sw'
                                ? 'Kivuli cha Picha (Overlay Opacity)'
                                : 'Dark Scrim Overlay'}
                            </span>
                            <span className="text-xs font-mono font-medium">
                              {Math.round(design.background?.overlayOpacity ?? 35)}%
                            </span>
                          </div>
                          <p className="text-[11px] text-muted">
                            {locale === 'sw'
                              ? 'Husaidia maandishi yasomeke vizuri juu ya picha yenye mwanga mwingi.'
                              : 'Ensures white and gold typography remains readable over busy photos.'}
                          </p>
                          <input
                            type="range"
                            min={0}
                            max={85}
                            step={5}
                            value={design.background?.overlayOpacity ?? 35}
                            onChange={(e) =>
                              setDesign((prev) => ({
                                ...prev,
                                background: {
                                  type: 'image',
                                  imageUrl: prev.background?.imageUrl || '',
                                  overlayOpacity: Number(e.target.value),
                                },
                              }))
                            }
                            className="mt-2 h-2 w-full cursor-pointer accent-primary"
                          />
                        </div>
                      </div>
                    )}

                    {/* Global Primary & Accent Colors */}
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted">
                        {locale === 'sw' ? 'Rangi Kuu za Kadi' : 'Card Theme Colors'}
                      </span>
                      {/* Primary Text Color */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {locale === 'sw' ? 'Rangi Kuu ya Maandishi' : 'Primary Text Color'}
                        </span>
                        <input
                          type="color"
                          value={design.textColor || '#1C1917'}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, textColor: e.target.value }))
                          }
                          className="size-7 cursor-pointer rounded border border-border"
                        />
                      </div>
                      {/* Accent Color */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {locale === 'sw' ? 'Rangi ya Nakshi & Mistari' : 'Accent / Ornament Color'}
                        </span>
                        <input
                          type="color"
                          value={design.accentColor || '#E8B66B'}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, accentColor: e.target.value }))
                          }
                          className="size-7 cursor-pointer rounded border border-border"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. FRAME TAB */}
                {activeTab === 'frame' && (
                  <div className="flex flex-col gap-5">
                    {/* Frame Style */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-muted">
                        {locale === 'sw' ? 'Mtindo wa Fremu' : 'Frame Style'}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'none', labelSw: 'Bila Fremu', labelEn: 'None' },
                          { id: 'single', labelSw: 'Mstari Mmoja', labelEn: 'Single Line' },
                          { id: 'double', labelSw: 'Mstari Maradufu', labelEn: 'Double Line' },
                          { id: 'dashed', labelSw: 'Mstari wa Nukta', labelEn: 'Dashed' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() =>
                              setDesign((prev) => ({
                                ...prev,
                                frame: {
                                  show: st.id !== 'none',
                                  style: st.id as CustomCardFrame['style'],
                                  color: prev.frame?.color || prev.accentColor || '#E8B66B',
                                  width: prev.frame?.width || 2,
                                  inset: prev.frame?.inset || 24,
                                },
                              }))
                            }
                            className={cn(
                              'flex items-center justify-center rounded-xl border py-2.5 text-xs font-medium transition-all',
                              design.frame?.style === st.id || (!design.frame?.show && st.id === 'none')
                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                : 'border-border text-muted hover:border-primary/40 hover:text-ink',
                            )}
                          >
                            {locale === 'sw' ? st.labelSw : st.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>

                    {design.frame?.style !== 'none' && design.frame?.show !== false && (
                      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-3.5">
                        {/* Frame Color */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted">
                            {locale === 'sw' ? 'Rangi ya Fremu' : 'Frame Color'}
                          </span>
                          <input
                            type="color"
                            value={design.frame?.color || '#E8B66B'}
                            onChange={(e) =>
                              setDesign((prev) => ({
                                ...prev,
                                frame: {
                                  show: true,
                                  style: prev.frame?.style ?? 'double',
                                  ...prev.frame,
                                  color: e.target.value,
                                },
                              }))
                            }
                            className="size-7 cursor-pointer rounded border border-border"
                          />
                        </div>

                        {/* Frame Width */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium text-muted">
                            <span>{locale === 'sw' ? 'Unene wa Mstari' : 'Border Width'}</span>
                            <span>{design.frame?.width ?? 2}px</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={6}
                            value={design.frame?.width ?? 2}
                            onChange={(e) =>
                              setDesign((prev) => ({
                                ...prev,
                                frame: {
                                  show: true,
                                  style: prev.frame?.style ?? 'double',
                                  ...prev.frame,
                                  width: Number(e.target.value),
                                },
                              }))
                            }
                            className="h-2 w-full cursor-pointer accent-primary"
                          />
                        </div>

                        {/* Frame Inset */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-medium text-muted">
                            <span>{locale === 'sw' ? 'Nafasi ya Pembeni' : 'Frame Inset'}</span>
                            <span>{design.frame?.inset ?? 24}px</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={50}
                            value={design.frame?.inset ?? 24}
                            onChange={(e) =>
                              setDesign((prev) => ({
                                ...prev,
                                frame: {
                                  show: true,
                                  style: prev.frame?.style ?? 'double',
                                  ...prev.frame,
                                  inset: Number(e.target.value),
                                },
                              }))
                            }
                            className="h-2 w-full cursor-pointer accent-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. TEMPLATES TAB */}
                {activeTab === 'presets' && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-ink">
                        {locale === 'sw' ? 'Chagua Kiolezo cha Kadi' : 'Choose a Card Template'}
                      </h4>
                      <p className="mt-0.5 text-xs text-muted">
                        {locale === 'sw'
                          ? 'Bofya kiolezo kuanza nacho, kisha rekebisha maandishi, fremu, rangi na stika.'
                          : 'Select a starting design to load into the canvas, then customize text, fonts, colors, and stickers.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {/* Classic Elegance */}
                      <button
                        type="button"
                        onClick={() => applyPreset('classicGold')}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-primary hover:shadow-sm"
                      >
                        <span className="mt-0.5 size-7 shrink-0 rounded-lg border border-black/10 bg-[#FAF7F2] shadow-xs flex items-center justify-center font-serif text-xs font-bold text-[#E8B66B]">
                          Aa
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs md:text-sm text-ink group-hover:text-primary">
                              {locale === 'sw' ? 'Klasiki ya Dhahabu' : 'Classic Elegance'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-muted bg-surface-raised px-1.5 py-0.5 rounded">
                              {locale === 'sw' ? 'Kawaida' : 'Popular'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted line-clamp-2">
                            {locale === 'sw'
                              ? 'Mandhari ya krimu, fonti ya Playfair & Delafield, fremu ya dhahabu'
                              : 'Ivory cream, Playfair & Delafield fonts, double gold frame'}
                          </p>
                        </div>
                      </button>

                      {/* Royal Emerald */}
                      <button
                        type="button"
                        onClick={() => applyPreset('royalEmerald')}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-primary hover:shadow-sm"
                      >
                        <span className="mt-0.5 size-7 shrink-0 rounded-lg bg-[#0B2E1A] shadow-xs flex items-center justify-center font-serif text-xs font-bold text-[#E8B66B]">
                          Aa
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs md:text-sm text-ink group-hover:text-primary">
                              {locale === 'sw' ? 'Zumaridi ya Kifalme' : 'Royal Emerald'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[#165B33] bg-[#0B2E1A]/10 px-1.5 py-0.5 rounded">
                              {locale === 'sw' ? 'Kifahari' : 'Luxury'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted line-clamp-2">
                            {locale === 'sw'
                              ? 'Gradient ya kijani kibichi, maandishi meupe na dhahabu'
                              : 'Rich emerald gradient, white and gold typography'}
                          </p>
                        </div>
                      </button>

                      {/* Modern Clean */}
                      <button
                        type="button"
                        onClick={() => applyPreset('modernClean')}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-primary hover:shadow-sm"
                      >
                        <span className="mt-0.5 size-7 shrink-0 rounded-lg border border-border bg-[#FFFFFF] shadow-xs flex items-center justify-center font-sans text-xs font-bold text-[#2563EB]">
                          Aa
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs md:text-sm text-ink group-hover:text-primary">
                              {locale === 'sw' ? 'Kisasa Safi' : 'Modern Clean'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[#2563EB] bg-[#2563EB]/10 px-1.5 py-0.5 rounded">
                              {locale === 'sw' ? 'Kijiometri' : 'Clean'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted line-clamp-2">
                            {locale === 'sw'
                              ? 'Nyeupe safi, fonti ya kijiometri, bila fremu'
                              : 'Pure white background, clean sans serif, frameless'}
                          </p>
                        </div>
                      </button>

                      {/* Rose Romance */}
                      <button
                        type="button"
                        onClick={() => applyPreset('roseRomantic')}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-primary hover:shadow-sm"
                      >
                        <span className="mt-0.5 size-7 shrink-0 rounded-lg bg-[#8B3A5A] shadow-xs flex items-center justify-center font-serif text-xs font-bold text-white">
                          Aa
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs md:text-sm text-ink group-hover:text-primary">
                              {locale === 'sw' ? 'Waridi na Shampeni' : 'Rose Romance'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[#8B3A5A] bg-[#8B3A5A]/10 px-1.5 py-0.5 rounded">
                              {locale === 'sw' ? 'Mapenzi' : 'Romantic'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted line-clamp-2">
                            {locale === 'sw'
                              ? 'Gradient ya waridi, mwandiko wa Great Vibes, fremu ya nukta'
                              : 'Deep rose gradient, Great Vibes script, dashed border'}
                          </p>
                        </div>
                      </button>

                      {/* Botanical Sage */}
                      <button
                        type="button"
                        onClick={() => applyPreset('botanicalSage')}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-primary hover:shadow-sm"
                      >
                        <span className="mt-0.5 size-7 shrink-0 rounded-lg border border-[#2D5A3D]/30 bg-[#F4F7F4] shadow-xs flex items-center justify-center font-serif text-xs font-bold text-[#2D5A3D]">
                          Aa
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs md:text-sm text-ink group-hover:text-primary">
                              {locale === 'sw' ? 'Majani ya Asili' : 'Botanical Garden'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[#2D5A3D] bg-[#2D5A3D]/10 px-1.5 py-0.5 rounded">
                              {locale === 'sw' ? 'Asili' : 'Nature'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted line-clamp-2">
                            {locale === 'sw'
                              ? 'Mandhari ya sage ya asili, fremu ya kijani kibichi, fonti ya Cormorant'
                              : 'Soft sage background, forest green double frame, Cormorant serif'}
                          </p>
                        </div>
                      </button>

                      {/* Midnight Luxury */}
                      <button
                        type="button"
                        onClick={() => applyPreset('midnightLuxury')}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-primary hover:shadow-sm"
                      >
                        <span className="mt-0.5 size-7 shrink-0 rounded-lg bg-[#0A1128] shadow-xs flex items-center justify-center font-serif text-xs font-bold text-[#D4AF37]">
                          Aa
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs md:text-sm text-ink group-hover:text-primary">
                              {locale === 'sw' ? 'Usiku wa Kifahari' : 'Midnight Gold'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">
                              {locale === 'sw' ? 'Usiku' : 'Night'}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted line-clamp-2">
                            {locale === 'sw'
                              ? 'Gradient ya bluu ya usiku, fremu na maandishi ya dhahabu maridadi'
                              : 'Midnight navy gradient, double gold frame, champagne gold typography'}
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Central Drag-and-Drop Canvas Workspace */}
            <div className="flex flex-col items-center justify-center overflow-auto bg-slate-900/10 p-4 md:p-8">
              <div className="mb-2 flex items-center justify-between w-full max-w-[420px] text-xs text-muted">
                <span>
                  {locale === 'sw'
                    ? '💡 Buruta vipengele kubadili nafasi. Tumia mishale ya keyboard kusogeza.'
                    : '💡 Drag elements to reposition. Use keyboard arrow keys for fine nudging.'}
                </span>
              </div>

              <CardCanvasView
                design={design}
                event={event}
                activeElementId={activeElementId}
                onSelectElement={setActiveElementId}
                onUpdateElement={updateElement}
                onDeleteElement={deleteElement}
                locale={locale}
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
