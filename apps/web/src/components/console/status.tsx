'use client';

import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Mail,
  MessageCircle,
  MessageSquareText,
  Printer,
  XCircle,
} from 'lucide-react';
import type { Guest } from '@harusi/api-client';
import type { InvitationStatus, MessageChannel } from '@harusi/schemas';
import { StatusPill, type Tone } from '@/components/ui/display';

const TONE: Record<InvitationStatus, Tone> = {
  created: 'neutral',
  queued: 'neutral',
  sent: 'info',
  delivered: 'info',
  opened: 'primary',
  confirmed: 'success',
  declined: 'warning',
  checked_in: 'success',
};

export function GuestStatusPill({
  guest,
  compact,
}: {
  guest: Pick<Guest, 'status' | 'lastMessageFailed'>;
  compact?: boolean;
}) {
  const cls = compact ? 'px-2 py-0.5 text-xs' : undefined;
  const t = useTranslations('status');
  if (guest.lastMessageFailed && (guest.status === 'queued' || guest.status === 'created')) {
    return (
      <StatusPill
        className={cls}
        tone="danger"
        icon={<XCircle className="size-4 text-danger" aria-hidden="true" />}
      >
        {t('failed')}
      </StatusPill>
    );
  }
  return (
    <StatusPill
      className={cls}
      tone={TONE[guest.status]}
      icon={
        guest.status === 'confirmed' || guest.status === 'checked_in' ? (
          <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
        ) : undefined
      }
    >
      {t(guest.status)}
    </StatusPill>
  );
}

export function ChannelIcon({
  channel,
  className = 'size-5',
}: {
  channel: MessageChannel | 'mixed' | null;
  className?: string;
}) {
  const t = useTranslations('channel');
  if (!channel) return <Mail className={`${className} text-muted/60`} aria-hidden="true" />;
  const label = t(channel);
  if (channel === 'whatsapp')
    return <MessageCircle className={`${className} text-success`} role="img" aria-label={label} />;
  if (channel === 'sms')
    return <MessageSquareText className={`${className} text-info`} role="img" aria-label={label} />;
  if (channel === 'print')
    return <Printer className={`${className} text-ink`} role="img" aria-label={label} />;
  return <Mail className={`${className} text-muted`} role="img" aria-label={label} />;
}
