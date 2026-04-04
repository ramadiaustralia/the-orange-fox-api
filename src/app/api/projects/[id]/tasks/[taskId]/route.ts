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

// GET: Get single task with all details including attachments
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

    const { data, error } = await getSupabaseAdmin()
      .from("project_tasks")
      .select(`
        *,
        assignees:project_task_assignees(
          id,
          user:admin_users(id, display_name, position, profile_pic_url)
        ),
        created_by_user:admin_users!created_by(id, display_name, position, profile_pic_url),
        completed_by_user:admin_users!completed_by(id, display_name, position, profile_pic_url),
        attachments:project_task_attachments(
          id, file_url, file_name, file_type, file_size, uploaded_at,
          uploaded_by_user:admin_users!uploaded_by(id, display_name, position, profile_pic_url)
        )
      `)
      .eq("id", taskId)
      .eq("project_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update a task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  // Only commissioner/leader/owner can update tasks
  const myRole = await getProjectRole(id, admin.sub);
  if (myRole !== "commissioner" && myRole !== "leader" && admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the commissioner or leader can update tasks" }, { status: 403 });
  }

  try {
    const { title, description, priority, status, assigneeIds } = await req.json();

    const db = getSupabaseAdmin();

    // Get current task to check status changes
    const { data: currentTask } = await db
      .from("project_tasks")
      .select("status")
      .eq("id", taskId)
      .eq("project_id", id)
      .single();

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (priority !== undefined) updates.priority = priority;
    if (status !== undefined) {
      updates.status = status;
      // If status changed to 'completed': set completed_by and completed_at
      if (status === "completed" && currentTask.status !== "completed") {
        updates.completed_by = admin.sub;
        updates.completed_at = new Date().toISOString();
      }
      // If status changed FROM 'completed': clear completed_by and completed_at
      if (status !== "completed" && currentTask.status === "completed") {
        updates.completed_by = null;
        updates.completed_at = null;
      }
    }

    const { error: updateError } = await db
      .from("project_tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("project_id", id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Update assignees if provided
    if (assigneeIds !== undefined) {
      // Delete existing assignees
      await db
        .from("project_task_assignees")
        .delete()
        .eq("task_id", taskId);

      // Insert new assignees
      if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
        const assigneeRows = assigneeIds.map((userId: string) => ({
          task_id: taskId,
          user_id: userId,
        }));

        const { error: assigneeError } = await db
          .from("project_task_assignees")
          .insert(assigneeRows);

        if (assigneeError) return NextResponse.json({ error: assigneeError.message }, { status: 500 });
      }
    }

    // Fetch updated task with full details
    const { data: updatedTask, error: fetchError } = await db
      .from("project_tasks")
      .select(`
        *,
        assignees:project_task_assignees(
          id,
          user:admin_users(id, display_name, position, profile_pic_url)
        ),
        created_by_user:admin_users!created_by(id, display_name, position, profile_pic_url),
        completed_by_user:admin_users!completed_by(id, display_name, position, profile_pic_url)
      `)
      .eq("id", taskId)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    return NextResponse.json({ task: updatedTask });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Delete a task
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  // Only commissioner/leader/owner can delete tasks
  const myRole = await getProjectRole(id, admin.sub);
  if (myRole !== "commissioner" && myRole !== "leader" && admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the commissioner or leader can delete tasks" }, { status: 403 });
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from("project_tasks")
      .delete()
      .eq("id", taskId)
      .eq("project_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
