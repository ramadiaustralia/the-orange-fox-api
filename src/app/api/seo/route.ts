import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Convert schema_markup from DB (jsonb object) to string for client
function serializeSeo(data: Record<string, unknown> | null) {
  if (!data) return data;
  if (data.schema_markup && typeof data.schema_markup === "object") {
    return { ...data, schema_markup: JSON.stringify(data.schema_markup, null, 2) };
  }
  return data;
}

// Convert schema_markup from client (string) to JSON object for DB
function deserializeUpdates(updates: Record<string, unknown>) {
  if (updates.schema_markup && typeof updates.schema_markup === "string") {
    try {
      updates.schema_markup = JSON.parse(updates.schema_markup as string);
    } catch {
      // If invalid JSON, store as empty object
      updates.schema_markup = {};
    }
  }
  return updates;
}

export async function GET(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page");
  const type = searchParams.get("type");

  if (type === "analytics") {
    let q = getSupabaseAdmin().from("seo_analytics").select("*").order("recorded_at", { ascending: false });
    if (page) q = q.eq("page", page);
    const { data, error } = await q.limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (page) {
    const { data, error } = await getSupabaseAdmin().from("seo_settings").select("*").eq("page", page).single();
    if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: serializeSeo(data) });
  }

  const { data, error } = await getSupabaseAdmin().from("seo_settings").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data?.map(serializeSeo) });
}

export async function PATCH(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, page, ...rawUpdates } = body;
  const updates = deserializeUpdates(rawUpdates);

  if (id) {
    const { data, error } = await getSupabaseAdmin()
      .from("seo_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: serializeSeo(data) });
  }

  if (page) {
    const { data: existing } = await getSupabaseAdmin().from("seo_settings").select("id").eq("page", page).single();
    if (existing) {
      const { data, error } = await getSupabaseAdmin()
        .from("seo_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: serializeSeo(data) });
    } else {
      const { data, error } = await getSupabaseAdmin()
        .from("seo_settings")
        .insert({ page, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: serializeSeo(data) });
    }
  }

  return NextResponse.json({ error: "ID or page required" }, { status: 400 });
}
