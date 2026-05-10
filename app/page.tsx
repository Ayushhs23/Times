import { getDb } from "@/lib/db";
import StatsBar from "@/components/StatsBar";
import FilterBar from "@/components/FilterBar";
import ArticleCard from "@/components/ArticleCard";
import type { Sentiment } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  sentiment?: string;
  source?: string;
  category?: string;
  page?: string;
}

const PAGE_SIZE = 24;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const db = getDb();
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const sentiment = isSentiment(searchParams.sentiment) ? searchParams.sentiment : undefined;

  const [{ items, total }, stats, sources, categories] = await Promise.all([
    db.listArticles({
      search: searchParams.q,
      sentiment,
      source: searchParams.source,
      category: searchParams.category,
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

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-8">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="serif text-3xl sm:text-4xl font-bold tracking-tight">
              News Intelligence
            </h1>
            <p className="text-sm text-[var(--ink-soft)] mt-1">
              Real-time headlines fetched from NewsData.io, summarized and analyzed by AI.
            </p>
          </div>
          <a
            href="https://github.com"
            className="text-xs uppercase tracking-wider text-[var(--ink-faint)] hover:text-[var(--ink)]"
          >
            view source ↗
          </a>
        </div>
      </header>

      <StatsBar stats={stats} />

      {noData ? (
        <EmptyState />
      ) : (
        <>
          <FilterBar sources={sources} categories={categories} />

          <div className="flex items-center justify-between mb-3 text-sm text-[var(--ink-faint)]">
            <span>
              {total.toLocaleString()} {total === 1 ? "article" : "articles"} match
              {searchParams.q ? ` "${searchParams.q}"` : ""}
            </span>
            <span>
              page {page} of {totalPages}
            </span>
          </div>

          {empty ? (
            <div className="card rounded-lg p-12 text-center text-[var(--ink-soft)]">
              No articles match these filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} searchParams={searchParams} />
        </>
      )}

      <footer className="mt-16 pt-6 border-t border-[var(--line)] text-xs text-[var(--ink-faint)] flex justify-between flex-wrap gap-2">
        <span>Built for the Datastraw AI + Tech intern assessment.</span>
        <span>Pipeline: NewsData.io → SQLite/Postgres → Claude / lexicon → Next.js</span>
      </footer>
    </main>
  );
}

function isSentiment(v: string | undefined): v is Sentiment {
  return v === "positive" || v === "negative" || v === "neutral";
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
  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <Link href={buildHref(prev)} className={`btn ${page === 1 ? "opacity-40 pointer-events-none" : ""}`}>← Prev</Link>
      <span className="text-sm text-[var(--ink-faint)] px-2">{page} / {totalPages}</span>
      <Link href={buildHref(next)} className={`btn ${page === totalPages ? "opacity-40 pointer-events-none" : ""}`}>Next →</Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card rounded-lg p-10 text-center">
      <h2 className="serif text-2xl font-semibold mb-2">No articles yet</h2>
      <p className="text-[var(--ink-soft)] mb-6 max-w-lg mx-auto">
        Run the pipeline to populate the database with articles from NewsData.io and AI-generated
        summaries, sentiment, and key insights.
      </p>
      <pre className="inline-block text-left text-sm bg-[var(--line)]/40 border border-[var(--line)] rounded px-4 py-3">
        <code>npm run fetch-news</code>
      </pre>
      <p className="text-xs text-[var(--ink-faint)] mt-4">
        Set <code>NEWSDATA_API_KEY</code> in <code>.env</code> first. <code>ANTHROPIC_API_KEY</code> is optional —
        without it the lexicon-based fallback will run.
      </p>
    </div>
  );
}
