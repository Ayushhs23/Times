"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";

interface Props {
  sources: string[];
  categories: string[];
}

export default function FilterBar({ sources, categories }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const sentiment = params.get("sentiment") ?? "";
  const source = params.get("source") ?? "";
  const category = params.get("category") ?? "";
  const initialSearch = params.get("q") ?? "";

  const [search, setSearch] = useState(initialSearch);

  // Debounced search → URL
  useEffect(() => {
    if (search === initialSearch) return;
    const id = setTimeout(() => {
      update({ q: search || undefined });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function update(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    startTransition(() => router.push(`/?${sp.toString()}`));
  }

  return (
    <div className="card rounded-lg p-4 mb-6 space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <input
          className="input md:flex-1"
          placeholder="Search titles, summaries, descriptions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search articles"
        />
        <div className="flex gap-2">
          <SentimentBtn label="All" active={!sentiment} onClick={() => update({ sentiment: undefined })} />
          <SentimentBtn label="Positive" tone="pos" active={sentiment === "positive"} onClick={() => update({ sentiment: "positive" })} />
          <SentimentBtn label="Neutral" tone="neu" active={sentiment === "neutral"} onClick={() => update({ sentiment: "neutral" })} />
          <SentimentBtn label="Negative" tone="neg" active={sentiment === "negative"} onClick={() => update({ sentiment: "negative" })} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <select
          className="input md:max-w-[200px]"
          value={category}
          onChange={(e) => update({ category: e.target.value || undefined })}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="input md:max-w-[240px]"
          value={source}
          onChange={(e) => update({ source: e.target.value || undefined })}
          aria-label="Filter by source"
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {(search || sentiment || source || category) && (
          <button
            className="btn"
            onClick={() => {
              setSearch("");
              update({ q: undefined, sentiment: undefined, source: undefined, category: undefined });
            }}
          >
            Clear filters
          </button>
        )}
        {pending && <span className="text-xs text-[var(--ink-faint)] self-center">Updating…</span>}
      </div>
    </div>
  );
}

function SentimentBtn({
  label, tone, active, onClick,
}: {
  label: string; tone?: "pos" | "neu" | "neg"; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`btn ${active ? "btn-active" : ""}`} aria-pressed={active}>
      {tone && <span className={`dot dot-${tone}`} />}
      {label}
    </button>
  );
}
