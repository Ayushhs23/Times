import type { Stats } from "@/lib/types";

export default function StatsBar({ stats }: { stats: Stats }) {
  const totalSentiment = stats.positive + stats.neutral + stats.negative || 1;
  const pos = Math.round((stats.positive / totalSentiment) * 100);
  const neu = Math.round((stats.neutral / totalSentiment) * 100);
  const neg = 100 - pos - neu;

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Stat label="Articles indexed" value={stats.total.toLocaleString()} />
      <Stat label="Distinct sources" value={String(stats.sources)} />
      <Stat
        label="Last fetched"
        value={stats.lastFetched ? formatRelative(stats.lastFetched) : "—"}
      />
      <div className="card rounded-lg p-4">
        <div className="text-[11px] uppercase tracking-wider text-[var(--ink-faint)] mb-2">
          Sentiment mix
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-[var(--line)]">
          <div className="bg-emerald-500" style={{ width: `${pos}%` }} title={`positive ${pos}%`} />
          <div className="bg-slate-400" style={{ width: `${neu}%` }} title={`neutral ${neu}%`} />
          <div className="bg-rose-500" style={{ width: `${neg}%` }} title={`negative ${neg}%`} />
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-[var(--ink-faint)]">
          <span><span className="dot dot-pos mr-1" />{stats.positive}</span>
          <span><span className="dot dot-neu mr-1" />{stats.neutral}</span>
          <span><span className="dot dot-neg mr-1" />{stats.negative}</span>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
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
