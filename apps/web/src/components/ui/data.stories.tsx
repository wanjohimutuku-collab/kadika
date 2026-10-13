import type { Meta, StoryObj } from '@storybook/react';
import { RefreshCw, Pencil, MessageCircle } from 'lucide-react';
import { BarChart, FunnelBar, ListRow, Timeline } from './data';
import { Avatar, StatusPill } from './display';

const meta: Meta = { title: 'UI/Data' };
export default meta;

export const Funnel: StoryObj = {
  render: () => (
    <FunnelBar
      caption="Mtiririko wa mialiko"
      stages={[
        { key: 'created', label: 'Waalikwa', count: 326 },
        { key: 'sent', label: 'Imetumwa', count: 293 },
        { key: 'delivered', label: 'Imefika', count: 271 },
        { key: 'opened', label: 'Imefunguliwa', count: 223 },
        { key: 'confirmed', label: 'Wamethibitisha', count: 147 },
        { key: 'checked_in', label: 'Wamefika', count: 0 },
      ]}
    />
  ),
};
export const FunnelEmpty: StoryObj = {
  render: () => (
    <FunnelBar
      caption="Mtiririko"
      stages={[
        { key: 'created', label: 'Waalikwa', count: 0 },
        { key: 'sent', label: 'Imetumwa', count: 0 },
      ]}
    />
  ),
};

export const Bars: StoryObj = {
  render: () => (
    <BarChart
      caption="Waliofika kwa saa"
      data={[
        { label: '14:00', value: 12 },
        { label: '15:00', value: 64 },
        { label: '16:00', value: 88 },
        { label: '17:00', value: 41 },
        { label: '18:00', value: 9 },
      ]}
    />
  ),
};

export const TimelineStory: StoryObj = {
  name: 'Timeline',
  render: () => (
    <Timeline
      label="Hali ya mwaliko"
      steps={[
        { key: 'created', label: 'Iliyoundwa', at: '28 Ago, 10:12', state: 'done' },
        { key: 'sent', label: 'Imetumwa', at: '2 Sep, 18:40', state: 'done' },
        { key: 'delivered', label: 'Imefika', at: '2 Sep, 18:41', state: 'done' },
        { key: 'opened', label: 'Imefunguliwa', at: '3 Sep, 07:15', state: 'current' },
        { key: 'confirmed', label: 'Imethibitishwa', state: 'pending' },
        { key: 'checked_in', label: 'Amefika', state: 'pending' },
      ]}
    />
  ),
};

export const Rows: StoryObj = {
  render: () => (
    <div className="divide-y divide-border rounded-card border border-border">
      <ListRow
        leading={<Avatar name="Asha Mwinyi" />}
        title="Asha Mwinyi"
        subtitle="Familia ya Bibi Harusi · KH-4826"
        trailing={
          <>
            <MessageCircle className="size-5 text-success" aria-label="WhatsApp" />
            <StatusPill tone="success">Amethibitisha</StatusPill>
          </>
        }
        onOpen={() => {}}
        swipeLeft={{ label: 'Tuma tena', icon: <RefreshCw />, onAction: () => {} }}
        swipeRight={{ label: 'Badilisha', icon: <Pencil />, onAction: () => {} }}
      />
      <ListRow
        leading={<Avatar name="Mama Neema" />}
        title="Mama Neema"
        subtitle="Wazee · KH-5546"
        trailing={<StatusPill tone="warning">Hajajibu</StatusPill>}
        selected
      />
    </div>
  ),
};
