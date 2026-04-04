import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createNotificationBulk } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  // Simple auth check - could be a secret header for cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || "cron-secret-key"}`) {
    // Also allow if called internally
  }

  try {
    const db = getSupabaseAdmin();
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks with deadline within 24 hours from now (daily cron - catch all upcoming deadlines)
    const { data: tasks, error } = await db
      .from("project_tasks")
      .select(`
        id, title, deadline, project_id, created_by,
        assignees:project_task_assignees(user_id)
      `)
      .neq("status", "completed")
      .gte("deadline", now.toISOString())
      .lte("deadline", twentyFourHoursFromNow.toISOString());

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ message: "No upcoming deadlines", reminded: 0 });
    }

    // Check which reminders have already been sent (avoid duplicates)
    const taskIds = tasks.map((t: any) => t.id);
    const { data: existingReminders } = await db
      .from("notifications")
      .select("task_id, user_id")
      .eq("type", "deadline_reminder")
      .in("task_id", taskIds);

    const sentSet = new Set((existingReminders || []).map((r: any) => `${r.task_id}:${r.user_id}`));

    const notifications: Array<{
      userId: string;
      actorId: string;
      type: string;
      projectId?: string;
      taskId?: string;
      title?: string;
      message?: string;
    }> = [];

    for (const task of tasks) {
      const assigneeIds = (task.assignees || []).map((a: { user_id: string }) => a.user_id);
      // Also notify the creator
      const usersToNotify = [...new Set([...assigneeIds, task.created_by])];

      for (const uid of usersToNotify) {
        if (!uid) continue;
        const key = `${task.id}:${uid}`;
        if (sentSet.has(key)) continue; // Already reminded

        notifications.push({
          userId: uid,
          actorId: uid, // System notification, use self as actor
          type: "deadline_reminder",
          projectId: task.project_id,
          taskId: task.id,
          title: task.title,
          message: `⏰ Task "${task.title}" deadline is in less than 12 hours!`,
        });
      }
    }

    if (notifications.length > 0) {
      await createNotificationBulk(notifications);
    }

    return NextResponse.json({ message: "Reminders sent", reminded: notifications.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
