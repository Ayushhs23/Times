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
  const sort = params.get("sort") ?? "recent";
  const initialSearch = params.get("q") ?? "";

  const [search, setSearch] = useState(initialSearch);

  // Debounced search → URL
  useEffect(() => {
    if (search === initialSearch) return;
    const id = setTimeout(() => update({ q: search || undefined }), 300);
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

  const hasActiveFilters = !!(search || sentiment || source || category || (sort && sort !== "recent"));

  return (
    <div className="surface mb-7 p-4 sm:p-5 fade-in">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative lg:flex-1">
          <SearchIcon />
          <input
            className="input !pl-10"
            placeholder="Search titles, summaries, descriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search articles"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); update({ q: undefined }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink)] text-lg leading-none"
              aria-label="Clear search"
            >×</button>
          )}
        </div>

        <SegmentedTabs
          options={[
            { value: "", label: "All" },
            { value: "positive", label: "Positive", tone: "pos" },
            { value: "neutral", label: "Neutral", tone: "neu" },
            { value: "negative", label: "Negative", tone: "neg" },
          ]}
          value={sentiment}
          onChange={(v) => update({ sentiment: v || undefined })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--line)]">
        <select
          className="input !py-2 !text-[13px] max-w-[180px]"
          value={category}
          onChange={(e) => update({ category: e.target.value || undefined })}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        <select
          className="input !py-2 !text-[13px] max-w-[220px]"
          value={source}
          onChange={(e) => update({ source: e.target.value || undefined })}
          aria-label="Filter by source"
        >
          <option value="">All sources</option>
          {sources.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <span className="eyebrow hidden sm:inline">Sort by</span>
          <SegmentedTabs
            small
            options={[
              { value: "recent", label: "Recent" },
              { value: "positive", label: "Most positive" },
              { value: "negative", label: "Most negative" },
            ]}
            value={sort}
            onChange={(v) => update({ sort: v === "recent" ? undefined : v })}
          />
          {hasActiveFilters && (
            <button
              className="btn-ghost"
              onClick={() => {
                setSearch("");
                update({ q: undefined, sentiment: undefined, source: undefined, category: undefined, sort: undefined });
              }}
            >
              Clear
            </button>
          )}
          {pending && <span className="text-[11px] text-[var(--ink-faint)]">Updating…</span>}
        </div>
      </div>
    </div>
  );
}

interface SegOption { value: string; label: string; tone?: "pos" | "neu" | "neg" }

function SegmentedTabs({
  options, value, onChange, small,
}: {
  options: SegOption[]; value: string; onChange: (v: string) => void; small?: boolean;
}) {
  return (
    <div
      className="inline-flex rounded-lg p-0.5 gap-0.5"
      style={{ background: "var(--bg-tint)", border: "1px solid var(--line)" }}
      role="tablist"
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-md transition-all ${
              small ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]"
            }`}
            style={
              active
                ? { background: "var(--bg-elevated)", color: "var(--ink)", boxShadow: "var(--shadow-sm)", fontWeight: 500 }
                : { color: "var(--ink-soft)" }
            }
          >
            {o.tone && <span className={`dot dot-${o.tone}`} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]"
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
