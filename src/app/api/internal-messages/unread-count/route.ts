import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count, error } = await getSupabaseAdmin()
    .from("internal_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", admin.sub)
    .eq("is_read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: count || 0 });
}
