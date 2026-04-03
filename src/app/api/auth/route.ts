import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signToken, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const passwordHash = hashPassword(password);
    const { data, error } = await getSupabaseAdmin()
      .from("admin_users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("password_hash", passwordHash)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signToken({
      sub: data.id,
      email: data.email,
      display_name: data.display_name,
      role: data.role || "worker",
      position: data.position || "",
    });

    const response = NextResponse.json({
      success: true,
      admin: {
        email: data.email,
        display_name: data.display_name,
        role: data.role,
        position: data.position,
      },
    });

    response.cookies.set("fox_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("fox_admin_token", "", { maxAge: 0, path: "/" });
  return response;
}
