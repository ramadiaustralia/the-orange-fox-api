import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page");
  const type = searchParams.get("type");

  if (type === "analytics") {
    let q = supabaseAdmin.from("seo_analytics").select("*").order("recorded_at", { ascending: false });
    if (page) q = q.eq("page", page);
    const { data, error } = await q.limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (page) {
    const { data, error } = await supabaseAdmin.from("seo_settings").select("*").eq("page", page).single();
    if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const { data, error } = await supabaseAdmin.from("seo_settings").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, page, ...updates } = body;

  if (id) {
    const { data, error } = await supabaseAdmin
      .from("seo_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (page) {
    const { data: existing } = await supabaseAdmin.from("seo_settings").select("id").eq("page", page).single();
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("seo_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    } else {
      const { data, error } = await supabaseAdmin
        .from("seo_settings")
        .insert({ page, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
  }

  return NextResponse.json({ error: "ID or page required" }, { status: 400 });
}
