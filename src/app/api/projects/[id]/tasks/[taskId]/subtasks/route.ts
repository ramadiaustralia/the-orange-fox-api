import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";
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

// GET: List all subtasks for a task
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
      .from("project_task_subtasks")
      .select(`
        *,
        assigned_user:admin_users!assigned_to(id, display_name, position, profile_pic_url),
        completed_by_user:admin_users!completed_by(id, display_name, position, profile_pic_url),
        created_by_user:admin_users!created_by(id, display_name, position, profile_pic_url)
      `)
      .eq("task_id", taskId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ subtasks: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Create a new subtask
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;

  // Only commissioner, leader, or owner can create subtasks
  const myRole = await getProjectRole(id, admin.sub);
  if (myRole !== "commissioner" && myRole !== "leader" && admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the commissioner or leader can create subtasks" }, { status: 403 });
  }

  try {
    const { title, assigned_to } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Verify task belongs to project
    const { data: task } = await db
      .from("project_tasks")
      .select("id, title")
      .eq("id", taskId)
      .eq("project_id", id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get current max sort_order for this task
    const { data: lastSubtask } = await db
      .from("project_task_subtasks")
      .select("sort_order")
      .eq("task_id", taskId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (lastSubtask?.sort_order ?? -1) + 1;

    const { data, error } = await db
      .from("project_task_subtasks")
      .insert({
        task_id: taskId,
        title: title.trim(),
        is_completed: false,
        assigned_to: assigned_to || null,
        created_by: admin.sub,
        sort_order: nextSortOrder,
      })
      .select(`
        *,
        assigned_user:admin_users!assigned_to(id, display_name, position, profile_pic_url),
        completed_by_user:admin_users!completed_by(id, display_name, position, profile_pic_url),
        created_by_user:admin_users!created_by(id, display_name, position, profile_pic_url)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    await logActivity({
      projectId: id,
      taskId: taskId,
      userId: admin.sub,
      action: "subtask_created",
      details: { title: title.trim() },
    });

    return NextResponse.json({ subtask: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update a subtask
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

    const { subtaskId, title, is_completed, assigned_to } = await req.json();

    if (!subtaskId) {
      return NextResponse.json({ error: "subtaskId is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Fetch the subtask
    const { data: subtask } = await db
      .from("project_task_subtasks")
      .select("*")
      .eq("id", subtaskId)
      .eq("task_id", taskId)
      .single();

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const isPrivileged = myRole === "commissioner" || myRole === "leader" || admin.badge === "owner";
    const isAssignedUser = subtask.assigned_to === admin.sub;

    // Permission checks
    if (title !== undefined || assigned_to !== undefined) {
      // Only commissioner, leader, or owner can change title and assigned_to
      if (!isPrivileged) {
        return NextResponse.json({ error: "Only the commissioner or leader can update subtask title and assignment" }, { status: 403 });
      }
    }

    if (is_completed !== undefined) {
      // Commissioner, leader, owner, or the assigned user can toggle completion
      if (!isPrivileged && !isAssignedUser) {
        return NextResponse.json({ error: "You do not have permission to toggle subtask completion" }, { status: 403 });
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (title !== undefined) updates.title = title.trim();
    if (assigned_to !== undefined) updates.assigned_to = assigned_to || null;

    if (is_completed !== undefined) {
      updates.is_completed = is_completed;
      if (is_completed === true) {
        updates.completed_by = admin.sub;
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_by = null;
        updates.completed_at = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await db
      .from("project_task_subtasks")
      .update(updates)
      .eq("id", subtaskId)
      .select(`
        *,
        assigned_user:admin_users!assigned_to(id, display_name, position, profile_pic_url),
        completed_by_user:admin_users!completed_by(id, display_name, position, profile_pic_url),
        created_by_user:admin_users!created_by(id, display_name, position, profile_pic_url)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity for completion toggle
    if (is_completed === true) {
      await logActivity({
        projectId: id,
        taskId: taskId,
        userId: admin.sub,
        action: "subtask_completed",
        details: { title: subtask.title },
      });
    }

    return NextResponse.json({ subtask: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Delete a subtask
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, taskId } = await params;
  const { searchParams } = new URL(req.url);
  const subtaskId = searchParams.get("subtaskId");

  if (!subtaskId) {
    return NextResponse.json({ error: "subtaskId query param is required" }, { status: 400 });
  }

  // Only commissioner, leader, or owner can delete subtasks
  const myRole = await getProjectRole(id, admin.sub);
  if (myRole !== "commissioner" && myRole !== "leader" && admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the commissioner or leader can delete subtasks" }, { status: 403 });
  }

  try {
    const db = getSupabaseAdmin();

    // Fetch the subtask for activity log
    const { data: subtask } = await db
      .from("project_task_subtasks")
      .select("title")
      .eq("id", subtaskId)
      .eq("task_id", taskId)
      .single();

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const { error } = await db
      .from("project_task_subtasks")
      .delete()
      .eq("id", subtaskId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    await logActivity({
      projectId: id,
      taskId: taskId,
      userId: admin.sub,
      action: "subtask_deleted",
      details: { title: subtask.title },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
