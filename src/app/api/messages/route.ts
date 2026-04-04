import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";


export async function GET(req: NextRequest) {
  const admin = await authenticateRequest(req);
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
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, attachments: bodyAttachments, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (updates.admin_reply) {
    updates.replied_at = new Date().toISOString();
    updates.status = "replied";

    // Fetch current replies array
    const { data: current } = await getSupabaseAdmin()
      .from("contact_messages").select("replies,name,email,subject,message").eq("id", id).single();

    const replies = Array.isArray(current?.replies) ? current.replies : [];

    // Check if this is the FIRST admin reply
    const hasExistingAdminReply = replies.some((r: { type: string }) => r.type === "admin");

    replies.push({
      type: "admin",
      message: updates.admin_reply,
      timestamp: new Date().toISOString(),
      ...(bodyAttachments?.length ? { attachments: bodyAttachments } : {}),
    });
    updates.replies = replies;

    // Only send email on the FIRST admin reply
    if (!hasExistingAdminReply && current?.email) {
      try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: "theorgfox@gmail.com", pass: "gwyz ikpb ifrz whzg" },
        });

        const replyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://the-orange-fox-api.vercel.app"}/reply/${id}`;

        const attachmentHtml = bodyAttachments?.length ? `
              <div style="margin-top:12px;padding:12px;background:#f5f2ef;border-radius:8px;">
                <p style="color:#999;font-size:11px;margin:0 0 8px;">📎 Attachments:</p>
                ${bodyAttachments.map((a: {url: string; name: string; type: string}) => {
                  if (a.type?.startsWith("image/")) {
                    return `<div style="margin-bottom:8px;"><img src="${a.url}" alt="${a.name}" style="max-width:100%;max-height:200px;border-radius:8px;" /><br/><a href="${a.url}" style="color:#D4692A;font-size:12px;">${a.name}</a></div>`;
                  }
                  return `<div style="margin-bottom:4px;"><a href="${a.url}" style="color:#D4692A;font-size:13px;text-decoration:none;">📄 ${a.name}</a></div>`;
                }).join("")}
              </div>` : "";

        await transporter.sendMail({
          from: '"The Orange Fox" <theorgfox@gmail.com>',
          to: current.email,
          subject: `Re: ${current.subject || "Your Project Request"} - The Orange Fox`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <div style="text-align:center;margin-bottom:24px;">
                <h2 style="color:#D4692A;margin:0;">The Orange Fox</h2>
                <p style="color:#999;font-size:12px;margin:4px 0 0;">Project Request Reply</p>
              </div>
              <div style="background:#f9f7f5;border-radius:12px;padding:20px;margin-bottom:16px;">
                <p style="color:#555;font-size:14px;margin:0 0 8px;"><strong>Hi ${current.name},</strong></p>
                <p style="color:#555;font-size:14px;margin:0;white-space:pre-wrap;">${updates.admin_reply}</p>
                ${attachmentHtml}
              </div>
              <div style="text-align:center;margin:24px 0;">
                <p style="color:#D4692A;font-size:14px;font-weight:bold;margin:0 0 12px;">📬 All future communication will happen through our portal.</p>
                <p style="color:#777;font-size:13px;margin:0 0 16px;">You don't need to reply via email — use the portal link below instead.</p>
                <a href="${replyUrl}" style="display:inline-block;background:#D4692A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">Open Your Portal</a>
              </div>
              <p style="color:#999;font-size:11px;text-align:center;margin-top:16px;">Bookmark this link for future replies: ${replyUrl}</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
              <p style="color:#999;font-size:11px;text-align:center;">&copy; ${new Date().getFullYear()} The Orange Fox. All rights reserved.</p>
            </div>`,
        });
      } catch (e) { console.error("Email failed:", e); }
    }
    // If NOT the first admin reply: no email sent — reply goes only to the portal
  }

  const { data, error } = await getSupabaseAdmin()
    .from("contact_messages").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { error } = await getSupabaseAdmin().from("contact_messages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
