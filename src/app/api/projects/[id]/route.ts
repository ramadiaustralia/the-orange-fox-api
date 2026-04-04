import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


async function isProjectMemberOrOwner(projectId: string, userId: string, badge: string): Promise<boolean> {
  // Owner badge: always has access
  if (badge === "owner") return true;
  // Board badge: always has access (observation)
  if (badge === "board") return true;
  // Others: must be a member
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

async function isProjectLeaderOrOwner(projectId: string, userId: string, badge: string): Promise<boolean> {
  // Owner badge: always can manage
  if (badge === "owner") return true;
  // Board badge: can observe but CANNOT manage/intervene
  // Leader role in project: can manage
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("id, role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  return data?.role === "leader";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getSupabaseAdmin();
  const badge = admin.badge || "staff";

  try {
    // Check access
    const hasAccess = await isProjectMemberOrOwner(id, admin.sub, badge);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch project
    const { data: project, error: projectError } = await db
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch members with user details
    const { data: members, error: membersError } = await db
      .from("project_members")
      .select("*, user:admin_users(id, display_name, position, profile_pic_url)")
      .eq("project_id", id);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Fetch last 50 messages with sender details
    const { data: messages, error: messagesError } = await db
      .from("project_messages")
      .select("*, sender:admin_users!sender_id(id, display_name, position, profile_pic_url)")
      .eq("project_id", id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    return NextResponse.json({
      project,
      members: members || [],
      messages: messages || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const badge = admin.badge || "staff";

  try {
    const body = await req.json();

    // Handle take_over_leadership action — owner badge only
    if (body.action === "take_over_leadership") {
      if (badge !== "owner") {
        return NextResponse.json({ error: "Only owner badge can take over leadership" }, { status: 403 });
      }

      const db = getSupabaseAdmin();
      const targetUserId = body.userId || admin.sub;

      // Find the current leader
      const { data: currentLeader } = await db
        .from("project_members")
        .select("id, user_id")
        .eq("project_id", id)
        .eq("role", "leader")
        .single();

      if (currentLeader) {
        // Demote current leader to member
        await db
          .from("project_members")
          .update({ role: "member" })
          .eq("id", currentLeader.id);
      }

      // Check if target user is already a member
      const { data: targetMember } = await db
        .from("project_members")
        .select("id")
        .eq("project_id", id)
        .eq("user_id", targetUserId)
        .single();

      if (targetMember) {
        // Update existing membership to leader
        await db
          .from("project_members")
          .update({ role: "leader" })
          .eq("id", targetMember.id);
      } else {
        // Add as new leader
        await db
          .from("project_members")
          .insert({ project_id: id, user_id: targetUserId, role: "leader" });
      }

      return NextResponse.json({ success: true, message: "Leadership transferred" });
    }

    // Regular project update
    // Owner badge can always update; project leader can update; Board CANNOT update (read-only)
    if (badge === "board") {
      return NextResponse.json({ error: "Board members have read-only access to projects" }, { status: 403 });
    }

    const hasAccess = await isProjectLeaderOrOwner(id, admin.sub, badge);
    if (!hasAccess) {
      return NextResponse.json({ error: "Only owner or project leader can update" }, { status: 403 });
    }

    const updates: Record<string, string> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.status !== undefined) {
      const validStatuses = ["in_progress", "completed", "on_hold"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("projects")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ project: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badge = admin.badge || "staff";

  // Only Owner badge can delete projects
  if (badge !== "owner") {
    return NextResponse.json({ error: "Only the owner can delete projects" }, { status: 403 });
  }

  const { id } = await params;
  const db = getSupabaseAdmin();

  try {
    // Delete messages first (foreign key constraint)
    await db.from("project_messages").delete().eq("project_id", id);
    // Delete members
    await db.from("project_members").delete().eq("project_id", id);
    // Delete project
    const { error } = await db.from("projects").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
