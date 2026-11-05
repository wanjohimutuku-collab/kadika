/**
 * The gate link code from what the agent typed or pasted: the code itself, or the whole link
 * (`https://kadisasa.com/gate-join/AB3DEF7H`, `harusipass://gate-join/AB3DEF7H`).
 */
export function gateCodeFrom(input: string): string {
  const s = input.trim();
  const m = /gate-join\/([^/?#\s]+)/i.exec(s);
  return (m ? m[1]! : s)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
}
