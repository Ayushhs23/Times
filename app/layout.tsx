import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Times — AI-curated headlines",
  description:
    "Real-time news fetched from NewsData.io, summarized and analyzed by AI. Search, filter by sentiment, explore key insights.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
