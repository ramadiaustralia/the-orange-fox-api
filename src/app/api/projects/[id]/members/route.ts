import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

async function getProjectLeader(projectId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("role", "leader")
    .single();
  return data?.user_id || null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badge = admin.badge || "staff";
  const { id } = await params;

  // Board badge CANNOT add members
  if (badge === "board") {
    return NextResponse.json({ error: "Board members cannot add project members" }, { status: 403 });
  }

  // Owner badge can add members to any project
  // Project leader can add members
  if (badge !== "owner") {
    const leaderId = await getProjectLeader(id);
    if (leaderId !== admin.sub) {
      return NextResponse.json({ error: "Only the project leader or owner can add members" }, { status: 403 });
    }
  }

  try {
    const { userId, role } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Verify the project exists
    const { data: project } = await db
      .from("projects")
      .select("id")
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
        role: role || "member",
      })
      .select("*, user:admin_users(id, display_name, position, profile_pic_url)")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "User is already a member of this project" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badge = admin.badge || "staff";
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query param is required" }, { status: 400 });
  }

  // Board badge CANNOT remove members
  if (badge === "board") {
    return NextResponse.json({ error: "Board members cannot remove project members" }, { status: 403 });
  }

  // Owner badge can remove anyone from any project
  if (badge !== "owner") {
    const leaderId = await getProjectLeader(id);
    if (leaderId !== admin.sub) {
      return NextResponse.json({ error: "Only the project leader or owner can remove members" }, { status: 403 });
    }
    // Leader cannot remove themselves
    if (userId === admin.sub) {
      return NextResponse.json({ error: "Leader cannot remove themselves. Transfer leadership first." }, { status: 400 });
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

// PATCH handler for transfer leadership
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const badge = admin.badge || "staff";
  const { id } = await params;

  try {
    const { newLeaderId } = await req.json();

    if (!newLeaderId) {
      return NextResponse.json({ error: "newLeaderId is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Only the current leader OR owner badge can transfer
    const leaderId = await getProjectLeader(id);

    if (badge !== "owner" && leaderId !== admin.sub) {
      return NextResponse.json({ error: "Only the project leader or owner can transfer leadership" }, { status: 403 });
    }

    // Verify the new leader is a member of the project
    const { data: newLeaderMember } = await db
      .from("project_members")
      .select("id")
      .eq("project_id", id)
      .eq("user_id", newLeaderId)
      .single();

    if (!newLeaderMember) {
      return NextResponse.json({ error: "New leader must be a member of the project" }, { status: 400 });
    }

    // Set old leader to 'member'
    if (leaderId) {
      await db
        .from("project_members")
        .update({ role: "member" })
        .eq("project_id", id)
        .eq("user_id", leaderId);
    }

    // Set new person to 'leader'
    await db
      .from("project_members")
      .update({ role: "leader" })
      .eq("project_id", id)
      .eq("user_id", newLeaderId);

    return NextResponse.json({ success: true, message: "Leadership transferred" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
