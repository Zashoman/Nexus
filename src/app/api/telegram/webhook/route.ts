import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const db = getServiceSupabase();

  try {
    const body = await req.json();

    // Telegram sends different types of updates
    const message = body.message || body.channel_post;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat?.id || "");
    const chatTitle = message.chat?.title || "Unknown Channel";
    const messageId = String(message.message_id || "");
    const text = message.text || message.caption || "";
    const date = message.date || Math.floor(Date.now() / 1000);

    // Detect media
    const hasPhoto = !!(message.photo && message.photo.length > 0);
    const hasVideo = !!message.video;
    const hasDocument = !!message.document;
    const hasMedia = hasPhoto || hasVideo || hasDocument;
    const mediaType = hasPhoto ? "photo" : hasVideo ? "video" : hasDocument ? "document" : null;

    // Get forwarded from info
    const forwardedFrom = message.forward_from_chat?.title
      || message.forward_sender_name
      || message.forward_from?.first_name
      || null;

    // Skip empty messages (no text and no caption)
    if (!text && !hasMedia) {
      return NextResponse.json({ ok: true });
    }

    // Check if channel exists in our database, if not create it
    const { data: existingChannel } = await db
      .from("intel_telegram_channels")
      .select("id, category")
      .eq("chat_id", chatId)
      .maybeSingle();

    let category = "general";
    if (existingChannel) {
      category = existingChannel.category;
    } else {
      // Auto-create the channel entry
      await db.from("intel_telegram_channels").insert({
        chat_id: chatId,
        display_name: chatTitle,
        category: "twitter",
      });
      category = "twitter";
    }

    // Store the message (skip if duplicate)
    const { error } = await db.from("intel_telegram_messages").insert({
      message_id: messageId,
      chat_id: chatId,
      channel_name: chatTitle,
      category,
      text_content: text.slice(0, 2000) || null,
      has_media: hasMedia,
      media_type: mediaType,
      forwarded_from: forwardedFrom,
      message_date: new Date(date * 1000).toISOString(),
    });

    if (error && error.code !== "23505") {
      console.error("Telegram webhook insert error:", error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Telegram webhook active" });
}
