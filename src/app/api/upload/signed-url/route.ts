import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";

/**
 * Creates a signed upload URL so the client can upload directly to Supabase Storage.
 * This bypasses the Vercel 4.5MB serverless payload limit — essential for video uploads.
 */
export async function POST(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { fileName, fileType } = await req.json();
    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${admin.sub}/${timestamp}-${sanitizedName}`;

    const { data, error } = await getSupabaseAdmin()
      .storage.from("post-files")
      .createSignedUploadUrl(filePath);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also return the public URL for after upload
    const { data: urlData } = getSupabaseAdmin()
      .storage.from("post-files")
      .getPublicUrl(filePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: filePath,
      publicUrl: urlData.publicUrl,
      fileName,
      fileType: fileType || "application/octet-stream",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
