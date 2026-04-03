import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Public upload endpoint for customer reply attachments
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const messageId = formData.get("id") as string | null;

    if (!file || !messageId) {
      return NextResponse.json({ error: "File and message ID required" }, { status: 400, headers: CORS });
    }

    // Verify the message exists
    const { data: msg, error: fetchErr } = await getSupabaseAdmin()
      .from("contact_messages")
      .select("id")
      .eq("id", messageId)
      .single();

    if (fetchErr || !msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404, headers: CORS });
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const filePath = `customer-replies/${messageId}/${timestamp}-${file.name}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await getSupabaseAdmin()
      .storage.from("post-files")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500, headers: CORS });
    }

    const { data: urlData } = getSupabaseAdmin()
      .storage.from("post-files")
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }, { headers: CORS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
