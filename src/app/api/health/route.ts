import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/dbConnect";

/**
 * Liveness/readiness probe. Returns 200 when the DB connection is reachable,
 * 503 otherwise. Excluded from auth via the middleware matcher.
 */
export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ status: "ok", time: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "degraded", reason: "database" },
      { status: 503 },
    );
  }
}
