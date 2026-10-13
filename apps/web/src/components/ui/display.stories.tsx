import type { Meta, StoryObj } from '@storybook/react';
import { CheckCircle2, Users, UserPlus } from 'lucide-react';
import {
  Avatar,
  Banner,
  Card,
  Chip,
  EmptyState,
  KpiTile,
  ProgressBar,
  Ring,
  Skeleton,
  StatusPill,
} from './display';
import { Button } from './button';

const meta: Meta = { title: 'UI/Display' };
export default meta;

export const StatusPills: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusPill>Iliyoundwa</StatusPill>
      <StatusPill tone="info">Imetumwa</StatusPill>
      <StatusPill tone="primary">Imefunguliwa</StatusPill>
      <StatusPill
        tone="success"
        icon={<CheckCircle2 className="size-4 text-success" aria-hidden="true" />}
      >
        Amethibitisha
      </StatusPill>
      <StatusPill tone="warning">Hajajibu</StatusPill>
      <StatusPill tone="danger">Imeshindwa</StatusPill>
    </div>
  ),
};

export const Avatars: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      {['Asha Mwinyi', 'Mama Neema', 'Familia ya Kombo', 'Dkt. Peter Mollel'].map((n) => (
        <Avatar key={n} name={n} />
      ))}
    </div>
  ),
};

export const Cards: StoryObj = {
  render: () => (
    <Card
      title="Michango"
      titleId="c1"
      action={
        <Button size="sm" variant="ghost">
          Ona yote
        </Button>
      }
    >
      <p>Maudhui ya kadi.</p>
    </Card>
  ),
};

export const KpiTiles: StoryObj = {
  render: () => (
    <div className="grid grid-cols-3 gap-2">
      <KpiTile label="Waalikwa" value="320" icon={<Users className="size-4" />} />
      <KpiTile
        label="Wamethibitisha"
        value="214"
        sub="watu 361"
        tone="success"
        icon={<CheckCircle2 className="size-4" />}
      />
      <KpiTile label="Wamefika" value="0" />
    </div>
  ),
};

export const Progress: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ProgressBar value={0.7} label="Michango" valueText="TZS 8.4M kati ya 12M" />
      <ProgressBar value={0.2} label="Imeanza" tone="warning" />
      <ProgressBar value={1} label="Kamili" tone="success" />
    </div>
  ),
};

export const RingProgress: StoryObj = {
  render: () => (
    <Ring value={0.7} label="70% ya lengo">
      <span className="text-xl font-bold">70%</span>
      <span className="text-xs text-muted">ya lengo</span>
    </Ring>
  ),
};

export const Chips: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip pressed count={326}>
        Wote
      </Chip>
      <Chip count={33}>Hawajatumiwa</Chip>
      <Chip count={147}>Wamethibitisha</Chip>
    </div>
  ),
};

export const Banners: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Banner tone="info" title="Kidokezo">
        Wageni wasio na smartphone watapata SMS yenye namba.
      </Banner>
      <Banner
        tone="warning"
        title="Ujumbe 8 haukufika"
        action={
          <Button size="sm" variant="secondary">
            Tuma tena
          </Button>
        }
      />
      <Banner tone="offline">Hakuna mtandao — mabadiliko yatatumwa baadaye</Banner>
      <Banner tone="error" title="Samahani, kuna tatizo">
        Namba ya hitilafu: server
      </Banner>
      <Banner tone="success" title="Asante! Umethibitisha kuhudhuria" />
    </div>
  ),
};

export const Empty: StoryObj = {
  render: () => (
    <EmptyState
      icon={<UserPlus className="size-7" />}
      title="Hakuna wageni bado · Ingiza orodha"
      action={<Button>Ingiza orodha</Button>}
    />
  ),
};

export const Skeletons: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton lines={3} />
      <Skeleton className="h-32" />
    </div>
  ),
};
