import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (admin.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can add members" }, { status: 403 });
  }

  const { id } = await params;

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

  if (admin.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can remove members" }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query param is required" }, { status: 400 });
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
