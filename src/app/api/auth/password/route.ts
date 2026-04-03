import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Read the admin token from cookies
    const token = req.cookies.get("fox_admin_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the JWT token
    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Parse request body
    const { current_password, new_password } = await req.json();

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify current password by hashing and comparing
    const currentHash = hashPassword(current_password);

    const { data: adminUser, error: fetchError } = await supabase
      .from("admin_users")
      .select("id, password_hash")
      .eq("id", payload.sub)
      .single();

    if (fetchError || !adminUser) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    if (adminUser.password_hash !== currentHash) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    // Generate new password hash
    const newHash = hashPassword(new_password);

    // Update the password in the database
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({ password_hash: newHash, plain_password: new_password })
      .eq("id", payload.sub);

    if (updateError) {
      console.error("Failed to update password:", updateError);
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Password changed successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Password change error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
