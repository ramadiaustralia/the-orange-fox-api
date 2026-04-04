import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";


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

// POST: Add a member to the project (Commissioner or Leader)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Check if user is commissioner or leader
  const myRole = await getProjectRole(id, admin.sub);
  if (myRole !== "commissioner" && myRole !== "leader" && admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the commissioner or leader can add members" }, { status: 403 });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Verify the project exists
    const { data: project } = await db
      .from("projects")
      .select("id, name")
      .eq("id", id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Add member
    const { data, error } = await db
      .from("project_members")
      .insert({
        project_id: id,
        user_id: userId,
        role: "member",
      })
      .select("*, user:admin_users(id, display_name, position, profile_pic_url)")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "User is already a member of this project" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send project_invite notification
    await createNotification({
      userId,
      actorId: admin.sub,
      type: "project_invite",
      projectId: id,
      title: project.name,
      message: `You have been invited to project "${project.name}"`,
    });

    return NextResponse.json({ member: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Remove a member from the project (Commissioner or Leader)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query param is required" }, { status: 400 });
  }

  // Check if user is commissioner or leader
  const myRole = await getProjectRole(id, admin.sub);
  if (myRole !== "commissioner" && myRole !== "leader" && admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the commissioner or leader can remove members" }, { status: 403 });
  }

  // Leader cannot remove the commissioner
  if (myRole === "leader") {
    const targetRole = await getProjectRole(id, userId);
    if (targetRole === "commissioner") {
      return NextResponse.json({ error: "Leader cannot remove the commissioner" }, { status: 403 });
    }
    // Leader also cannot remove another leader (if any edge case)
    if (targetRole === "leader" && userId !== admin.sub) {
      return NextResponse.json({ error: "Leader cannot remove another leader" }, { status: 403 });
    }
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from("project_members")
      .delete()
      .eq("project_id", id)
      .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Change member role (set leader, transfer leadership)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const { userId, action } = await req.json();
    // action: 'set_leader' | 'transfer_leader' | 'remove_leader'

    if (!userId || !action) {
      return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();
    const myRole = await getProjectRole(id, admin.sub);

    // Fetch project name for notifications
    const { data: proj } = await db.from("projects").select("name").eq("id", id).single();
    const projectName = proj?.name || "Unknown Project";

    if (action === "set_leader") {
      // Only commissioner can set a leader
      if (myRole !== "commissioner" && admin.badge !== "owner") {
        return NextResponse.json({ error: "Only the commissioner can set a leader" }, { status: 403 });
      }

      // Check target is a member of the project
      const targetRole = await getProjectRole(id, userId);
      if (!targetRole) {
        return NextResponse.json({ error: "User is not a member of this project" }, { status: 400 });
      }
      if (targetRole === "commissioner") {
        return NextResponse.json({ error: "Cannot change commissioner role" }, { status: 400 });
      }

      // Demote current leader(s) to member first
      await db
        .from("project_members")
        .update({ role: "member" })
        .eq("project_id", id)
        .eq("role", "leader");

      // Set the new leader
      const { error } = await db
        .from("project_members")
        .update({ role: "leader" })
        .eq("project_id", id)
        .eq("user_id", userId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Notify the new leader
      await createNotification({
        userId,
        actorId: admin.sub,
        type: "leader_assigned",
        projectId: id,
        title: projectName,
        message: `You have been assigned as Leader of project "${projectName}"`,
      });

      return NextResponse.json({ success: true, message: "Leader has been set" });
    }

    if (action === "transfer_leader") {
      // Only the current leader can transfer leadership
      if (myRole !== "leader") {
        return NextResponse.json({ error: "Only the current leader can transfer leadership" }, { status: 403 });
      }

      // Check target is a member
      const targetRole = await getProjectRole(id, userId);
      if (!targetRole) {
        return NextResponse.json({ error: "User is not a member of this project" }, { status: 400 });
      }
      if (targetRole === "commissioner") {
        return NextResponse.json({ error: "Cannot transfer leadership to commissioner" }, { status: 400 });
      }

      // Demote current leader to member
      await db
        .from("project_members")
        .update({ role: "member" })
        .eq("project_id", id)
        .eq("user_id", admin.sub);

      // Set the new leader
      const { error } = await db
        .from("project_members")
        .update({ role: "leader" })
        .eq("project_id", id)
        .eq("user_id", userId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Notify the new leader
      await createNotification({
        userId,
        actorId: admin.sub,
        type: "leader_assigned",
        projectId: id,
        title: projectName,
        message: `You have been assigned as Leader of project "${projectName}"`,
      });

      return NextResponse.json({ success: true, message: "Leadership has been transferred" });
    }

    if (action === "remove_leader") {
      // Only commissioner can remove a leader (demote to member)
      if (myRole !== "commissioner" && admin.badge !== "owner") {
        return NextResponse.json({ error: "Only the commissioner can remove a leader" }, { status: 403 });
      }

      const targetRole = await getProjectRole(id, userId);
      if (targetRole !== "leader") {
        return NextResponse.json({ error: "User is not a leader" }, { status: 400 });
      }

      const { error } = await db
        .from("project_members")
        .update({ role: "member" })
        .eq("project_id", id)
        .eq("user_id", userId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ success: true, message: "Leader has been demoted to member" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
