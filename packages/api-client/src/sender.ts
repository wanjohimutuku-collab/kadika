/** Default "sent by" line; names the kind of event when the organiser wrote one. */
export function defaultSender(kind: string | null | undefined, hosts: string): string {
  const k = kind?.trim();
  return k ? `Kamati ya ${k} ya ${hosts}` : `Kamati ya ${hosts}`;
}
