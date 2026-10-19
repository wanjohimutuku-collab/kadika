import { redirect } from 'next/navigation';

/** Moved into Settings (ADR 036); keeps old bookmarks working. */
export default function MessagingMoved() {
  redirect('/ops/settings/messaging');
}
