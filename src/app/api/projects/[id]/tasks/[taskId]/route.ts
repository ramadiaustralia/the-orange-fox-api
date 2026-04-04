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
          user_id,
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

    // Transform field names to match frontend expectations
    const { created_by_user, completed_by_user, attachments, ...taskFields } = data as any;
    const transformedTask = {
      ...taskFields,
      creator: created_by_user,
      completer: completed_by_user,
      attachments: (attachments || []).map(({ uploaded_by_user, ...att }: any) => ({
        ...att,
        uploader: uploaded_by_user,
      })),
    };

    return NextResponse.json({ task: transformedTask });
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
    const { title, description, priority, status, assigneeIds, deadline, status_change_permission } = await req.json();

    const db = getSupabaseAdmin();

    // Get current task to check status changes and permissions
    const { data: currentTask } = await db
      .from("project_tasks")
      .select("status, status_change_permission, created_by, title")
      .eq("id", taskId)
      .eq("project_id", id)
      .single();

    if (!currentTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Enforce status_change_permission when changing status
    if (status !== undefined && status !== currentTask.status) {
      const perm = currentTask.status_change_permission || "commissioner_and_leader";
      let canChangeStatus = admin.badge === "owner"; // owner can always change

      if (!canChangeStatus) {
        switch (perm) {
          case "commissioner_only":
            canChangeStatus = myRole === "commissioner";
            break;
          case "leader_only":
            canChangeStatus = myRole === "leader";
            break;
          case "commissioner_and_leader":
            canChangeStatus = myRole === "commissioner" || myRole === "leader";
            break;
          case "creator_only":
            canChangeStatus = currentTask.created_by === admin.sub;
            break;
        }
      }

      if (!canChangeStatus) {
        return NextResponse.json({ error: "You do not have permission to change the status of this task" }, { status: 403 });
      }
    }

    // Validate status_change_permission if provided
    const validPermissions = ['commissioner_only', 'leader_only', 'commissioner_and_leader', 'creator_only'];
    if (status_change_permission !== undefined && !validPermissions.includes(status_change_permission)) {
      return NextResponse.json({ error: "Invalid status_change_permission value" }, { status: 400 });
    }

    if (deadline !== undefined && deadline !== null && isNaN(Date.parse(deadline))) {
      return NextResponse.json({ error: "Invalid deadline format" }, { status: 400 });
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const changedFields: string[] = [];

    if (title !== undefined) { updates.title = title.trim(); changedFields.push("title"); }
    if (description !== undefined) { updates.description = description.trim(); changedFields.push("description"); }
    if (priority !== undefined) { updates.priority = priority; changedFields.push("priority"); }
    if (deadline !== undefined) { updates.deadline = deadline || null; changedFields.push("deadline"); }
    if (status_change_permission !== undefined) { updates.status_change_permission = status_change_permission; changedFields.push("status_change_permission"); }
    if (status !== undefined) {
      updates.status = status;
      changedFields.push("status");
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
      // Get existing assignees before deleting
      const { data: existingAssignees } = await db
        .from("project_task_assignees")
        .select("user_id")
        .eq("task_id", taskId);
      const existingIds = new Set((existingAssignees || []).map((a: { user_id: string }) => a.user_id));

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

        // Notify newly added assignees
        const newAssigneeIds = assigneeIds.filter((uid: string) => !existingIds.has(uid));
        if (newAssigneeIds.length > 0) {
          const taskTitle = title !== undefined ? title.trim() : currentTask.title;
          const notifications = newAssigneeIds.map((uid: string) => ({
            userId: uid,
            actorId: admin.sub,
            type: "task_assigned",
            projectId: id,
            taskId: taskId,
            title: taskTitle,
            message: `You have been assigned a new task: "${taskTitle}" in project`,
          }));
          await createNotificationBulk(notifications);
        }
      }

      changedFields.push("assignees");
    }

    // Log activity
    const taskTitle = title !== undefined ? title.trim() : currentTask.title;
    if (status !== undefined && status === "completed" && currentTask.status !== "completed") {
      await logActivity({
        projectId: id,
        taskId: taskId,
        userId: admin.sub,
        action: "task_completed",
        details: { title: taskTitle },
      });
    } else if (status !== undefined && status !== "completed" && currentTask.status === "completed") {
      await logActivity({
        projectId: id,
        taskId: taskId,
        userId: admin.sub,
        action: "task_reopened",
        details: { title: taskTitle },
      });
    } else if (changedFields.length > 0) {
      await logActivity({
        projectId: id,
        taskId: taskId,
        userId: admin.sub,
        action: "task_updated",
        details: { fields: changedFields, changes: updates },
      });
    }

    // Fetch updated task with full details
    const { data: updatedTask, error: fetchError } = await db
      .from("project_tasks")
      .select(`
        *,
        assignees:project_task_assignees(
          id,
          user_id,
          user:admin_users(id, display_name, position, profile_pic_url)
        ),
        created_by_user:admin_users!created_by(id, display_name, position, profile_pic_url),
        completed_by_user:admin_users!completed_by(id, display_name, position, profile_pic_url)
      `)
      .eq("id", taskId)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    // Transform field names
    const { created_by_user: cbu, completed_by_user: cobu, ...tFields } = updatedTask as any;
    return NextResponse.json({ task: { ...tFields, creator: cbu, completer: cobu } });
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
    const db = getSupabaseAdmin();

    // Fetch task title for activity log before deleting
    const { data: task } = await db
      .from("project_tasks")
      .select("title")
      .eq("id", taskId)
      .eq("project_id", id)
      .single();

    const taskTitle = task?.title || "Unknown task";

    const { error } = await db
      .from("project_tasks")
      .delete()
      .eq("id", taskId)
      .eq("project_id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log activity
    await logActivity({
      projectId: id,
      taskId: taskId,
      userId: admin.sub,
      action: "task_deleted",
      details: { title: taskTitle },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
