import { redirect } from 'next/navigation';

/**
 * Guests' contributions are paid to the hosts and kept only as their own sealed records (ADR 043), so
 * staff have no contribution list. What customers pay us lives at /ops/billing (ADR 042).
 */
export default function OpsPaymentsPage() {
  redirect('/ops/billing');
}
