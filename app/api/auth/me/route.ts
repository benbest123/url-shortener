import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  try {
    const rows = await query<{ email: string }>("SELECT email FROM users WHERE id = $1", [userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ email: rows[0].email }, { status: 200 });
  } catch (err: unknown) {
    console.error("Failed to fetch user", err);
    return NextResponse.json({ error: "failed to fetch user" }, { status: 500 });
  }
}
