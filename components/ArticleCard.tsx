import type { Article } from "@/lib/types";

export default function ArticleCard({ article: a }: { article: Article }) {
  const tone = a.sentiment ?? "neutral";
  const dotClass = tone === "positive" ? "dot-pos" : tone === "negative" ? "dot-neg" : "dot-neu";

  return (
    <article className="card rounded-lg overflow-hidden flex flex-col">
      {a.image_url ? (
        <a href={a.link} target="_blank" rel="noreferrer" className="block aspect-[16/9] overflow-hidden bg-[var(--line)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.image_url}
            alt=""
            className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
            onError={(e) => ((e.currentTarget.style.display = "none"))}
          />
        </a>
      ) : null}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
          <span className={`dot ${dotClass}`} />
          <span className="capitalize">{tone}</span>
          {a.source && <span aria-hidden>·</span>}
          {a.source && <span className="truncate">{a.source}</span>}
          {a.published_at && <span aria-hidden>·</span>}
          {a.published_at && <time className="whitespace-nowrap">{formatDate(a.published_at)}</time>}
        </div>

        <h2 className="serif text-xl font-semibold leading-snug">
          <a href={a.link} target="_blank" rel="noreferrer" className="hover:underline">
            {a.title}
          </a>
        </h2>

        {a.summary && (
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed line-clamp-3">
            {a.summary}
          </p>
        )}

        {a.insights.length > 0 && (
          <ul className="space-y-1.5 text-sm border-t border-[var(--line)] pt-3 mt-1">
            {a.insights.slice(0, 4).map((i, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-[var(--accent)] mt-1.5 leading-none">▸</span>
                <span className="text-[var(--ink-soft)] leading-snug">{i}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
          {a.category && <span className="chip">{a.category}</span>}
          {a.keywords.slice(0, 4).map((k) => (
            <span key={k} className="chip">#{k}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}
