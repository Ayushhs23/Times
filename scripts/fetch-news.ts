import "dotenv/config";
import { fetchNews } from "../lib/newsdata";
import { analyze } from "../lib/ai";
import { getDb } from "../lib/db";

/**
 * One-shot pipeline: fetch -> dedupe -> analyze -> store.
 * Run via `npm run fetch-news`. Idempotent — re-running just adds new
 * articles and re-processes existing ones with fresh AI output.
 */
async function main() {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    console.error("Missing NEWSDATA_API_KEY in .env");
    process.exit(1);
  }
  const target = parseInt(process.env.FETCH_TARGET || "120", 10);
  const query = process.env.FETCH_QUERY || undefined;
  const language = process.env.FETCH_LANGUAGE || "en";
  const category = process.env.FETCH_CATEGORY || undefined;

  const provider = process.env.ANTHROPIC_API_KEY ? "Anthropic Claude" : "lexicon fallback";
  console.log(`\n  Times — news intelligence pipeline`);
  console.log(`  ──────────────────────────`);
  console.log(`  target articles : ${target}`);
  console.log(`  language        : ${language}`);
  console.log(`  query           : ${query ?? "(none)"}`);
  console.log(`  category        : ${category ?? "(any)"}`);
  console.log(`  AI              : ${provider}`);
  console.log(`  database        : ${process.env.DATABASE_URL ? "Postgres" : "SQLite (./data/news.db)"}`);
  console.log("");

  const db = getDb();
  await db.init();

  let fetched = 0;
  let skipped = 0;
  let stored = 0;
  let aiOk = 0;
  let aiFail = 0;
  const startedAt = Date.now();

  try {
    for await (const a of fetchNews({ apiKey, target, query, language, category })) {
      fetched++;
      if (await db.hasArticle(a.id)) {
        skipped++;
        process.stdout.write(`  · ${pad(fetched)} skip  ${truncate(a.title, 70)}\n`);
        continue;
      }
      try {
        const analysis = await analyze(a);
        a.summary = analysis.summary;
        a.sentiment = analysis.sentiment;
        a.sentiment_score = analysis.sentiment_score;
        a.insights = analysis.insights;
        a.keywords = analysis.keywords;
        a.ai_provider = analysis.provider;
        aiOk++;
      } catch (e: any) {
        aiFail++;
        console.warn(`    ai failure on "${a.title.slice(0, 40)}": ${e.message}`);
      }
      await db.upsertArticle(a);
      stored++;
      const tag = a.sentiment ? sentimentTag(a.sentiment) : "  ?";
      process.stdout.write(`  ${tag} ${pad(fetched)} save  ${truncate(a.title, 70)}\n`);
    }
  } catch (e: any) {
    console.error(`\nPipeline halted: ${e.message}`);
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n  Done in ${seconds}s — fetched ${fetched}, stored ${stored}, skipped (dedupe) ${skipped}`);
  console.log(`  AI: ${aiOk} ok, ${aiFail} failed\n`);
}

function pad(n: number): string {
  return String(n).padStart(3, " ");
}
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function sentimentTag(s: string): string {
  if (s === "positive") return "+ ";
  if (s === "negative") return "- ";
  return "= ";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
