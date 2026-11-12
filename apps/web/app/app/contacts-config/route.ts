export const dynamic = 'force-dynamic';

/**
 * Runtime settings for contacts import (ADR 051). The Google OAuth client ID is public by design (it is
 * sent to Google in the browser); it is read here at request time so one image serves every environment.
 * Unset means the Google Contacts option is hidden.
 */
export function GET() {
  const id = process.env.GOOGLE_CONTACTS_CLIENT_ID?.trim();
  return Response.json(
    { googleClientId: id && /^[\w.-]+\.apps\.googleusercontent\.com$/.test(id) ? id : null },
    { headers: { 'cache-control': 'no-store' } },
  );
}
