import type { Article } from "@/lib/types";

interface Props {
  article: Article;
  variant?: "default" | "featured";
}

export default function ArticleCard({ article: a, variant = "default" }: Props) {
  if (variant === "featured") return <FeaturedCard article={a} />;
  return <DefaultCard article={a} />;
}

function DefaultCard({ article: a }: { article: Article }) {
  const tone = a.sentiment ?? "neutral";
  const ribbon = tone === "positive" ? "ribbon-pos" : tone === "negative" ? "ribbon-neg" : "ribbon-neu";

  return (
    <article className="article-card fade-in">
      {a.image_url && (
        <a href={a.link} target="_blank" rel="noreferrer" className="article-image-frame block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.image_url} alt="" className="article-image" loading="lazy" referrerPolicy="no-referrer" />
          <span className={`sentiment-ribbon ${ribbon}`}>
            <span className={`dot dot-${tone === "positive" ? "pos" : tone === "negative" ? "neg" : "neu"}`} />
            {tone}
          </span>
        </a>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between gap-2 eyebrow">
          <span className="truncate">
            {a.source ?? "Unknown source"}
            {a.published_at && <> · <time>{formatDate(a.published_at)}</time></>}
          </span>
          {readingTime(a) && <span className="text-[var(--ink-faint)] flex-shrink-0">{readingTime(a)}</span>}
        </div>

        <h2 className="article-title serif text-[20px] leading-[1.25] font-semibold">
          <a href={a.link} target="_blank" rel="noreferrer" className="transition-colors duration-200">
            {a.title}
          </a>
        </h2>

        {a.summary && (
          <p className="text-[14px] leading-relaxed text-[var(--ink-soft)] line-clamp-3">
            {a.summary}
          </p>
        )}

        <SentimentBar score={a.sentiment_score} />

        {a.insights.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center gap-1.5 eyebrow text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">
              <span className="inline-block transition-transform group-open:rotate-90">▸</span>
              Key insights
              <span className="text-[var(--ink-faint)] font-normal">({a.insights.length})</span>
            </summary>
            <ul className="mt-2.5 space-y-2 text-[13px] leading-snug">
              {a.insights.slice(0, 5).map((i, idx) => (
                <li key={idx} className="flex gap-2 text-[var(--ink-soft)]">
                  <span className="text-[var(--accent)] mt-0.5 leading-none flex-shrink-0">·</span>
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          {a.category && <span className="chip chip-accent">{a.category}</span>}
          {a.keywords.slice(0, 4).map((k) => (
            <span key={k} className="chip">#{k}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function FeaturedCard({ article: a }: { article: Article }) {
  const tone = a.sentiment ?? "neutral";
  const ribbon = tone === "positive" ? "ribbon-pos" : tone === "negative" ? "ribbon-neg" : "ribbon-neu";

  return (
    <article className="featured fade-in mb-7">
      {a.image_url ? (
        <a href={a.link} target="_blank" rel="noreferrer" className="featured-image-frame block relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.image_url} alt="" className="featured-image" loading="eager" referrerPolicy="no-referrer" />
          <span className={`sentiment-ribbon ${ribbon}`}>
            <span className={`dot dot-${tone === "positive" ? "pos" : tone === "negative" ? "neg" : "neu"}`} />
            {tone}
          </span>
        </a>
      ) : (
        <div className="featured-image-frame" />
      )}

      <div className="p-6 sm:p-8 flex flex-col gap-4 justify-center">
        <div className="flex items-center gap-2 eyebrow">
          <span className="chip chip-accent">Featured</span>
          <span className="text-[var(--ink-faint)]">·</span>
          <span className="truncate">
            {a.source ?? "Unknown source"}
            {a.published_at && <> · <time>{formatDate(a.published_at)}</time></>}
          </span>
        </div>

        <h2 className="serif font-semibold text-[28px] sm:text-[32px] leading-[1.15]">
          <a
            href={a.link}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--accent)] transition-colors"
          >
            {a.title}
          </a>
        </h2>

        {a.summary && (
          <p className="text-[15px] leading-relaxed text-[var(--ink-soft)] line-clamp-4">
            {a.summary}
          </p>
        )}

        {a.insights.length > 0 && (
          <ul className="space-y-2 text-[13.5px] border-t border-[var(--line)] pt-4 mt-1">
            {a.insights.slice(0, 3).map((i, idx) => (
              <li key={idx} className="flex gap-2.5 text-[var(--ink-soft)]">
                <span className="text-[var(--accent)] mt-0.5 leading-none flex-shrink-0 font-bold">·</span>
                <span>{i}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-1.5 mt-1">
          {a.category && <span className="chip">{a.category}</span>}
          {a.keywords.slice(0, 5).map((k) => (
            <span key={k} className="chip">#{k}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function SentimentBar({ score }: { score: number | null }) {
  if (score === null || isNaN(score)) return null;
  const pct = Math.min(Math.abs(score) * 50, 50);
  const positive = score >= 0;
  return (
    <div className="flex items-center gap-2">
      <div className="sentiment-bar flex-1">
        <div
          className="sentiment-bar-fill"
          style={{
            left: positive ? "50%" : `${50 - pct}%`,
            width: `${pct}%`,
            background: positive ? "var(--pos)" : "var(--neg)",
          }}
        />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[var(--ink-faint)] opacity-40" />
      </div>
      <span className="text-[10.5px] tabular-nums text-[var(--ink-faint)] font-medium w-10 text-right">
        {score >= 0 ? "+" : ""}{score.toFixed(2)}
      </span>
    </div>
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

function readingTime(a: Article): string | null {
  const words = (a.content || a.description || a.summary || "").split(/\s+/).length;
  if (words < 50) return null;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}
