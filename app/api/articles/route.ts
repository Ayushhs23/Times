import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Sentiment, SortKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sentimentParam = url.searchParams.get("sentiment");
  const sentiment = isSentiment(sentimentParam) ? sentimentParam : undefined;
  const sortParam = url.searchParams.get("sort");
  const sort = isSort(sortParam) ? sortParam : undefined;

  const limit = clamp(parseInt(url.searchParams.get("limit") || "30", 10), 1, 100);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

  const { items, total } = await getDb().listArticles({
    search: url.searchParams.get("q") || undefined,
    sentiment,
    source: url.searchParams.get("source") || undefined,
    category: url.searchParams.get("category") || undefined,
    sort,
    limit,
    offset,
  });
  return NextResponse.json({ total, items });
}

function isSentiment(v: string | null): v is Sentiment {
  return v === "positive" || v === "negative" || v === "neutral";
}
function isSort(v: string | null): v is SortKey {
  return v === "recent" || v === "positive" || v === "negative";
}
function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
