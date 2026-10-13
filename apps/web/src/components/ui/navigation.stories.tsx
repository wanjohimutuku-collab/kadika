import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SegmentedControl, Switch, TabPanel, Tabs } from './navigation';

const meta: Meta = { title: 'UI/Navigation' };
export default meta;

function SegDemo() {
  const [v, setV] = useState<'unsent' | 'group' | 'selected'>('unsent');
  return (
    <SegmentedControl
      label="Walengwa"
      value={v}
      onChange={setV}
      options={[
        { value: 'unsent', label: 'Wote waliobaki', count: 33 },
        { value: 'group', label: 'Kikundi' },
        { value: 'selected', label: 'Waliochaguliwa', count: 0 },
      ]}
    />
  );
}
export const Segmented: StoryObj = { render: () => <SegDemo /> };

function TabsDemo() {
  const [v, setV] = useState('all');
  return (
    <Tabs
      label="Michango"
      value={v}
      onValueChange={setV}
      items={[
        { value: 'all', label: 'Wote', count: 196 },
        { value: 'paid', label: 'Wamelipwa', count: 80 },
        { value: 'partial', label: 'Sehemu', count: 49 },
        { value: 'unpaid', label: 'Hawajalipa', count: 67 },
      ]}
    >
      {['all', 'paid', 'partial', 'unpaid'].map((x) => (
        <TabPanel key={x} value={x} className="py-4">
          Orodha: {x}
        </TabPanel>
      ))}
    </Tabs>
  );
}
export const TabsStory: StoryObj = { name: 'Tabs', render: () => <TabsDemo /> };

function SwitchDemo({ disabled }: { disabled?: boolean }) {
  const [v, setV] = useState(false);
  return (
    <Switch
      checked={v}
      onCheckedChange={setV}
      disabled={disabled}
      label="Hitaji ahadi kabla ya kadi"
      description="Kadi itatolewa tu baada ya mgeni kuweka ahadi."
    />
  );
}
export const SwitchControl: StoryObj = { render: () => <SwitchDemo /> };
export const SwitchDisabled: StoryObj = { render: () => <SwitchDemo disabled /> };
