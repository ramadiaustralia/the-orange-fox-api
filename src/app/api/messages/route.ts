import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

async function authenticate(req: NextRequest) {
  const token = req.cookies.get("fox_admin_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = getSupabaseAdmin().from("contact_messages").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const admin = await authenticate(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (updates.admin_reply) {
    updates.replied_at = new Date().toISOString();
    updates.status = "replied";
  }

  const { data, error } = await getSupabaseAdmin()
    .from("contact_messages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send email reply to customer
  if (updates.admin_reply && data?.email) {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "theorgfox@gmail.com",
          pass: "gwyz ikpb ifrz whzg",
        },
      });

      await transporter.sendMail({
        from: '"The Orange Fox" <theorgfox@gmail.com>',
        to: data.email,
        subject: `Re: ${data.subject || "Your Project Request"} - The Orange Fox`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #D4692A; margin: 0;">The Orange Fox</h2>
              <p style="color: #999; font-size: 12px; margin: 4px 0 0;">Project Request Reply</p>
            </div>
            <div style="background: #f9f7f5; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
              <p style="color: #555; font-size: 14px; margin: 0 0 8px;"><strong>Hi ${data.name},</strong></p>
              <p style="color: #555; font-size: 14px; margin: 0; white-space: pre-wrap;">${updates.admin_reply}</p>
            </div>
            <div style="background: #fff3ed; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
              <p style="color: #999; font-size: 12px; margin: 0 0 4px;">Your original message:</p>
              <p style="color: #555; font-size: 13px; margin: 0; white-space: pre-wrap;">${data.message}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 11px; text-align: center; margin: 0;">
              &copy; ${new Date().getFullYear()} The Orange Fox. All rights reserved.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send email reply:", emailError);
      // Don't fail the request if email fails - the reply is still saved in DB
    }
  }

  return NextResponse.json({ data });
}
