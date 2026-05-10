import crypto from "node:crypto";
import type { Article } from "./types";

interface NewsDataResponse {
  status: string;
  totalResults?: number;
  results?: NewsDataItem[];
  nextPage?: string;
  message?: string;
}

interface NewsDataItem {
  article_id?: string;
  title?: string;
  link?: string;
  source_id?: string;
  source_name?: string;
  creator?: string[] | null;
  category?: string[] | null;
  country?: string[] | null;
  language?: string;
  image_url?: string | null;
  pubDate?: string;
  description?: string | null;
  content?: string | null;
}

interface FetchOptions {
  apiKey: string;
  target: number;
  query?: string;
  language?: string;
  category?: string;
}

export async function* fetchNews(opts: FetchOptions): AsyncGenerator<Article> {
  const base = "https://newsdata.io/api/1/latest";
  let nextPage: string | undefined;
  let yielded = 0;
  let pageNum = 0;

  while (yielded < opts.target) {
    pageNum++;
    const url = new URL(base);
    url.searchParams.set("apikey", opts.apiKey);
    if (opts.query) url.searchParams.set("q", opts.query);
    if (opts.language) url.searchParams.set("language", opts.language);
    if (opts.category) url.searchParams.set("category", opts.category);
    if (nextPage) url.searchParams.set("page", nextPage);

    let res: Response;
    try {
      res = await fetch(url, { headers: { "User-Agent": "times/1.0" } });
    } catch (e: any) {
      throw new Error(`NewsData.io network error on page ${pageNum}: ${e.message}`);
    }

    if (res.status === 429) {
      console.warn(`Rate limited on page ${pageNum}, sleeping 2s and retrying once`);
      await new Promise((r) => setTimeout(r, 2000));
      res = await fetch(url);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`NewsData.io HTTP ${res.status} on page ${pageNum}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as NewsDataResponse;
    if (data.status !== "success") {
      throw new Error(`NewsData.io error: ${data.message ?? "unknown"}`);
    }
    const results = data.results ?? [];
    if (results.length === 0) return;

    for (const r of results) {
      const a = normalize(r);
      if (!a) continue;
      yield a;
      yielded++;
      if (yielded >= opts.target) return;
    }

    if (!data.nextPage) return;
    nextPage = data.nextPage;
    // Be polite to the free tier.
    await new Promise((r) => setTimeout(r, 350));
  }
}

function normalize(r: NewsDataItem): Article | null {
  const title = clean(r.title);
  const link = r.link?.trim();
  if (!title || !link) return null;
  // NewsData.io occasionally repeats `[Removed]` / very short noise; skip.
  if (title.length < 8) return null;

  const id = r.article_id?.trim() || hashId(link);
  const description = clean(r.description) || null;
  const content = clean(r.content) || null;
  // Some items have content === "ONLY AVAILABLE IN PAID PLANS"; treat as empty.
  const usableContent =
    content && /only available in paid/i.test(content) ? null : content;

  return {
    id,
    title,
    link,
    source: r.source_name?.trim() || r.source_id?.trim() || null,
    author: Array.isArray(r.creator) ? r.creator.filter(Boolean).join(", ") || null : null,
    category: pickFirst(r.category),
    country: pickFirst(r.country),
    language: r.language?.trim() || null,
    image_url: r.image_url?.trim() || null,
    published_at: parseDate(r.pubDate),
    fetched_at: new Date().toISOString(),
    description,
    content: usableContent,
    summary: null,
    sentiment: null,
    sentiment_score: null,
    insights: [],
    keywords: [],
    ai_provider: null,
  };
}

function clean(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\s+/g, " ").replace(/<[^>]+>/g, "").trim();
}

function pickFirst(v: string[] | null | undefined): string | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  return v[0]?.trim() || null;
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const d = new Date(s.replace(" ", "T") + (s.includes("Z") || s.includes("+") ? "" : "Z"));
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function hashId(seed: string): string {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 16);
}
