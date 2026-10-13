import type { Meta, StoryObj } from '@storybook/react';
import { QrBlock } from './qr-block';
import { CurrencyText, DateText } from './text';

const meta: Meta<typeof QrBlock> = {
  title: 'UI/QrBlock',
  component: QrBlock,
  args: {
    payload: 'v1.0192f1a0.abcdef12.2.1.MOCKSIG',
    alt: 'Msimbo wa QR wa kuingia; namba KH-4826',
    size: 240,
  },
};
export default meta;
type S = StoryObj<typeof QrBlock>;

export const Default: S = {};
export const Small: S = { args: { size: 160 } };
export const LongPayload: S = { args: { payload: 'v1.0192f1a0.abcdef12.10.12.' + 'x'.repeat(86) } };
export const Texts: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-2">
      <CurrencyText amount={1200000} />
      <DateText iso="2026-12-14T13:00:00Z" locale="sw" />
      <DateText iso="2026-12-14T13:00:00Z" locale="sw" variant="time" />
      <DateText iso="2026-12-14T13:00:00Z" locale="en" variant="datetime" />
    </div>
  ),
};
