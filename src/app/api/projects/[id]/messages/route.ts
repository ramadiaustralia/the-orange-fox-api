import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { authenticateRequest } from "@/lib/auth";
import { createNotification, createNotificationBulk } from "@/lib/notifications";


async function isProjectMemberOrOwner(projectId: string, userId: string, badge: string): Promise<boolean> {
  if (badge === "owner") return true;
  const { data } = await getSupabaseAdmin()
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hasAccess = await isProjectMemberOrOwner(id, admin.sub, admin.badge || "staff");
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const db = getSupabaseAdmin();

    // Fetch all messages with sender details
    const { data, error } = await db
      .from("project_messages")
      .select("*, sender:admin_users!sender_id(id, display_name, position, profile_pic_url)")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const messages = data || [];

    // Collect reply_to_ids that need fetching
    const replyToIds = messages
      .filter((m: any) => m.reply_to_id)
      .map((m: any) => m.reply_to_id);

    let replyMap: Record<string, any> = {};

    if (replyToIds.length > 0) {
      // Fetch reply messages with their sender info
      const { data: replyMessages } = await db
        .from("project_messages")
        .select("id, content, sender_id, is_deleted, sender:admin_users!sender_id(id, display_name)")
        .in("id", replyToIds);

      if (replyMessages) {
        for (const rm of replyMessages) {
          replyMap[rm.id] = {
            id: rm.id,
            content: (rm as any).is_deleted ? "This message was deleted" : rm.content,
            sender_id: rm.sender_id,
            sender: rm.sender,
          };
        }
      }
    }

    // Attach reply_to data to messages and handle deleted messages
    const enrichedMessages = messages.map((msg: any) => {
      const enriched = {
        ...msg,
        reply_to: msg.reply_to_id ? replyMap[msg.reply_to_id] || null : null,
      };

      // For deleted messages, ensure content is cleared on the response
      if (msg.is_deleted) {
        enriched.content = "This message was deleted";
        enriched.attachment_url = null;
        enriched.attachment_name = null;
        enriched.attachment_type = null;
        enriched.attachment_size = null;
      }

      return enriched;
    });

    return NextResponse.json({ messages: enrichedMessages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hasAccess = await isProjectMemberOrOwner(id, admin.sub, admin.badge || "staff");
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { content, attachmentUrl, attachmentName, attachmentType, attachmentSize, reply_to_id, mentions } = await req.json();

    if (!content?.trim() && !attachmentUrl) {
      return NextResponse.json({ error: "Content or attachment is required" }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from("project_messages")
      .insert({
        project_id: id,
        sender_id: admin.sub,
        content: content?.trim() || "",
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        attachment_type: attachmentType || null,
        attachment_size: attachmentSize || null,
        reply_to_id: reply_to_id || null,
        mentions: mentions && Array.isArray(mentions) && mentions.length > 0 ? mentions : null,
      })
      .select("*, sender:admin_users!sender_id(id, display_name, position, profile_pic_url)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If mentions exist, create notifications for mentioned users
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      // Fetch project name for notification
      const { data: project } = await db
        .from("projects")
        .select("name")
        .eq("id", id)
        .single();

      const projectName = project?.name || "a project";

      const mentionNotifications = mentions.map((userId: string) => ({
        userId,
        actorId: admin.sub,
        type: "mention",
        projectId: id,
        title: projectName,
        message: `${admin.display_name} mentioned you in project "${projectName}"`,
      }));

      await createNotificationBulk(mentionNotifications);
    }

    // Add reply_to data if present
    let reply_to = null;
    if (reply_to_id) {
      const { data: replyMsg } = await db
        .from("project_messages")
        .select("id, content, sender_id, sender:admin_users!sender_id(id, display_name)")
        .eq("id", reply_to_id)
        .single();

      if (replyMsg) {
        reply_to = {
          id: replyMsg.id,
          content: replyMsg.content,
          sender_id: replyMsg.sender_id,
          sender: replyMsg.sender,
        };

        // Send reply notification to original message sender
        if (replyMsg.sender_id !== admin.sub) {
          // Fetch project name for notification (reuse if already fetched for mentions)
          let projectName: string;
          const { data: project } = await db
            .from("projects")
            .select("name")
            .eq("id", id)
            .single();
          projectName = project?.name || "a project";

          await createNotification({
            userId: replyMsg.sender_id,
            actorId: admin.sub,
            type: "project_reply",
            projectId: id,
            title: projectName,
            message: `${admin.display_name} replied to your message in project "${projectName}"`,
          });
        }
      }
    }

    return NextResponse.json({ message: { ...data, reply_to } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hasAccess = await isProjectMemberOrOwner(id, admin.sub, admin.badge || "staff");
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { messageId, content } = await req.json();

    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: "messageId and content are required" }, { status: 400 });
    }

    // Verify the message belongs to the current user
    const { data: existingMsg } = await getSupabaseAdmin()
      .from("project_messages")
      .select("sender_id")
      .eq("id", messageId)
      .eq("project_id", id)
      .single();

    if (!existingMsg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existingMsg.sender_id !== admin.sub) {
      return NextResponse.json({ error: "You can only edit your own messages" }, { status: 403 });
    }

    const { error } = await getSupabaseAdmin()
      .from("project_messages")
      .update({
        content: content.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Unsend/delete a message (soft delete, sender only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const hasAccess = await isProjectMemberOrOwner(id, admin.sub, admin.badge || "staff");
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { messageId } = await req.json();

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    // Verify the message exists and belongs to the current user
    const { data: existingMsg } = await getSupabaseAdmin()
      .from("project_messages")
      .select("sender_id")
      .eq("id", messageId)
      .eq("project_id", id)
      .single();

    if (!existingMsg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existingMsg.sender_id !== admin.sub) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    // Soft delete: set is_deleted flag, clear content and attachments
    const { error } = await getSupabaseAdmin()
      .from("project_messages")
      .update({
        is_deleted: true,
        content: "This message was deleted",
        attachment_url: null,
        attachment_name: null,
        attachment_type: null,
        attachment_size: null,
      })
      .eq("id", messageId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
