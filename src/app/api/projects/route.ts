import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const isOwner = admin.badge === "owner";

  try {
    if (isOwner) {
      // Owner sees ALL projects
      const { data, error } = await db
        .from("projects")
        .select("*, members:project_members(*, user:admin_users(id, display_name, position, profile_pic_url))")
        .order("created_at", { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ projects: data || [] });
    } else {
      // Non-owner sees only projects they are a member of
      const { data: memberRows, error: memberError } = await db
        .from("project_members")
        .select("project_id")
        .eq("user_id", admin.sub);

      if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

      const projectIds = (memberRows || []).map((r: { project_id: string }) => r.project_id);

      if (projectIds.length === 0) {
        return NextResponse.json({ projects: [] });
      }

      const { data, error } = await db
        .from("projects")
        .select("*, members:project_members(*, user:admin_users(id, display_name, position, profile_pic_url))")
        .in("id", projectIds)
        .order("created_at", { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ projects: data || [] });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only owner can create projects
  if (admin.badge !== "owner") {
    return NextResponse.json({ error: "Only the owner can create projects" }, { status: 403 });
  }

  try {
    const { name, description, target_date } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    if (target_date && isNaN(Date.parse(target_date))) {
      return NextResponse.json({ error: "Invalid target_date format" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Create the project
    const { data: project, error: projectError } = await db
      .from("projects")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: admin.sub,
        target_date: target_date || null,
      })
      .select()
      .single();

    if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });

    // Auto-add the owner as Commissioner
    const { error: memberError } = await db
      .from("project_members")
      .insert({
        project_id: project.id,
        user_id: admin.sub,
        role: "commissioner",
      });

    if (memberError) {
      console.error("Failed to add creator as commissioner:", memberError.message);
    }

    return NextResponse.json({ project });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
