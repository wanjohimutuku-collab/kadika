import type { ReactNode } from 'react';

export const metadata = { title: 'Harusi Pass' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sw">
      <body>{children}</body>
    </html>
  );
}
