import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();
  const badge = admin.badge || "staff";

  // Check post exists and verify ownership
  const { data: post, error: fetchError } = await db
    .from("posts")
    .select("id, author_id")
    .eq("id", id)
    .single();

  if (fetchError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Only author or owner/board badge can delete
  if (post.author_id !== admin.sub && badge !== "owner" && badge !== "board") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete related records first
  await db.from("post_likes").delete().eq("post_id", id);
  
  // Delete comment likes for all comments on this post
  const { data: commentIds } = await db
    .from("post_comments")
    .select("id")
    .eq("post_id", id);
  
  if (commentIds && commentIds.length > 0) {
    const ids = commentIds.map((c: { id: string }) => c.id);
    await db.from("comment_likes").delete().in("comment_id", ids);
  }

  await db.from("post_comments").delete().eq("post_id", id);
  await db.from("post_attachments").delete().eq("post_id", id);
  await db.from("notifications").delete().eq("post_id", id);

  const { error } = await db.from("posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;
  const badge = admin.badge || "staff";

  const db = getSupabaseAdmin();

  // Handle edit action
  if (action === "edit") {
    const { content } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Fetch the post to verify ownership
    const { data: post, error: fetchError } = await db
      .from("posts")
      .select("id, author_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Only the author can edit their own post
    if (post.author_id !== admin.sub) {
      return NextResponse.json({ error: "Forbidden: only the author can edit this post" }, { status: 403 });
    }

    // Determine the new status after edit
    const updateData: Record<string, unknown> = {
      content: content.trim(),
      edited_at: new Date().toISOString(),
    };

    // Owner/Board keep approved status; Manager/Staff go back to pending
    if (badge === "owner" || badge === "board") {
      // Keep status as approved (no change needed)
    } else {
      updateData.status = "pending";
    }

    const { data, error } = await db
      .from("posts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ post: data });
  }

  // Handle approve/reject action
  const { status } = body;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Get the post to check author's badge
  const { data: post, error: postError } = await db
    .from("posts")
    .select("id, author_id")
    .eq("id", id)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Get the author's badge
  const { data: authorData } = await db
    .from("admin_users")
    .select("badge")
    .eq("id", post.author_id)
    .single();

  const authorBadge = authorData?.badge || "staff";

  // Review permission logic:
  // - Owner can review any post
  // - Board can review posts by Manager and Staff (NOT owner or other board posts)
  // - Manager can review posts by Staff only (NOT owner or board)
  // - Staff CANNOT review
  if (badge === "owner") {
    // Owner can review any post — allowed
  } else if (badge === "board") {
    if (authorBadge === "owner" || authorBadge === "board") {
      return NextResponse.json({ error: "Board members cannot review owner or other board posts" }, { status: 403 });
    }
  } else if (badge === "manager") {
    if (authorBadge !== "staff") {
      return NextResponse.json({ error: "Managers can only review staff posts" }, { status: 403 });
    }
  } else {
    // Staff cannot review
    return NextResponse.json({ error: "Staff cannot review posts" }, { status: 403 });
  }

  const { data, error } = await db
    .from("posts")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}
