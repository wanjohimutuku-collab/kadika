import { llmsTxt } from '@/lib/llms';

export const dynamic = 'force-static';

/** Plain-text map of the site for AI assistants (llmstxt.org), built from the page content. */
export function GET() {
  return new Response(llmsTxt(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
