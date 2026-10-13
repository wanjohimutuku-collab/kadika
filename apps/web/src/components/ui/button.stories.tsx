import type { Meta, StoryObj } from '@storybook/react';
import { Send, Trash2 } from 'lucide-react';
import { Button, IconButton, Spinner } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Tuma sasa' },
};
export default meta;
type S = StoryObj<typeof Button>;

export const Primary: S = {};
export const Secondary: S = { args: { variant: 'secondary', children: 'Ghairi' } };
export const Ghost: S = { args: { variant: 'ghost', children: 'Badilisha' } };
export const Accent: S = { args: { variant: 'accent', children: 'Sitahudhuria' } };
export const Danger: S = {
  args: {
    variant: 'danger',
    children: 'Futa',
    icon: <Trash2 className="size-5" aria-hidden="true" />,
  },
};
export const WithIcon: S = { args: { icon: <Send className="size-5" aria-hidden="true" /> } };
export const Loading: S = { args: { loading: true, loadingLabel: 'Inatuma…' } };
export const Disabled: S = { args: { disabled: true } };
export const Block: S = { args: { block: true, size: 'lg', children: 'Nitahudhuria' } };
export const Small: S = { args: { size: 'sm', children: 'Nakili' } };
export const Icon: StoryObj<typeof IconButton> = {
  render: () => (
    <div className="flex gap-2">
      <IconButton label="Futa" icon={<Trash2 className="size-5" aria-hidden="true" />} />
      <IconButton
        variant="secondary"
        label="Tuma"
        icon={<Send className="size-5" aria-hidden="true" />}
      />
      <IconButton
        variant="primary"
        label="Tuma"
        icon={<Send className="size-5" aria-hidden="true" />}
      />
    </div>
  ),
};
export const SpinnerOnly: StoryObj<typeof Spinner> = {
  render: () => <Spinner label="Inapakia…" />,
};
