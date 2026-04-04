import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const payload = await authenticateRequest(req);
    if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const targetUserId = (formData.get("userId") as string) || payload.sub;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Check permission: owner can upload for anyone, others only for themselves
    const supabase = getSupabaseAdmin();
    const { data: currentUser } = await supabase
      .from("admin_users")
      .select("role, permissions")
      .eq("id", payload.sub)
      .single();

    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isOwner = currentUser.role === "owner";
    const isSelf = targetUserId === payload.sub;
    const canEdit = isOwner || (isSelf && currentUser.permissions?.profile_editable);

    if (!canEdit) {
      return NextResponse.json({ error: "No permission to upload avatar" }, { status: 403 });
    }

    const ext = file.name.split(".").pop() || "png";
    const fileName = `${targetUserId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Update user's profile_pic_url
    await supabase
      .from("admin_users")
      .update({ profile_pic_url: publicUrl })
      .eq("id", targetUserId);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
