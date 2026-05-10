import path from "node:path";
import fs from "node:fs";
import type { Article, ArticleQuery, Stats } from "./types";

/**
 * Database adapter — picks SQLite (local dev, zero setup) or Postgres
 * (production / Vercel) based on whether DATABASE_URL is set.
 *
 * Both backends expose the same surface so the rest of the app is
 * blissfully unaware of which one is running.
 */
export interface Db {
  init(): Promise<void>;
  upsertArticle(a: Article): Promise<void>;
  hasArticle(id: string): Promise<boolean>;
  listArticles(q: ArticleQuery): Promise<{ items: Article[]; total: number }>;
  getStats(): Promise<Stats>;
  distinct(field: "source" | "category"): Promise<string[]>;
}

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;
  cached = process.env.DATABASE_URL ? makePostgres() : makeSqlite();
  return cached;
}

// ---------------------------------------------------------------------------
// SQLite (better-sqlite3)
// ---------------------------------------------------------------------------

function makeSqlite(): Db {
  // Use Node 22+'s built-in node:sqlite — no native compile, no extra deps.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "news.db"));
  db.exec("PRAGMA journal_mode = WAL");

  const ready = (async () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        link TEXT NOT NULL,
        source TEXT,
        author TEXT,
        category TEXT,
        country TEXT,
        language TEXT,
        image_url TEXT,
        published_at TEXT,
        fetched_at TEXT NOT NULL,
        description TEXT,
        content TEXT,
        summary TEXT,
        sentiment TEXT,
        sentiment_score REAL,
        insights TEXT,
        keywords TEXT,
        ai_provider TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_articles_sentiment ON articles(sentiment);
      CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    `);
  })();

  // node:sqlite returns nulls as null and uses positional `?` bindings.
  const rowToArticle = (r: any): Article => ({
    ...r,
    insights: r.insights ? JSON.parse(r.insights) : [],
    keywords: r.keywords ? JSON.parse(r.keywords) : [],
  });

  // node:sqlite's StatementSync.run/get/all only accept positional params —
  // bind helper that turns named @keys into ? in declaration order.
  const insert = db.prepare(
    `INSERT INTO articles
      (id,title,link,source,author,category,country,language,image_url,
       published_at,fetched_at,description,content,summary,sentiment,
       sentiment_score,insights,keywords,ai_provider)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       summary=excluded.summary,
       sentiment=excluded.sentiment,
       sentiment_score=excluded.sentiment_score,
       insights=excluded.insights,
       keywords=excluded.keywords,
       ai_provider=excluded.ai_provider`
  );
  const checkStmt = db.prepare("SELECT 1 AS x FROM articles WHERE id = ?");

  return {
    async init() {
      await ready;
    },
    async upsertArticle(a) {
      await ready;
      insert.run(
        a.id, a.title, a.link, a.source, a.author, a.category, a.country, a.language,
        a.image_url, a.published_at, a.fetched_at, a.description, a.content, a.summary,
        a.sentiment, a.sentiment_score,
        JSON.stringify(a.insights ?? []),
        JSON.stringify(a.keywords ?? []),
        a.ai_provider
      );
    },
    async hasArticle(id) {
      await ready;
      return !!checkStmt.get(id);
    },
    async listArticles(q) {
      await ready;
      const where: string[] = [];
      const params: any[] = [];
      if (q.search) {
        where.push("(title LIKE ? OR description LIKE ? OR summary LIKE ?)");
        const like = `%${q.search}%`;
        params.push(like, like, like);
      }
      if (q.sentiment) {
        where.push("sentiment = ?");
        params.push(q.sentiment);
      }
      if (q.category) {
        where.push("category = ?");
        params.push(q.category);
      }
      if (q.source) {
        where.push("source = ?");
        params.push(q.source);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const total = (
        db.prepare(`SELECT COUNT(*) AS c FROM articles ${whereSql}`).get(...params) as any
      ).c as number;
      const limit = Math.min(q.limit ?? 30, 100);
      const offset = q.offset ?? 0;
      const rows = db
        .prepare(
          `SELECT * FROM articles ${whereSql}
           ORDER BY COALESCE(published_at, fetched_at) DESC
           LIMIT ? OFFSET ?`
        )
        .all(...params, limit, offset) as any[];
      return { items: rows.map(rowToArticle), total };
    },
    async getStats() {
      await ready;
      const total = (db.prepare("SELECT COUNT(*) AS c FROM articles").get() as any).c as number;
      const counts = db
        .prepare(
          "SELECT sentiment, COUNT(*) AS c FROM articles WHERE sentiment IS NOT NULL GROUP BY sentiment"
        )
        .all() as { sentiment: string; c: number }[];
      const byS: Record<string, number> = {};
      for (const r of counts) byS[r.sentiment] = r.c;
      const sources = (
        db.prepare("SELECT COUNT(DISTINCT source) AS c FROM articles WHERE source IS NOT NULL").get() as any
      ).c as number;
      const categories = db
        .prepare(
          `SELECT category AS name, COUNT(*) AS count FROM articles
           WHERE category IS NOT NULL AND category <> ''
           GROUP BY category ORDER BY count DESC LIMIT 12`
        )
        .all() as any[];
      const topSources = db
        .prepare(
          `SELECT source AS name, COUNT(*) AS count FROM articles
           WHERE source IS NOT NULL AND source <> ''
           GROUP BY source ORDER BY count DESC LIMIT 8`
        )
        .all() as any[];
      const lastRow = db
        .prepare("SELECT MAX(fetched_at) AS t FROM articles")
        .get() as any;
      return {
        total,
        positive: byS.positive ?? 0,
        neutral: byS.neutral ?? 0,
        negative: byS.negative ?? 0,
        sources,
        categories,
        topSources,
        lastFetched: lastRow?.t ?? null,
      };
    },
    async distinct(field) {
      await ready;
      const col = field === "source" ? "source" : "category";
      const rows = db
        .prepare(
          `SELECT DISTINCT ${col} AS v FROM articles
           WHERE ${col} IS NOT NULL AND ${col} <> ''
           ORDER BY ${col} ASC`
        )
        .all() as any[];
      return rows.map((r) => r.v as string);
    },
  };
}

// ---------------------------------------------------------------------------
// PostgreSQL (pg) — for Vercel / Neon / Supabase
// ---------------------------------------------------------------------------

function makePostgres(): Db {
  const { Pool } = require("pg") as typeof import("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: process.env.DATABASE_URL!.includes("sslmode=disable")
      ? false
      : { rejectUnauthorized: false },
    max: 5,
  });

  const ready = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        link TEXT NOT NULL,
        source TEXT,
        author TEXT,
        category TEXT,
        country TEXT,
        language TEXT,
        image_url TEXT,
        published_at TIMESTAMPTZ,
        fetched_at TIMESTAMPTZ NOT NULL,
        description TEXT,
        content TEXT,
        summary TEXT,
        sentiment TEXT,
        sentiment_score REAL,
        insights JSONB,
        keywords JSONB,
        ai_provider TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_articles_sentiment ON articles(sentiment);
      CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    `);
  })();

  const rowToArticle = (r: any): Article => ({
    ...r,
    published_at: r.published_at ? new Date(r.published_at).toISOString() : null,
    fetched_at: new Date(r.fetched_at).toISOString(),
    insights: Array.isArray(r.insights) ? r.insights : r.insights ? JSON.parse(r.insights) : [],
    keywords: Array.isArray(r.keywords) ? r.keywords : r.keywords ? JSON.parse(r.keywords) : [],
  });

  return {
    async init() {
      await ready;
    },
    async upsertArticle(a) {
      await ready;
      await pool.query(
        `INSERT INTO articles
          (id,title,link,source,author,category,country,language,image_url,
           published_at,fetched_at,description,content,summary,sentiment,
           sentiment_score,insights,keywords,ai_provider)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (id) DO UPDATE SET
           summary=EXCLUDED.summary,
           sentiment=EXCLUDED.sentiment,
           sentiment_score=EXCLUDED.sentiment_score,
           insights=EXCLUDED.insights,
           keywords=EXCLUDED.keywords,
           ai_provider=EXCLUDED.ai_provider`,
        [
          a.id, a.title, a.link, a.source, a.author, a.category, a.country, a.language,
          a.image_url, a.published_at, a.fetched_at, a.description, a.content, a.summary,
          a.sentiment, a.sentiment_score, JSON.stringify(a.insights ?? []),
          JSON.stringify(a.keywords ?? []), a.ai_provider,
        ]
      );
    },
    async hasArticle(id) {
      await ready;
      const r = await pool.query("SELECT 1 FROM articles WHERE id = $1", [id]);
      return r.rowCount! > 0;
    },
    async listArticles(q) {
      await ready;
      const where: string[] = [];
      const params: any[] = [];
      if (q.search) {
        params.push(`%${q.search}%`, `%${q.search}%`, `%${q.search}%`);
        const i = params.length;
        where.push(`(title ILIKE $${i - 2} OR description ILIKE $${i - 1} OR summary ILIKE $${i})`);
      }
      if (q.sentiment) {
        params.push(q.sentiment);
        where.push(`sentiment = $${params.length}`);
      }
      if (q.category) {
        params.push(q.category);
        where.push(`category = $${params.length}`);
      }
      if (q.source) {
        params.push(q.source);
        where.push(`source = $${params.length}`);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const totalRes = await pool.query(`SELECT COUNT(*)::int AS c FROM articles ${whereSql}`, params);
      const total = totalRes.rows[0].c as number;
      const limit = Math.min(q.limit ?? 30, 100);
      const offset = q.offset ?? 0;
      params.push(limit, offset);
      const rows = await pool.query(
        `SELECT * FROM articles ${whereSql}
         ORDER BY COALESCE(published_at, fetched_at) DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      return { items: rows.rows.map(rowToArticle), total };
    },
    async getStats() {
      await ready;
      const totalRes = await pool.query("SELECT COUNT(*)::int AS c FROM articles");
      const sRes = await pool.query(
        "SELECT sentiment, COUNT(*)::int AS c FROM articles WHERE sentiment IS NOT NULL GROUP BY sentiment"
      );
      const byS: Record<string, number> = {};
      for (const r of sRes.rows) byS[r.sentiment] = r.c;
      const sourcesRes = await pool.query(
        "SELECT COUNT(DISTINCT source)::int AS c FROM articles WHERE source IS NOT NULL"
      );
      const cats = await pool.query(
        `SELECT category AS name, COUNT(*)::int AS count FROM articles
         WHERE category IS NOT NULL AND category <> ''
         GROUP BY category ORDER BY count DESC LIMIT 12`
      );
      const tops = await pool.query(
        `SELECT source AS name, COUNT(*)::int AS count FROM articles
         WHERE source IS NOT NULL AND source <> ''
         GROUP BY source ORDER BY count DESC LIMIT 8`
      );
      const last = await pool.query("SELECT MAX(fetched_at) AS t FROM articles");
      return {
        total: totalRes.rows[0].c,
        positive: byS.positive ?? 0,
        neutral: byS.neutral ?? 0,
        negative: byS.negative ?? 0,
        sources: sourcesRes.rows[0].c,
        categories: cats.rows,
        topSources: tops.rows,
        lastFetched: last.rows[0]?.t ? new Date(last.rows[0].t).toISOString() : null,
      };
    },
    async distinct(field) {
      await ready;
      const col = field === "source" ? "source" : "category";
      const r = await pool.query(
        `SELECT DISTINCT ${col} AS v FROM articles
         WHERE ${col} IS NOT NULL AND ${col} <> ''
         ORDER BY ${col} ASC`
      );
      return r.rows.map((row) => row.v as string);
    },
  };
}
