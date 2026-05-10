# Submission — Datastraw AI + Tech Intern Assignment

**Candidate:** Ayush Suthar · sutharayush7@gmail.com
**Project:** Times — AI-Powered News Intelligence Platform

- **Live demo:** https://times-gamma.vercel.app
- **Source:** https://github.com/Ayushhs23/Times
- **Setup:** see [README.md](./README.md) — runs locally in under 5 minutes

---

## What's been built

A complete end-to-end news intelligence pipeline:

1. **Data pipeline** — paginated NewsData.io fetcher with retry/backoff,
   HTML cleanup, dedupe (article id + URL hash), and field validation.
2. **AI processing** — every article is sent to Claude (Anthropic
   Haiku 4.5) using a JSON-only system prompt that returns a 1-2 sentence
   summary, positive/neutral/negative sentiment with a continuous score
   (-1 to 1), 3-5 key insights, and 5-8 keywords. A lexicon-based
   fallback runs locally if no API key is set, so the demo works
   zero-config.
3. **Storage** — Node 22's built-in `node:sqlite` for local dev (zero
   install, no native compile) and PostgreSQL via `DATABASE_URL` for
   production. One adapter file, two backends, same schema.
4. **Dashboard** — Next.js 14 (App Router) + TypeScript + Tailwind.
   Editorial-style layout with sticky translucent header, featured-article
   hero, bidirectional sentiment bars on every card, segmented filter
   tabs (All / Positive / Neutral / Negative), sort modes (Recent / Most
   positive / Most negative), full-text search, category and source
   filters, paginated cards, and auto light/dark mode.
5. **API** — `GET /api/articles` (with `q`, `sentiment`, `source`,
   `category`, `sort`, `limit`, `offset`) and `GET /api/stats`.

---

## Approach & technology rationale

| Layer       | Choice                          | Why                                                                  |
| ----------- | ------------------------------- | -------------------------------------------------------------------- |
| Runtime     | Next.js 14 (App Router)         | One repo, server components + API routes + UI; Vercel-native         |
| Language    | TypeScript                      | Catches schema mismatches between fetcher / DB / UI                  |
| Storage     | `node:sqlite` → Postgres        | Zero local setup; production swap via env var only                   |
| AI          | Claude Haiku 4.5 (JSON mode)    | Fast, cheap, strong adherence to JSON schema; lexicon fallback       |
| Styling     | Tailwind + CSS variables        | Custom editorial design without heavy component library              |
| News source | NewsData.io                     | Free tier with category/language filters and pagination tokens       |
| Deployment  | Vercel + Neon (free tier)       | Both serverless, both free, auto-deploy on push                      |

The dual-backend storage layer was the single most useful design choice —
it let me iterate locally with SQLite at near-zero latency and ship to
Postgres without changing a line of application code.

---

## Most proud of

1. **Structured AI output, end-to-end** — Claude returns strict JSON,
   stored as first-class DB columns, rendered as collapsible insight
   cards with sentiment ribbons. No string parsing in the UI.
2. **The dual-backend storage layer** — `lib/db.ts` exposes one
   async interface; whether the runtime uses `node:sqlite` or `pg` is
   completely invisible to the rest of the app.
3. **The editorial UI** — featured-article hero, bidirectional sentiment
   bars, segmented filter tabs, sort modes, smooth fade-ins, sticky
   translucent header with live-pulse indicator, fully responsive,
   auto light/dark.

## What I'd add with more time

1. **Scheduled refresh** — Vercel Cron job hitting an authenticated
   endpoint to run the pipeline every few hours so the dashboard stays
   current without manual runs.
2. **Embeddings + topic clustering** — group related stories, surface
   trending topics, and add semantic search ("meaning-based" not just
   keyword).
3. **Trend timeline** — chart sentiment-over-time per topic so a user
   can see how a story's narrative shifts day-by-day.
4. **Article detail page** — full text, related articles via embedding
   similarity, ask-questions-of-the-article via RAG.
5. **Tests** — Vitest for the pipeline (mocked NewsData.io + Claude);
   Playwright for the dashboard.

---

## Pipeline run that populated production

- 120 articles fetched, deduped, analyzed, stored
- 12 categories indexed (top, sports, politics, business, technology,
  entertainment, lifestyle, environment, …)
- 89 distinct sources
- Sentiment: 49 positive · 48 neutral · 23 negative
- 100% AI processing success rate (0 fallback usages)
