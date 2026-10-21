export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    status: 'ok',
    service: 'web',
    time: new Date().toISOString(),
    // The commit the running image was built from; the deploy workflow waits for it (ADR 035).
    version: process.env.GIT_SHA || 'dev',
  });
}
