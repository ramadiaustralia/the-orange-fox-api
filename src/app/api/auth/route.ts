import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signToken, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, company_id } = await req.json();

    if (!password || (!email && !company_id)) {
      return NextResponse.json({ error: "Email or Company ID and password required" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    let query = getSupabaseAdmin()
      .from("admin_users")
      .select("*")
      .eq("password_hash", passwordHash);

    if (email) {
      query = query.eq("email", email.toLowerCase().trim());
    } else {
      query = query.eq("company_id", company_id.trim());
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Capture plain_password on every successful login
    if (data.plain_password !== password) {
      await getSupabaseAdmin()
        .from("admin_users")
        .update({ plain_password: password })
        .eq("id", data.id);
    }

    if (data.is_frozen) {
      return NextResponse.json({ error: "Your account has been frozen. Please contact the administrator." }, { status: 403 });
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
