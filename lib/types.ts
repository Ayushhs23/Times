export type Sentiment = "positive" | "neutral" | "negative";

export interface Article {
  id: string;
  title: string;
  link: string;
  source: string | null;
  author: string | null;
  category: string | null;
  country: string | null;
  language: string | null;
  image_url: string | null;
  published_at: string | null;
  fetched_at: string;
  description: string | null;
  content: string | null;
  summary: string | null;
  sentiment: Sentiment | null;
  sentiment_score: number | null;
  insights: string[];
  keywords: string[];
  ai_provider: string | null;
}

export interface ArticleQuery {
  search?: string;
  sentiment?: Sentiment;
  category?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface Stats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  sources: number;
  categories: { name: string; count: number }[];
  topSources: { name: string; count: number }[];
  lastFetched: string | null;
}
