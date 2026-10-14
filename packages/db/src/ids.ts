import { v7 as uuidv7 } from 'uuid';

/** New UUIDv7 (all primary keys, §5). */
export const newId = (): string => uuidv7();

/** On-card guest id: the last 8 hex characters of the guest UUID (ADR 013). */
export const shortOf = (uuid: string): string => uuid.replace(/-/g, '').slice(-8);
