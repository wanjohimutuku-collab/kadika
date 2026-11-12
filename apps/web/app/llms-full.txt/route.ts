import { llmsFullTxt } from '@/lib/llms';

export const dynamic = 'force-static';

/** Every guide and product page as Markdown, English edition, for AI assistants that read whole sites. */
export function GET() {
  return new Response(llmsFullTxt(), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
