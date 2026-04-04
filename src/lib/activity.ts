import { getSupabaseAdmin } from "./supabase";

interface LogActivityParams {
  projectId: string;
  taskId?: string;
  userId: string;
  action: string;
  details?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams) {
  const { projectId, taskId, userId, action, details } = params;

  const { error } = await getSupabaseAdmin()
    .from("activity_logs")
    .insert({
      project_id: projectId,
      task_id: taskId || null,
      user_id: userId,
      action,
      details: details || null,
    });

  if (error) console.error("Failed to log activity:", error.message);
}

export async function logActivityBulk(activities: LogActivityParams[]) {
  if (activities.length === 0) return;

  const rows = activities.map((a) => ({
    project_id: a.projectId,
    task_id: a.taskId || null,
    user_id: a.userId,
    action: a.action,
    details: a.details || null,
  }));

  const { error } = await getSupabaseAdmin()
    .from("activity_logs")
    .insert(rows);

  if (error) console.error("Failed to log bulk activities:", error.message);
}
