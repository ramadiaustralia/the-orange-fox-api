import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken, hashPassword } from "@/lib/auth";

async function requireOwner(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const { data } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id, role")
    .eq("id", payload.sub)
    .single();
  if (!data || data.role !== "owner") return null;
  return data;
}

// GET all users (all authenticated users can list, only owner sees sensitive fields)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if the user is the owner
  const { data: requester } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id, role")
    .eq("id", payload.sub)
    .single();

  if (!requester) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isOwner = requester.role === "owner";

  const selectFields = isOwner
    ? "id, username, email, display_name, position, role, permissions, profile_pic_url, plain_password, is_frozen, created_at, last_active_at, company_id"
    : "id, email, display_name, position, role, profile_pic_url, last_active_at, company_id";

  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .select(selectFields)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

// POST create new user
export async function POST(req: NextRequest) {
  const owner = await requireOwner(req);
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { email, password, display_name, position, company_id } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Check if email already exists
  const { data: existing } = await getSupabaseAdmin()
    .from("admin_users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .insert({
      email: email.toLowerCase().trim(),
      username: email.toLowerCase().trim(),
      password_hash: hashPassword(password),
      plain_password: password,
      display_name: display_name || email.split("@")[0],
      position: position || "",
      role: "worker",
      permissions: {},
      is_frozen: false,
      ...(company_id !== undefined && { company_id }),
    })
    .select("id, email, display_name, position, role, permissions, profile_pic_url, plain_password, is_frozen, created_at, company_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, user: data });
}

// PATCH update user
export async function PATCH(req: NextRequest) {
  const owner = await requireOwner(req);
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  // Don't allow changing owner's role
  const { data: targetUser } = await getSupabaseAdmin()
    .from("admin_users")
    .select("role")
    .eq("id", id)
    .single();

  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const safeUpdates: Record<string, unknown> = {};
  if (updates.display_name !== undefined) safeUpdates.display_name = updates.display_name;
  if (updates.position !== undefined) safeUpdates.position = updates.position;
  if (updates.email !== undefined) safeUpdates.email = updates.email.toLowerCase().trim();
  if (updates.permissions !== undefined) safeUpdates.permissions = updates.permissions;
  if (updates.profile_pic_url !== undefined) safeUpdates.profile_pic_url = updates.profile_pic_url;
  if (updates.password) {
    safeUpdates.password_hash = hashPassword(updates.password);
    safeUpdates.plain_password = updates.password;
  }
  if (updates.is_frozen !== undefined) safeUpdates.is_frozen = updates.is_frozen;
  if (updates.company_id !== undefined) safeUpdates.company_id = updates.company_id;

  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .update(safeUpdates)
    .eq("id", id)
    .select("id, email, display_name, position, role, permissions, profile_pic_url, plain_password, is_frozen, created_at, company_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, user: data });
}

// DELETE user
export async function DELETE(req: NextRequest) {
  const owner = await requireOwner(req);
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

  // Don't allow deleting the owner
  const { data: targetUser } = await getSupabaseAdmin()
    .from("admin_users")
    .select("role")
    .eq("id", id)
    .single();

  if (targetUser?.role === "owner") {
    return NextResponse.json({ error: "Cannot delete the owner account" }, { status: 403 });
  }

  const { error } = await getSupabaseAdmin()
    .from("admin_users")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
