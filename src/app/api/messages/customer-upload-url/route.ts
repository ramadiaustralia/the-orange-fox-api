import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Public signed URL endpoint for customer reply attachments.
 * Validates the message ID exists instead of requiring authentication.
 * This bypasses the Vercel 4.5MB serverless payload limit.
 */
export async function POST(req: NextRequest) {
  try {
    const { messageId, fileName, fileType } = await req.json();

    if (!messageId || !fileName) {
      return NextResponse.json(
        { error: "messageId and fileName are required" },
        { status: 400, headers: CORS }
      );
    }

    // Verify the message exists
    const { data: msg, error: fetchErr } = await getSupabaseAdmin()
      .from("contact_messages")
      .select("id")
      .eq("id", messageId)
      .single();

    if (fetchErr || !msg) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404, headers: CORS }
      );
    }

    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `customer-replies/${messageId}/${timestamp}-${sanitizedName}`;

    const { data, error } = await getSupabaseAdmin()
      .storage.from("post-files")
      .createSignedUploadUrl(filePath);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS }
      );
    }

    const { data: urlData } = getSupabaseAdmin()
      .storage.from("post-files")
      .getPublicUrl(filePath);

    return NextResponse.json(
      {
        signedUrl: data.signedUrl,
        publicUrl: urlData.publicUrl,
        fileName,
        fileType: fileType || "application/octet-stream",
      },
      { headers: CORS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
