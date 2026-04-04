import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";
import { createNotification, createNotificationBulk } from "@/lib/notifications";
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

    const comments = data || [];

    // Fetch reply_to data for comments that have reply_to_id
    const replyToIds = comments
      .filter((c: { reply_to_id?: string | null }) => c.reply_to_id)
      .map((c: { reply_to_id: string }) => c.reply_to_id);

    let replyToMap: Record<string, { id: string; content: string; user: { id: string; display_name: string } }> = {};

    if (replyToIds.length > 0) {
      const { data: replyComments } = await getSupabaseAdmin()
        .from("project_task_comments")
        .select("id, content, user:admin_users!user_id(id, display_name)")
        .in("id", replyToIds);

      if (replyComments) {
        for (const rc of replyComments) {
          const user = rc.user as unknown as { id: string; display_name: string };
          replyToMap[rc.id] = {
            id: rc.id,
            content: rc.content,
            user: { id: user.id, display_name: user.display_name },
          };
        }
      }
    }

    // Attach reply_to data to comments
    const enrichedComments = comments.map((comment: { reply_to_id?: string | null; [key: string]: unknown }) => ({
      ...comment,
      reply_to: comment.reply_to_id ? replyToMap[comment.reply_to_id] || null : null,
    }));

    return NextResponse.json({ comments: enrichedComments });
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

    const { content, reply_to_id, mentions } = await req.json();

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
    const insertData: {
      task_id: string;
      user_id: string;
      content: string;
      reply_to_id?: string;
      mentions?: string[];
    } = {
      task_id: taskId,
      user_id: admin.sub,
      content: content.trim(),
    };

    if (reply_to_id) {
      insertData.reply_to_id = reply_to_id;
    }

    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      insertData.mentions = mentions;
    }

    const { data, error } = await db
      .from("project_task_comments")
      .insert(insertData)
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

    // Notify mentioned users
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      // Filter out the comment author from mentions and any already-notified assignees
      const assigneeIds = new Set((assignees || []).map((a: { user_id: string }) => a.user_id));
      const mentionedUserIds = mentions.filter(
        (userId: string) => userId !== admin.sub && !assigneeIds.has(userId)
      );

      if (mentionedUserIds.length > 0) {
        const mentionNotifications = mentionedUserIds.map((userId: string) => ({
          userId,
          actorId: admin.sub,
          type: "mention",
          projectId: id,
          taskId: taskId,
          title: task.title,
          message: `${admin.display_name} mentioned you in a task comment on "${task.title}"`,
        }));

        await createNotificationBulk(mentionNotifications);
      }
    }

    // Send reply notification to original comment author
    if (reply_to_id) {
      const { data: originalComment } = await db
        .from("project_task_comments")
        .select("user_id")
        .eq("id", reply_to_id)
        .single();

      if (originalComment && originalComment.user_id !== admin.sub) {
        // Don't double-notify if already notified as an assignee or mentioned user
        const assigneeIds = new Set((assignees || []).map((a: { user_id: string }) => a.user_id));
        const mentionIds = new Set(
          mentions && Array.isArray(mentions) ? mentions : []
        );

        if (!assigneeIds.has(originalComment.user_id) && !mentionIds.has(originalComment.user_id)) {
          await createNotification({
            userId: originalComment.user_id,
            actorId: admin.sub,
            type: "comment_reply",
            projectId: id,
            taskId: taskId,
            title: task.title,
            message: `${admin.display_name} replied to your comment on task "${task.title}"`,
          });
        }
      }
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
