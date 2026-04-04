import { getSupabaseAdmin } from "./supabase";

interface CreateNotificationParams {
  userId: string;      // who receives the notification
  actorId: string;     // who triggered it
  type: string;        // notification type
  projectId?: string;
  taskId?: string;
  title?: string;
  message?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, actorId, type, projectId, taskId, title, message } = params;
  // Don't notify yourself
  if (userId === actorId) return;
  
  const { error } = await getSupabaseAdmin()
    .from("notifications")
    .insert({
      user_id: userId,
      actor_id: actorId,
      type,
      project_id: projectId || null,
      task_id: taskId || null,
      title: title || null,
      message: message || null,
    });
  if (error) console.error("Failed to create notification:", error.message);
}

export async function createNotificationBulk(notifications: CreateNotificationParams[]) {
  // Filter out self-notifications
  const filtered = notifications.filter(n => n.userId !== n.actorId);
  if (filtered.length === 0) return;
  
  const rows = filtered.map(n => ({
    user_id: n.userId,
    actor_id: n.actorId,
    type: n.type,
    project_id: n.projectId || null,
    task_id: n.taskId || null,
    title: n.title || null,
    message: n.message || null,
  }));
  
  const { error } = await getSupabaseAdmin().from("notifications").insert(rows);
  if (error) console.error("Failed to create bulk notifications:", error.message);
}
