import { gateColors, lightColors, radius } from './colors';

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** CSS custom properties for the web (light only; dark is mobile-only per §17.2). */
export function tokensCss(): string {
  const lines = [
    ...Object.entries(lightColors).map(([k, v]) => `  --hp-${kebab(k)}: ${v};`),
    ...Object.entries(gateColors).map(([k, v]) => `  --hp-gate-${kebab(k)}: ${v};`),
    `  --hp-pattern: ${lightColors.accent};`,
    ...Object.entries(radius).map(([k, v]) => `  --hp-radius-${kebab(k)}: ${v}px;`),
  ];
  return `/* Generated from packages/ui-tokens/src — run \`pnpm --filter @harusi/ui-tokens gen\`. Do not edit. */\n:root {\n${lines.join('\n')}\n}\n`;
}
