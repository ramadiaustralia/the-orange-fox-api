import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

async function isProjectMemberOrOwner(projectId: string, userId: string, role: string): Promise<boolean> {
  if (role === "owner") return true;
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hasAccess = await isProjectMemberOrOwner(id, admin.sub, admin.role);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("project_messages")
      .select("*, sender:admin_users!sender_id(id, display_name, position, profile_pic_url)")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ messages: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hasAccess = await isProjectMemberOrOwner(id, admin.sub, admin.role);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { content, attachmentUrl, attachmentName, attachmentType, attachmentSize } = await req.json();

    if (!content?.trim() && !attachmentUrl) {
      return NextResponse.json({ error: "Content or attachment is required" }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("project_messages")
      .insert({
        project_id: id,
        sender_id: admin.sub,
        content: content?.trim() || "",
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        attachment_type: attachmentType || null,
        attachment_size: attachmentSize || null,
      })
      .select("*, sender:admin_users!sender_id(id, display_name, position, profile_pic_url)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hasAccess = await isProjectMemberOrOwner(id, admin.sub, admin.role);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { messageId, content } = await req.json();

    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: "messageId and content are required" }, { status: 400 });
    }

    // Verify the message belongs to the current user
    const { data: existingMsg } = await getSupabaseAdmin()
      .from("project_messages")
      .select("sender_id")
      .eq("id", messageId)
      .eq("project_id", id)
      .single();

    if (!existingMsg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existingMsg.sender_id !== admin.sub) {
      return NextResponse.json({ error: "You can only edit your own messages" }, { status: 403 });
    }

    const { error } = await getSupabaseAdmin()
      .from("project_messages")
      .update({
        content: content.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
