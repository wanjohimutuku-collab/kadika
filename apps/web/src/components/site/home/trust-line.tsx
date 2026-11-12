/**
 * One-line trust strip shown directly under the hero (kit sitemap.md § Home). A thin section with
 * a single sentence; the dots are decorative. Server-rendered so it adds zero client JS.
 */
export function TrustLine({ text }: { text: string }) {
  return (
    <section aria-label={text} className="border-y border-ks-border bg-ks-surface">
      <p className="mx-auto max-w-5xl px-6 py-4 text-center text-sm font-medium tracking-wide text-ks-muted md:text-base">
        {text}
      </p>
    </section>
  );
}
