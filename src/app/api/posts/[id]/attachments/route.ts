import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: postId } = await params;

  try {
    const { attachments } = await req.json();
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return NextResponse.json({ error: "Attachments array is required" }, { status: 400 });
    }

    const records = attachments.map((a: { file_url: string; file_name: string; file_type: string; file_size: number }) => ({
      post_id: postId,
      file_url: a.file_url,
      file_name: a.file_name,
      file_type: a.file_type,
      file_size: a.file_size,
    }));

    const { data, error } = await getSupabaseAdmin()
      .from("post_attachments")
      .insert(records)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ attachments: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
