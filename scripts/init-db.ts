import "dotenv/config";
import { getDb } from "../lib/db";

/** Standalone: create tables/indexes without running the fetcher. */
async function main() {
  const db = getDb();
  await db.init();
  console.log(
    `Database initialized (${process.env.DATABASE_URL ? "Postgres" : "SQLite at ./data/news.db"}).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
