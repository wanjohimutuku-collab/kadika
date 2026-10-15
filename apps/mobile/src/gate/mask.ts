/**
 * The gate PIN is masked by hand instead of with a password-type field: Samsung Pass (and other
 * password managers) offer to save anything typed into a secure field, which a shared gate phone
 * must never do. The field shows bullets; this keeps the real digits in sync as the user types
 * and deletes. `BULLET` is never a digit, so a pasted or autofilled value is read as new digits.
 */
export const BULLET = '•';

export function applyMaskedInput(current: string, typed: string, max = 8): string {
  const kept = [...typed];
  // how many leading bullets survived: those are the digits we already hold
  let lead = 0;
  while (lead < kept.length && kept[lead] === BULLET) lead++;
  const base = current.slice(0, Math.min(lead, current.length));
  const added = kept.slice(lead).join('').replace(/\D/g, '');
  return (base + added).slice(0, max);
}

export const mask = (pin: string): string => BULLET.repeat(pin.length);
