# News Intelligence

An AI-powered news dashboard. Fetches real-time articles from **NewsData.io**,
runs them through an AI pipeline (summary, sentiment, key insights), stores the
result in **SQLite or Postgres**, and serves a polished **Next.js** dashboard
with search, filters, and live stats.

Built for the Datastraw AI + Tech Intern assessment.

---

## Features

- **Data pipeline** — paginated NewsData.io fetcher with retry/backoff,
  HTML cleanup, dedupe (by article id + URL hash), and validation.
- **AI processing** — Claude (Anthropic) generates a 1-2 sentence summary,
  positive/neutral/negative sentiment with a continuous score, 3-5 key
  insights, and 5-8 keywords per article. Falls back to a built-in
  lexicon + extractive summarizer if no Claude key is set, so the demo
  works zero-config.
- **Storage** — Node's built-in **`node:sqlite`** (zero install, no native
  compile, single file) for local development; set `DATABASE_URL` to
  switch to Postgres for production deployments (Vercel + Neon /
  Supabase / Vercel Postgres). Requires Node.js **22.5+** (24+ recommended).
- **Dashboard** — responsive Next.js 14 app with full-text search,
  sentiment / category / source filters, paginated cards, sentiment-mix
  bar, and source/category stats. Server-rendered, dynamic, no client
  state library needed.
- **API** — `/api/articles` and `/api/stats` JSON endpoints.

---

## Quick start (under 5 minutes)

```bash
# 1. Clone and install
git clone <your-fork-url> news-intelligence
cd news-intelligence
npm install

# 2. Configure env
cp .env.example .env          # on Windows: copy .env.example .env
# Edit .env and paste your NEWSDATA_API_KEY (free at newsdata.io/register).
# ANTHROPIC_API_KEY is optional — the lexicon fallback works without it.

# 3. Pull articles + run AI pipeline
npm run fetch-news

# 4. Launch the dashboard
npm run dev
# open http://localhost:3000
```

That's it. The first run creates `./data/news.db`, fetches ~120 articles
(tunable via `FETCH_TARGET`), analyzes each one, and stores the results.
Re-run `npm run fetch-news` any time to add new articles — duplicates are
skipped automatically.

---

## Project structure

```
times/
├── app/                  # Next.js App Router
│   ├── api/articles/     # GET /api/articles  (search, filter, paginate)
│   ├── api/stats/        # GET /api/stats     (counts + breakdowns)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx          # dashboard (server component)
├── components/           # ArticleCard, FilterBar, StatsBar
├── lib/
│   ├── ai.ts             # Claude + lexicon-fallback analyzer
│   ├── db.ts             # SQLite ↔ Postgres adapter (one interface)
│   ├── newsdata.ts       # NewsData.io paginated fetcher
│   └── types.ts
├── scripts/
│   ├── fetch-news.ts     # one-shot pipeline runner
│   └── init-db.ts
├── data/                 # SQLite DB lands here (gitignored)
├── .env.example
└── package.json
```

---

## Configuration

| Variable             | Required | Default               | Purpose                                   |
| -------------------- | -------- | --------------------- | ----------------------------------------- |
| `NEWSDATA_API_KEY`   | yes      | —                     | NewsData.io key (free at newsdata.io)     |
| `ANTHROPIC_API_KEY`  | no       | unset → lexicon       | Enables Claude-powered AI                 |
| `DATABASE_URL`       | no       | unset → SQLite file   | Postgres connection string for prod       |
| `FETCH_TARGET`       | no       | 120                   | Articles per pipeline run                 |
| `FETCH_QUERY`        | no       | (none)                | NewsData.io `q` keyword                   |
| `FETCH_LANGUAGE`     | no       | en                    | Language code(s)                          |
| `FETCH_CATEGORY`     | no       | (any)                 | NewsData.io category (business, tech, …)  |

---

## How the AI works

When `ANTHROPIC_API_KEY` is set, every article is analyzed with
**Claude Haiku 4.5** using a tight JSON-only system prompt that returns:

```json
{
  "summary": "1-2 sentence neutral summary, ≤ 280 chars",
  "sentiment": "positive | neutral | negative",
  "sentiment_score": -1.0,
  "insights": ["3-5 short bullet insights"],
  "keywords": ["5-8 topical keywords or named entities"]
}
```

If the API call fails or no key is configured, a built-in fallback runs:

- **Sentiment** — count of words from a curated positive/negative lexicon
  scaled to [-1, 1] with a ±0.15 threshold for neutral.
- **Summary** — extractive: rank sentences by keyword-overlap and position,
  pick top 2, restore original order.
- **Insights** — pick distinct sentences anchored on the top keywords.
- **Keywords** — token-frequency after stopword removal.

This means **the demo works without any AI provider key**, while still
giving full Claude-powered output the moment a key is dropped in.

---

## Technology choices & rationale

| Layer       | Choice                                | Why                                                                 |
| ----------- | ------------------------------------- | ------------------------------------------------------------------- |
| Runtime     | Node.js + Next.js 14 (App Router)     | One repo, server components, API routes, Vercel-friendly            |
| Language    | TypeScript                            | Catches schema mismatches between fetcher / DB / UI                 |
| Storage     | `node:sqlite` (built-in) → Postgres   | Zero install, no native compile; drop-in Postgres for prod via `DATABASE_URL` |
| AI          | Anthropic Claude Haiku 4.5            | Fast, cheap, strong JSON-mode adherence; lexicon fallback for demos |
| Styling     | Tailwind CSS + tiny custom CSS vars   | Light/dark, no design system bloat                                  |
| News source | NewsData.io                           | Free tier with category/language filtering and pagination tokens    |

The SQLite/Postgres adapter is one file ([lib/db.ts](lib/db.ts)) and exposes
the same async interface for both backends — the rest of the app is unaware
of which one is active.

---

## Deploying to a public domain

### Option A — Vercel + Neon Postgres (recommended, free)

1. Push this repo to GitHub.
2. Create a free Postgres database at <https://neon.tech>. Copy the
   connection string (it includes `?sslmode=require`).
3. Go to <https://vercel.com>, click **Add New → Project**, import the repo.
4. In project settings → **Environment Variables**, add:
   - `NEWSDATA_API_KEY` — your NewsData.io key
   - `ANTHROPIC_API_KEY` — your Claude key (optional)
   - `DATABASE_URL` — the Neon connection string
5. Click **Deploy**. Vercel auto-detects Next.js.
6. Once deployed, populate the DB by running the pipeline locally against
   the production database:

   ```bash
   # in your local shell, set DATABASE_URL to the Neon string and run:
   DATABASE_URL="postgres://...neon.tech/..." npm run fetch-news
   ```

   On Windows PowerShell:
   ```powershell
   $env:DATABASE_URL = "postgres://...neon.tech/..."
   npm run fetch-news
   ```

7. Your dashboard is live at `https://<your-project>.vercel.app`.

### Option B — Render.com (keeps SQLite, free tier)

1. Push to GitHub.
2. Create a new **Web Service** at <https://render.com>, point it at the repo.
3. Build command: `npm install && npm run build`
4. Start command: `npm run start`
5. Add a **Persistent Disk** mounted at `/opt/render/project/src/data`
   (1 GB free) so the SQLite file survives deploys.
6. Set env vars: `NEWSDATA_API_KEY`, optionally `ANTHROPIC_API_KEY`.
7. After first deploy, open Render's shell and run `npm run fetch-news`
   to populate the DB.

### Option C — anywhere else

Anything that runs a Next.js app and gives you persistent storage (Railway,
Fly.io, a VPS) works. Set the env vars above and run `npm run fetch-news`
once on the box (or against the remote Postgres).

---

## What I'd add with more time

- **Scheduled refresh** — Vercel Cron or a worker running `fetch-news`
  every few hours so the dashboard stays current without manual runs.
- **Embeddings + topic clustering** — group related articles, surface
  trending topics, and add semantic search.
- **Trend timeline** — chart sentiment-by-day per topic.
- **Article detail page** — full text, related articles, deeper Q&A
  against the article body.
- **RSS / multi-source ingest** — go beyond NewsData.io and merge sources.
- **Tests** — Vitest for the pipeline (mocked API), Playwright for the UI.

---

## License

MIT.
