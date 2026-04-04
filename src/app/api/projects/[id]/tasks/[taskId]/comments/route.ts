import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";
import { createNotificationBulk } from "@/lib/notifications";
import { logActivity } from "@/lib/activity";


// Get user's role in a project: 'commissioner' | 'leader' | 'member' | null
async function getProjectRole(projectId: string, userId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  return data?.role || null;
}

// GET: List all comments for a task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  try {
    // Verify project access
    const myRole = await getProjectRole(id, admin.sub);
    if (!myRole && admin.badge !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify task belongs to project
    const { data: task } = await getSupabaseAdmin()
      .from("project_tasks")
      .select("id")
      .eq("id", taskId)
      .eq("project_id", id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("project_task_comments")
      .select("*, user:admin_users!user_id(id, display_name, position, profile_pic_url)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ comments: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Create a new comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  try {
    // Verify project access (any member can comment)
    const myRole = await getProjectRole(id, admin.sub);
    if (!myRole && admin.badge !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Verify task belongs to project and get task title
    const { data: task } = await db
      .from("project_tasks")
      .select("id, title")
      .eq("id", taskId)
      .eq("project_id", id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create the comment
    const { data, error } = await db
      .from("project_task_comments")
      .insert({
        task_id: taskId,
        user_id: admin.sub,
        content: content.trim(),
      })
      .select("*, user:admin_users!user_id(id, display_name, position, profile_pic_url)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify task assignees about the comment
    const { data: assignees } = await db
      .from("project_task_assignees")
      .select("user_id")
      .eq("task_id", taskId);

    if (assignees && assignees.length > 0) {
      const notifications = assignees.map((a: { user_id: string }) => ({
        userId: a.user_id,
        actorId: admin.sub,
        type: "task_comment",
        projectId: id,
        taskId: taskId,
        title: task.title,
        message: `${admin.display_name} commented on task: "${task.title}"`,
      }));

      await createNotificationBulk(notifications);
    }

    // Log activity
    await logActivity({
      projectId: id,
      taskId: taskId,
      userId: admin.sub,
      action: "comment_added",
      details: { taskTitle: task.title },
    });

    return NextResponse.json({ comment: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Edit a comment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  try {
    // Verify project access
    const myRole = await getProjectRole(id, admin.sub);
    if (!myRole && admin.badge !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { commentId, content } = await req.json();

    if (!commentId || !content?.trim()) {
      return NextResponse.json({ error: "commentId and content are required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Fetch the comment to check ownership
    const { data: comment } = await db
      .from("project_task_comments")
      .select("user_id")
      .eq("id", commentId)
      .eq("task_id", taskId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the comment author can edit
    if (comment.user_id !== admin.sub) {
      return NextResponse.json({ error: "You can only edit your own comments" }, { status: 403 });
    }

    const { error } = await db
      .from("project_task_comments")
      .update({
        content: content.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Delete a comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("commentId");

  if (!commentId) {
    return NextResponse.json({ error: "commentId query param is required" }, { status: 400 });
  }

  try {
    // Verify project access
    const myRole = await getProjectRole(id, admin.sub);
    if (!myRole && admin.badge !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const db = getSupabaseAdmin();

    // Fetch the comment to check ownership
    const { data: comment } = await db
      .from("project_task_comments")
      .select("user_id")
      .eq("id", commentId)
      .eq("task_id", taskId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the comment author, commissioner, leader, or owner can delete
    const isPrivileged = myRole === "commissioner" || myRole === "leader" || admin.badge === "owner";
    if (!isPrivileged && comment.user_id !== admin.sub) {
      return NextResponse.json({ error: "You do not have permission to delete this comment" }, { status: 403 });
    }

    const { error } = await db
      .from("project_task_comments")
      .delete()
      .eq("id", commentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
