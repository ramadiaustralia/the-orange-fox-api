import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// GET: Fetch conversation (limited info for customer)
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400, headers: CORS });

  const { data, error } = await getSupabaseAdmin()
    .from("contact_messages")
    .select("name,email,subject,message,replies,created_at")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
  return NextResponse.json({ data }, { headers: CORS });
}

// POST: Customer submits a reply
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, message } = body;
  if (!id || !message?.trim()) {
    return NextResponse.json({ error: "ID and message required" }, { status: 400, headers: CORS });
  }

  const { data: current, error: fetchErr } = await getSupabaseAdmin()
    .from("contact_messages")
    .select("replies,status")
    .eq("id", id)
    .single();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Message not found" }, { status: 404, headers: CORS });
  }

  const replies = Array.isArray(current.replies) ? current.replies : [];
  replies.push({ type: "customer", message: message.trim(), timestamp: new Date().toISOString() });

  const { error: updateErr } = await getSupabaseAdmin()
    .from("contact_messages")
    .update({ replies, status: "unread" })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500, headers: CORS });
  return NextResponse.json({ success: true }, { headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
