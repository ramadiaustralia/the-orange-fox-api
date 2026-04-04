import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


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

// Check if user is assigned to a specific task
async function isTaskAssignee(taskId: string, userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from("project_task_assignees")
    .select("id")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

// GET: List attachments for a task
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

    // Verify the task belongs to this project
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
      .from("project_task_attachments")
      .select(`
        *,
        uploaded_by_user:admin_users!uploaded_by(id, display_name, position, profile_pic_url)
      `)
      .eq("task_id", taskId)
      .order("uploaded_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ attachments: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Record a new attachment (file already uploaded via signed URL)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  try {
    // Check project access and role
    const myRole = await getProjectRole(id, admin.sub);
    if (!myRole && admin.badge !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify the task belongs to this project
    const { data: task } = await getSupabaseAdmin()
      .from("project_tasks")
      .select("id")
      .eq("id", taskId)
      .eq("project_id", id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Only assignees, commissioner, leader, or owner can upload attachments
    const isPrivileged = myRole === "commissioner" || myRole === "leader" || admin.badge === "owner";
    if (!isPrivileged) {
      const assignee = await isTaskAssignee(taskId, admin.sub);
      if (!assignee) {
        return NextResponse.json({ error: "Only task assignees or project leaders can upload attachments" }, { status: 403 });
      }
    }

    const { fileUrl, fileName, fileType, fileSize } = await req.json();

    if (!fileUrl || !fileName) {
      return NextResponse.json({ error: "fileUrl and fileName are required" }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("project_task_attachments")
      .insert({
        task_id: taskId,
        uploaded_by: admin.sub,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType || null,
        file_size: fileSize || null,
      })
      .select(`
        *,
        uploaded_by_user:admin_users!uploaded_by(id, display_name, position, profile_pic_url)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ attachment: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Delete an attachment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;
  const { searchParams } = new URL(req.url);
  const attachmentId = searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json({ error: "attachmentId query param is required" }, { status: 400 });
  }

  try {
    // Verify project access
    const myRole = await getProjectRole(id, admin.sub);
    if (!myRole && admin.badge !== "owner") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const db = getSupabaseAdmin();

    // Fetch the attachment to check ownership
    const { data: attachment } = await db
      .from("project_task_attachments")
      .select("uploaded_by")
      .eq("id", attachmentId)
      .eq("task_id", taskId)
      .single();

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Only the uploader, commissioner, leader, or owner can delete
    const isPrivileged = myRole === "commissioner" || myRole === "leader" || admin.badge === "owner";
    if (!isPrivileged && attachment.uploaded_by !== admin.sub) {
      return NextResponse.json({ error: "You can only delete your own attachments" }, { status: 403 });
    }

    const { error } = await db
      .from("project_task_attachments")
      .delete()
      .eq("id", attachmentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
