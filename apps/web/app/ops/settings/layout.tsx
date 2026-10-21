import type { ReactNode } from 'react';
import { SettingsFrame } from '@/components/ops/settings-frame';

/** Staff Settings (ADR 036): branding, SMS and WhatsApp, payment gateway. Admin staff only. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsFrame>{children}</SettingsFrame>;
}
