import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getDb().getStats();
  return NextResponse.json(stats);
}
