import 'server-only';
import { fetchCardPreview, type CardView } from '@harusi/api-client';
import { USE_MOCKS } from './env';
import { peekCardOnServer } from './server-mock';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Card data for the OG image and manifest. Never marks the invitation opened (bots call these). */
export async function previewCardOnServer(token: string): Promise<CardView | null> {
  if (USE_MOCKS) return peekCardOnServer(token);
  try {
    return await fetchCardPreview(API_URL, token);
  } catch {
    return null;
  }
}
