import { notFound, redirect } from 'next/navigation';
import { cardTokenFromShortPath } from '@/lib/short-link';

/** SMS and WhatsApp link for Kumbukumbu (ADR 050): `/s/<token>/k` → the guest's memories page. */
export default async function ShortMemories({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const token = cardTokenFromShortPath(code);
  if (!token) notFound();
  redirect(`/c/${token}/kumbukumbu`);
}
