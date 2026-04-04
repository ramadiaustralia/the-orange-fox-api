import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page");

  let query = getSupabaseAdmin().from("site_content").select("*").order("section").order("content_key");
  if (page) query = query.eq("page", page);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badge = admin.badge || "staff";
  const body = await req.json();
  const section = body.section;

  // Only owner can modify site settings
  if (section === "site_settings" && badge !== "owner") {
    return NextResponse.json({ error: "Only the owner can modify site settings" }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("site_content")
    .upsert(
      {
        ...body,
        updated_by: admin.email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page,section,content_key,locale" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("site_content")
    .update({ ...updates, updated_by: admin.email, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
