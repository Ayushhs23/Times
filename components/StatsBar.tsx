import type { Stats } from "@/lib/types";

export default function StatsBar({ stats }: { stats: Stats }) {
  const totalSentiment = stats.positive + stats.neutral + stats.negative || 1;
  const pos = (stats.positive / totalSentiment) * 100;
  const neu = (stats.neutral / totalSentiment) * 100;
  const neg = (stats.negative / totalSentiment) * 100;
  const fresh = stats.lastFetched
    ? (Date.now() - new Date(stats.lastFetched).getTime()) < 1000 * 60 * 60 * 6
    : false;

  return (
    <section className="surface mb-8 overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4">
        <Cell label="Articles indexed" value={stats.total.toLocaleString()} />
        <Cell label="Distinct sources" value={String(stats.sources)} />
        <Cell
          label="Last fetched"
          value={stats.lastFetched ? formatRelative(stats.lastFetched) : "—"}
          accent={fresh}
        />
        <div className="stat-cell">
          <div className="stat-label">Sentiment mix</div>
          <div className="mt-3 sentiment-meter">
            <div style={{ width: `${pos}%`, background: "var(--pos)" }} title={`positive ${Math.round(pos)}%`} />
            <div style={{ width: `${neu}%`, background: "var(--neu)" }} title={`neutral ${Math.round(neu)}%`} />
            <div style={{ width: `${neg}%`, background: "var(--neg)" }} title={`negative ${Math.round(neg)}%`} />
          </div>
          <div className="flex justify-between mt-2.5 text-[11px] text-[var(--ink-soft)] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="dot dot-pos" />{stats.positive}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="dot dot-neu" />{stats.neutral}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="dot dot-neg" />{stats.negative}
            </span>
          </div>
        </div>
      </div>

      {stats.categories.length > 0 && (
        <>
          <div className="divider" />
          <div className="px-5 py-3 flex items-center gap-3 overflow-x-auto">
            <span className="eyebrow flex-shrink-0">Top topics</span>
            <div className="flex gap-1.5">
              {stats.categories.slice(0, 8).map((c) => (
                <span key={c.name} className="chip whitespace-nowrap">
                  {c.name} <span className="text-[var(--ink-faint)] font-normal">·</span> {c.count}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="stat-cell">
      <div className="stat-label flex items-center gap-1.5">
        {accent && <span className="dot-live" />}
        {label}
      </div>
      <div className="stat-value serif">{value}</div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
