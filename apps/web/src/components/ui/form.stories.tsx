import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox, FilePicker, OtpField, PhoneField, Select, TextField, Textarea } from './form';
import { Stepper } from './stepper';

const meta: Meta = { title: 'UI/Form' };
export default meta;

export const Text: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      <TextField label="Jina la mgeni" placeholder="mf. Asha Mwinyi" />
      <TextField label="Kikundi" optionalLabel="si lazima" hint="Mf. Familia ya Bibi Harusi" />
      <TextField label="Jina" error="Jina ni fupi mno" defaultValue="A" />
      <TextField label="Kiasi" prefix="TZS" inputMode="numeric" defaultValue="50,000" />
      <TextField label="Imezimwa" disabled defaultValue="KH-4826" />
    </div>
  ),
};

function PhoneDemo({ initial, error }: { initial: string; error?: string }) {
  const [v, setV] = useState(initial);
  const [e164, setE164] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <PhoneField
        label="Namba ya simu"
        value={v}
        onChange={setV}
        onE164={setE164}
        error={error}
        hint="Mf. 0712 345 678"
      />
      <p className="text-sm text-muted">E.164: {e164 ?? '—'}</p>
    </div>
  );
}
export const Phone: StoryObj = { render: () => <PhoneDemo initial="0712345678" /> };
export const PhoneError: StoryObj = {
  render: () => (
    <PhoneDemo initial="0712" error="Namba haijakamilika — inapaswa kuwa tarakimu 10" />
  ),
};

function OtpDemo({ error, disabled }: { error?: string; disabled?: boolean }) {
  const [v, setV] = useState('');
  return (
    <OtpField
      value={v}
      onChange={setV}
      label="Weka namba ya uthibitisho"
      cellLabel={(i) => `Tarakimu ${i + 1} kati ya 6`}
      error={error}
      disabled={disabled}
    />
  );
}
export const Otp: StoryObj = { render: () => <OtpDemo /> };
export const OtpError: StoryObj = {
  render: () => <OtpDemo error="Namba si sahihi. Majaribio 3 yamebaki." />,
};
export const OtpLocked: StoryObj = {
  render: () => <OtpDemo disabled error="Umejaribu mara nyingi. Subiri dakika 10." />,
};

export const SelectField: StoryObj = {
  render: () => (
    <Select
      label="Njia ya mwaliko"
      options={[
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'sms', label: 'SMS' },
        { value: 'print', label: 'Kadi ya karatasi' },
      ]}
    />
  ),
};
export const TextareaField: StoryObj = {
  render: () => <Textarea label="Maelezo" optionalLabel="si lazima" />,
};
export const CheckboxField: StoryObj = {
  render: () => (
    <Checkbox
      label="Hana smartphone"
      description="Atapokea SMS yenye namba ya kadi badala ya WhatsApp."
    />
  ),
};

function StepperDemo({ max }: { max: number }) {
  const [v, setV] = useState(1);
  return (
    <Stepper
      value={v}
      onChange={setV}
      max={max}
      label="Idadi ya watu"
      decreaseLabel="Punguza idadi"
      increaseLabel="Ongeza idadi"
      hint={`Hadi watu ${max}`}
    />
  );
}
export const StepperControl: StoryObj = { render: () => <StepperDemo max={3} /> };
export const StepperSingle: StoryObj = { render: () => <StepperDemo max={1} /> };

export const File: StoryObj = {
  render: () => (
    <FilePicker
      label="Pakia faili la CSV"
      hint="Safu: Jina, Simu, Kikundi, Idadi"
      accept=".csv,text/csv"
      buttonLabel="Chagua faili"
      onFile={() => {}}
    />
  ),
};
export const FileError: StoryObj = {
  render: () => (
    <FilePicker
      label="Pakia faili la CSV"
      accept=".csv"
      buttonLabel="Chagua faili"
      onFile={() => {}}
      error="Faili hili si CSV"
    />
  ),
};
