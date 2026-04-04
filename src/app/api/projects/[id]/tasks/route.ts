import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";
import { createNotificationBulk } from "@/lib/notifications";


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

// GET: List all tasks for a project with assignees and attachment count
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Verify project access (member or owner badge)
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
        completed_by_user:admin_users!completed_by(id, display_name, position, profile_pic_url)
      `)
      .eq("project_id", id)
      .order("completed_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get attachment counts separately
    const taskIds = (data || []).map((t: any) => t.id);
    let attachCounts: Record<string, number> = {};
    if (taskIds.length > 0) {
      const { data: attachData } = await getSupabaseAdmin()
        .from("project_task_attachments")
        .select("task_id")
        .in("task_id", taskIds);
      if (attachData) {
        for (const row of attachData) {
          attachCounts[row.task_id] = (attachCounts[row.task_id] || 0) + 1;
        }
      }
    }

    // Transform field names to match frontend expectations
    const tasks = (data || []).map(({ created_by_user, completed_by_user, ...task }: any) => ({
      ...task,
      creator: created_by_user,
      completer: completed_by_user,
      attachment_count: attachCounts[task.id] || 0,
    }));

    return NextResponse.json({ tasks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Create a new task
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Only commissioner/leader/owner can create tasks
  const myRole = await getProjectRole(id, admin.sub);
  if (myRole !== "commissioner" && myRole !== "leader" && admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the commissioner or leader can create tasks" }, { status: 403 });
  }

  try {
    const { title, description, priority, assigneeIds, deadline, status_change_permission } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    if (!assigneeIds || !Array.isArray(assigneeIds) || assigneeIds.length === 0) {
      return NextResponse.json({ error: "assigneeIds is required and must be a non-empty array" }, { status: 400 });
    }

    const validPermissions = ['commissioner_only', 'leader_only', 'commissioner_and_leader', 'creator_only'];
    if (status_change_permission && !validPermissions.includes(status_change_permission)) {
      return NextResponse.json({ error: "Invalid status_change_permission value" }, { status: 400 });
    }

    if (deadline && isNaN(Date.parse(deadline))) {
      return NextResponse.json({ error: "Invalid deadline format" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Create the task
    const { data: task, error: taskError } = await db
      .from("project_tasks")
      .insert({
        project_id: id,
        title: title.trim(),
        description: description?.trim() || "",
        priority: priority || "medium",
        created_by: admin.sub,
        deadline: deadline || null,
        status_change_permission: status_change_permission || "commissioner_and_leader",
      })
      .select()
      .single();

    if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

    // Insert assignees
    const assigneeRows = assigneeIds.map((userId: string) => ({
      task_id: task.id,
      user_id: userId,
    }));

    const { error: assigneeError } = await db
      .from("project_task_assignees")
      .insert(assigneeRows);

    if (assigneeError) return NextResponse.json({ error: assigneeError.message }, { status: 500 });

    // Fetch the created task with assignees and creator info
    const { data: fullTask, error: fetchError } = await db
      .from("project_tasks")
      .select(`
        *,
        assignees:project_task_assignees(
          id,
          user_id,
          user:admin_users(id, display_name, position, profile_pic_url)
        ),
        created_by_user:admin_users!created_by(id, display_name, position, profile_pic_url)
      `)
      .eq("id", task.id)
      .single();

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

    // Send task_assigned notifications to all assignees
    const taskAssignedNotifications = assigneeIds.map((uid: string) => ({
      userId: uid,
      actorId: admin.sub,
      type: "task_assigned",
      projectId: id,
      taskId: task.id,
      title: title.trim(),
      message: `You have been assigned a new task: "${title.trim()}" in project`,
    }));
    await createNotificationBulk(taskAssignedNotifications);

    // Transform field names
    const { created_by_user, ...taskFields } = fullTask as any;
    return NextResponse.json({ task: { ...taskFields, creator: created_by_user, completer: null, attachment_count: 0 } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
