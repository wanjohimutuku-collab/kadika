'use client';

import type { ReactNode } from 'react';
import { STAFF_PERMISSIONS, type StaffPermission } from '@harusi/api-client';
import { Banner, StatusPill } from '@/components/ui/display';
import { useSession } from '@/lib/queries';
import { PageHeader } from '@/components/console/page-header';

export function OpsPage({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </div>
  );
}

/** Scrollable data table that is keyboard-focusable (axe: scrollable-region-focusable). */
export function DataTable({
  label,
  minWidth = 720,
  head,
  children,
}: {
  label: string;
  minWidth?: number;
  head: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="overflow-x-auto rounded-card border border-border bg-surface"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead className="border-b border-border bg-bg text-sm text-muted">{head}</thead>
        <tbody className="tabular">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 font-semibold whitespace-nowrap ${right ? 'text-right' : ''}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  muted,
  wrap,
}: {
  children: ReactNode;
  right?: boolean;
  muted?: boolean;
  wrap?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2.5 align-top ${right ? 'text-right' : ''} ${muted ? 'text-muted' : ''} ${wrap ? '' : 'whitespace-nowrap'}`}
    >
      {children}
    </td>
  );
}

export function AccountStatus({
  status,
  label,
}: {
  status: 'active' | 'suspended';
  label: string;
}) {
  return <StatusPill tone={status === 'active' ? 'success' : 'danger'}>{label}</StatusPill>;
}

/** Mirrors the data layer's staff permissions so buttons a role may not use are hidden, not just refused. */
export function useStaffCan(permission: StaffPermission): boolean {
  const user = useSession().data?.user;
  return !!user && STAFF_PERMISSIONS[user.staffRole ?? 'support'].includes(permission);
}

export function NoPermission({ text }: { text: string }) {
  return <Banner tone="warning">{text}</Banner>;
}
