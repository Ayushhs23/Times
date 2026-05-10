import type { Article, Sentiment } from "./types";

export interface Analysis {
  summary: string;
  sentiment: Sentiment;
  sentiment_score: number;
  insights: string[];
  keywords: string[];
  provider: string;
}

const HAS_ANTHROPIC = !!process.env.ANTHROPIC_API_KEY;

export async function analyze(a: Article): Promise<Analysis> {
  const text = pickAnalyzableText(a);
  if (HAS_ANTHROPIC) {
    try {
      return await analyzeWithClaude(a, text);
    } catch (e: any) {
      console.warn(`[ai] Claude failed (${e.message}), falling back to lexicon`);
    }
  }
  return analyzeWithLexicon(a, text);
}

function pickAnalyzableText(a: Article): string {
  const parts = [a.title, a.description, a.content].filter(Boolean) as string[];
  return parts.join("\n\n").slice(0, 6000);
}

// ---------------------------------------------------------------------------
// Claude path
// ---------------------------------------------------------------------------

async function analyzeWithClaude(a: Article, text: string): Promise<Analysis> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const system = `You analyze news articles. Respond with ONLY valid JSON, no prose.
Schema:
{
  "summary": "1-2 sentence summary, <= 280 chars, neutral tone",
  "sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": number from -1 (very negative) to 1 (very positive),
  "insights": ["3-5 short bullet insights extracted from the article"],
  "keywords": ["5-8 short topical keywords or named entities"]
}`;

  const user = `Title: ${a.title}
Source: ${a.source ?? "unknown"}

Article body:
${text}`;

  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system,
    messages: [{ role: "user", content: user }],
  });

  const block = resp.content.find((c) => c.type === "text") as
    | { type: "text"; text: string }
    | undefined;
  if (!block) throw new Error("Claude returned no text block");
  const json = extractJson(block.text);
  return {
    summary: String(json.summary ?? "").trim() || a.title,
    sentiment: normalizeSentiment(json.sentiment),
    sentiment_score: clamp(Number(json.sentiment_score) || 0, -1, 1),
    insights: cleanList(json.insights, 5),
    keywords: cleanList(json.keywords, 8),
    provider: "anthropic:haiku-4.5",
  };
}

function extractJson(s: string): any {
  const match = s.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object in Claude response");
  return JSON.parse(match[0]);
}

function normalizeSentiment(v: unknown): Sentiment {
  const s = String(v ?? "").toLowerCase();
  if (s === "positive" || s === "negative" || s === "neutral") return s;
  return "neutral";
}

function cleanList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x).replace(/\s+/g, " ").trim())
    .filter((x) => x.length > 0 && x.length < 240)
    .slice(0, max);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ---------------------------------------------------------------------------
// Lexicon fallback — good enough to demo the dashboard with no API key
// ---------------------------------------------------------------------------

const POSITIVE_WORDS = new Set<string>([
  "good", "great", "excellent", "positive", "wins", "win", "won", "success", "successful",
  "growth", "boost", "boosts", "boosted", "surge", "surged", "soar", "soared", "rally",
  "rallied", "gain", "gains", "gained", "rise", "rises", "rose", "improve", "improved",
  "improvement", "record", "milestone", "breakthrough", "innovative", "innovation",
  "celebrate", "celebrated", "praise", "praised", "approve", "approved", "approval",
  "agreement", "deal", "partnership", "launch", "launched", "expand", "expanded",
  "profit", "profits", "profitable", "strong", "stronger", "strongest", "thrive",
  "thriving", "support", "supports", "supported", "endorse", "endorsed", "advance",
  "advanced", "boom", "booming", "outperform", "outperformed", "beat", "beats", "beaten",
  "rebound", "rebounded", "recover", "recovered", "recovery", "victory", "triumph",
  "encourage", "encouraging", "favorable", "promising", "optimistic", "optimism",
  "hopeful", "hope", "joy", "joyful", "happy", "delighted", "elated", "loved", "love",
]);

const NEGATIVE_WORDS = new Set<string>([
  "bad", "worse", "worst", "negative", "loss", "losses", "lost", "lose", "fail", "fails",
  "failed", "failure", "crisis", "crash", "crashed", "plunge", "plunged", "fall", "fell",
  "drop", "dropped", "decline", "declined", "decrease", "decreased", "slump", "slumped",
  "killed", "kill", "death", "deaths", "die", "died", "dying", "fatal", "fatality",
  "violence", "violent", "attack", "attacked", "attacks", "war", "wars", "conflict",
  "conflicts", "fight", "fighting", "weapon", "weapons", "bomb", "bombing", "bombed",
  "shooting", "shot", "shoots", "fire", "fired", "fires", "burn", "burned", "burning",
  "destroy", "destroyed", "destruction", "damage", "damaged", "danger", "dangerous",
  "threat", "threats", "threaten", "threatened", "fear", "fears", "feared", "worry",
  "worried", "concerns", "concerned", "tragic", "tragedy", "disaster", "disastrous",
  "outbreak", "pandemic", "epidemic", "shortage", "scandal", "fraud", "corruption",
  "investigation", "investigated", "arrested", "arrest", "arrests", "charged", "guilty",
  "convicted", "criminal", "crime", "abuse", "abused", "victim", "victims", "wound",
  "wounded", "injured", "injury", "hurt", "ill", "illness", "sick", "disease", "ban",
  "banned", "rejected", "reject", "denied", "deny", "warn", "warning", "warned", "alarm",
  "alarming", "tension", "tensions", "protest", "protests", "outrage", "outraged",
  "controversy", "controversial", "scandalous", "lawsuit", "sued", "fine", "fined",
  "fined", "downgrade", "downgraded", "weak", "weaker", "weakest", "stagnant", "stalled",
  "halt", "halted", "block", "blocked", "blockage", "shutdown", "layoff", "layoffs",
  "fired", "firings", "bankrupt", "bankruptcy",
]);

const STOPWORDS = new Set<string>([
  "the","a","an","and","or","but","if","then","else","of","at","by","for","with","about",
  "against","between","into","through","during","before","after","above","below","to","from",
  "up","down","in","out","on","off","over","under","again","further","once","here","there",
  "when","where","why","how","all","any","both","each","few","more","most","other","some",
  "such","no","nor","not","only","own","same","so","than","too","very","s","t","can","will",
  "just","don","should","now","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","this","that","these","those","i","me","my","we","our","us","you","your",
  "he","him","his","she","her","it","its","they","them","their","what","which","who","whom",
  "as","also","said","says","say","saying","new","one","two","three","first","second","last",
  "year","years","day","days","week","weeks","month","months","time","times","percent",
]);

function analyzeWithLexicon(a: Article, text: string): Analysis {
  const tokens = tokenize(text);
  let pos = 0;
  let neg = 0;
  for (const w of tokens) {
    if (POSITIVE_WORDS.has(w)) pos++;
    else if (NEGATIVE_WORDS.has(w)) neg++;
  }
  const total = pos + neg;
  let sentiment: Sentiment = "neutral";
  let score = 0;
  if (total > 0) {
    score = (pos - neg) / Math.max(total, 5);
    score = clamp(score, -1, 1);
    if (score > 0.15) sentiment = "positive";
    else if (score < -0.15) sentiment = "negative";
  }

  const summary = extractiveSummary(a, text);
  const keywords = topKeywords(tokens, 8);
  const insights = extractInsights(a, text, keywords);

  return {
    summary,
    sentiment,
    sentiment_score: Number(score.toFixed(3)),
    insights,
    keywords,
    provider: "fallback:lexicon",
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function topKeywords(tokens: string[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 360);
}

function extractiveSummary(a: Article, text: string): string {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return (a.description || a.title).slice(0, 280);
  }
  // Score: presence of keywords + early position bonus.
  const tokens = tokenize(text);
  const kw = new Set(topKeywords(tokens, 12));
  const scored = sentences.map((s, i) => {
    const sToks = tokenize(s);
    const overlap = sToks.filter((t) => kw.has(t)).length;
    const positionBonus = Math.max(0, 5 - i) * 0.5;
    return { s, score: overlap + positionBonus };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked = scored
    .slice(0, 2)
    // restore original order so the summary reads naturally
    .sort((a, b) => sentences.indexOf(a.s) - sentences.indexOf(b.s))
    .map((x) => x.s);
  let summary = picked.join(" ");
  if (summary.length > 320) summary = summary.slice(0, 317) + "...";
  return summary || a.title;
}

function extractInsights(a: Article, text: string, keywords: string[]): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];
  // Take up to 4 distinct sentences that mention different keywords.
  const used = new Set<string>();
  const picked: string[] = [];
  for (const kw of keywords) {
    if (picked.length >= 4) break;
    const found = sentences.find(
      (s) => !used.has(s) && s.toLowerCase().includes(kw)
    );
    if (found) {
      picked.push(found.length > 200 ? found.slice(0, 197) + "..." : found);
      used.add(found);
    }
  }
  // If we couldn't find keyword-anchored sentences, fall back to first few.
  if (picked.length < 3) {
    for (const s of sentences) {
      if (picked.length >= 3) break;
      if (!used.has(s)) {
        picked.push(s.length > 200 ? s.slice(0, 197) + "..." : s);
        used.add(s);
      }
    }
  }
  return picked;
}
