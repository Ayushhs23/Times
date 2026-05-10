import { getDb } from "@/lib/db";
import StatsBar from "@/components/StatsBar";
import FilterBar from "@/components/FilterBar";
import ArticleCard from "@/components/ArticleCard";
import type { Sentiment, SortKey } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  sentiment?: string;
  source?: string;
  category?: string;
  sort?: string;
  page?: string;
}

const PAGE_SIZE = 24;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const db = getDb();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;
  const sentiment = isSentiment(searchParams.sentiment) ? searchParams.sentiment : undefined;
  const sort = isSort(searchParams.sort) ? searchParams.sort : undefined;

  const [{ items, total }, stats, sources, categories] = await Promise.all([
    db.listArticles({
      search: searchParams.q,
      sentiment,
      source: searchParams.source,
      category: searchParams.category,
      sort,
      limit: PAGE_SIZE,
      offset,
    }),
    db.getStats(),
    db.distinct("source"),
    db.distinct("category"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const empty = items.length === 0;
  const noData = stats.total === 0;

  // Featured = the first item if we're on page 1 with no filters set.
  const showFeatured =
    page === 1 && !searchParams.q && !searchParams.sentiment &&
    !searchParams.source && !searchParams.category && items.length > 0;
  const featured = showFeatured ? items[0] : null;
  const grid = showFeatured ? items.slice(1) : items;

  return (
    <>
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo />
            <div className="leading-tight">
              <div className="serif text-[18px] font-bold tracking-tight">News Intelligence</div>
              <div className="text-[11px] text-[var(--ink-faint)]">AI-curated · real-time</div>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 chip">
              <span className="dot-live" />
              {stats.total > 0 ? `${stats.total} articles indexed` : "Run pipeline to begin"}
            </span>
            <a
              href="https://newsdata.io"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
              title="Powered by NewsData.io"
            >
              NewsData.io ↗
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
        <section className="mb-10 max-w-3xl">
          <p className="eyebrow text-[var(--accent)] mb-3">Today's intelligence</p>
          <h1 className="serif text-[42px] sm:text-[52px] font-bold leading-[0.98] tracking-tight">
            Headlines, distilled by AI.
          </h1>
          <p className="text-[15px] sm:text-base text-[var(--ink-soft)] mt-4 leading-relaxed">
            Real-time articles from {stats.sources || "dozens of"} sources, summarized to a sentence,
            scored for sentiment, and broken down into the insights that matter — all in one feed.
          </p>
        </section>

        <StatsBar stats={stats} />

        {noData ? (
          <EmptyState />
        ) : (
          <>
            <FilterBar sources={sources} categories={categories} />

            {featured && (
              <section className="mb-2">
                <ArticleCard article={featured} variant="featured" />
              </section>
            )}

            <div className="flex items-center justify-between mb-5 mt-2">
              <h2 className="eyebrow">
                {searchParams.q || sentiment || searchParams.source || searchParams.category
                  ? `${total.toLocaleString()} matching ${total === 1 ? "article" : "articles"}`
                  : "Latest stories"}
                {searchParams.q && (
                  <> for <span className="text-[var(--ink)] normal-case tracking-normal font-semibold">"{searchParams.q}"</span></>
                )}
              </h2>
              <span className="text-[12px] text-[var(--ink-faint)]">
                Page {page} of {totalPages}
              </span>
            </div>

            {empty ? (
              <div className="surface p-14 text-center">
                <div className="serif text-[22px] font-semibold mb-2">No matches</div>
                <p className="text-[var(--ink-soft)] text-sm">
                  Try a different search term or clear your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {grid.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} searchParams={searchParams} />
          </>
        )}

        <footer className="mt-20 pt-6 border-t border-[var(--line)] flex flex-wrap justify-between gap-3 text-[12px] text-[var(--ink-faint)]">
          <span>Built for the Datastraw AI + Tech intern assessment.</span>
          <span>NewsData.io → SQLite/Postgres → Claude → Next.js</span>
        </footer>
      </main>
    </>
  );
}

function isSentiment(v: string | undefined): v is Sentiment {
  return v === "positive" || v === "negative" || v === "neutral";
}
function isSort(v: string | undefined): v is SortKey {
  return v === "recent" || v === "positive" || v === "negative";
}

function Pagination({
  page, totalPages, searchParams,
}: {
  page: number; totalPages: number; searchParams: SearchParams;
}) {
  if (totalPages <= 1) return null;
  const buildHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") sp.set(k, v);
    }
    if (p > 1) sp.set("page", String(p));
    const q = sp.toString();
    return q ? `/?${q}` : "/";
  };
  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  // Build a compact page list: 1 … current-1 current current+1 … last
  const pages: (number | "…")[] = [];
  const add = (p: number) => { if (!pages.includes(p)) pages.push(p); };
  add(1);
  if (page - 1 > 2) pages.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) add(p);
  if (page + 1 < totalPages - 1) pages.push("…");
  if (totalPages > 1) add(totalPages);

  return (
    <nav className="flex justify-center items-center gap-1.5 mt-12" aria-label="pagination">
      <Link
        href={buildHref(prev)}
        className={`btn ${page === 1 ? "opacity-40 pointer-events-none" : ""}`}
        aria-disabled={page === 1}
      >
        ← Prev
      </Link>
      <div className="flex items-center gap-1 mx-2">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="text-[var(--ink-faint)] px-2">…</span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              className={`btn !px-3 !py-1 !text-[13px] ${p === page ? "btn-active" : ""}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          )
        )}
      </div>
      <Link
        href={buildHref(next)}
        className={`btn ${page === totalPages ? "opacity-40 pointer-events-none" : ""}`}
        aria-disabled={page === totalPages}
      >
        Next →
      </Link>
    </nav>
  );
}

function Logo() {
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center group-hover:rotate-3 transition-transform duration-300"
      style={{
        background: "linear-gradient(135deg, var(--ink), var(--accent))",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span className="serif text-[var(--bg-elevated)] text-[18px] font-bold leading-none">N</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface p-12 sm:p-16 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
           style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      </div>
      <h2 className="serif text-[28px] font-semibold mb-2">No articles yet</h2>
      <p className="text-[var(--ink-soft)] mb-6 max-w-md mx-auto">
        Run the pipeline to fetch articles from NewsData.io and let the AI generate
        summaries, sentiment scores, and key insights.
      </p>
      <pre className="inline-block text-left text-[13px] surface-soft px-5 py-3 rounded-md font-mono">
        npm run fetch-news
      </pre>
      <p className="text-[11px] text-[var(--ink-faint)] mt-4">
        Set <code>NEWSDATA_API_KEY</code> in <code>.env</code> first.{" "}
        <code>ANTHROPIC_API_KEY</code> is optional — without it, the lexicon fallback runs.
      </p>
    </div>
  );
}
