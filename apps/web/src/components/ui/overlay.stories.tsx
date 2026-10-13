import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BottomSheet, ConfirmSheet, SearchSheet } from './overlay';
import { Button } from './button';
import { ToastProvider, useToast } from './toast';

const meta: Meta = { title: 'UI/Overlays', parameters: { layout: 'fullscreen' } };
export default meta;

function SheetDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Fungua</Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Ongeza mgeni"
        description="Chagua njia"
        closeLabel="Funga"
        footer={<Button onClick={() => setOpen(false)}>Hifadhi</Button>}
      >
        <p>Andika mmoja · Ingiza orodha · Kutoka kwenye anwani</p>
      </BottomSheet>
    </div>
  );
}
export const Sheet: StoryObj = { render: () => <SheetDemo /> };

function ConfirmDemo({ typed }: { typed?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="p-4">
      <Button variant="danger" onClick={() => setOpen(true)}>
        Toa kadi mpya
      </Button>
      <ConfirmSheet
        open={open}
        onOpenChange={setOpen}
        title="Toa kadi mpya kwa Asha Mwinyi?"
        consequence="QR na kiungo cha zamani vitaacha kufanya kazi mlangoni. Mgeni atahitaji kiungo kipya."
        confirmLabel="Toa kadi mpya"
        cancelLabel="Ghairi"
        closeLabel="Funga"
        onConfirm={() => setOpen(false)}
        typedConfirmation={
          typed ? { expected: 'FUTA', label: 'Andika FUTA ili kuthibitisha' } : undefined
        }
      />
    </div>
  );
}
export const Confirm: StoryObj = { render: () => <ConfirmDemo /> };
export const ConfirmTyped: StoryObj = { render: () => <ConfirmDemo typed /> };

const PEOPLE = ['Asha Mwinyi', 'Baraka Joseph', 'Mama Neema', 'Mzee Hamisi Juma'];
function SearchDemo({ empty }: { empty?: boolean }) {
  const [q, setQ] = useState(empty ? 'zzz' : '');
  const results = PEOPLE.filter((p) => p.toLowerCase().includes(q.toLowerCase()));
  return (
    <SearchSheet
      open
      onOpenChange={() => {}}
      title="Ingiza mgeni"
      placeholderLabel="Tafuta jina au namba"
      query={q}
      onQueryChange={setQ}
      results={results}
      getKey={(r) => r}
      renderResult={(r) => <button className="min-h-12 w-full px-2 text-left">{r}</button>}
      empty="Hakuna anayelingana"
      closeLabel="Funga"
    />
  );
}
export const Search: StoryObj = { render: () => <SearchDemo /> };
export const SearchEmpty: StoryObj = { render: () => <SearchDemo empty /> };

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2 p-4">
      <Button onClick={() => toast({ tone: 'success', title: 'Imehifadhiwa' })}>Mafanikio</Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({ tone: 'error', title: 'Haikuhifadhiwa — tumerudisha hali ya awali' })
        }
      >
        Hitilafu
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          toast({
            tone: 'info',
            title: 'Wageni 3 wamefutwa',
            action: { label: 'Tendua', onClick: () => {} },
          })
        }
      >
        Tendua
      </Button>
    </div>
  );
}
export const Toasts: StoryObj = {
  render: () => (
    <ToastProvider closeLabel="Funga">
      <ToastDemo />
    </ToastProvider>
  ),
};
