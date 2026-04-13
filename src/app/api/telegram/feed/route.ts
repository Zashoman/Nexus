import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  photo?: unknown[];
  video?: unknown;
  document?: unknown;
  forward_from_chat?: { title?: string; username?: string };
  forward_sender_name?: string;
  chat: { id: number; title?: string; username?: string };
}

async function fetchChannelMessages(username: string): Promise<TelegramMessage[]> {
  if (!BOT_TOKEN) return [];

  try {
    // For public channels, use getUpdates won't work directly
    // Instead we scrape the public telegram preview
    const res = await fetch(`https://t.me/s/${username}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];

    const html = await res.text();

    // Parse messages from the public preview page
    const messages: TelegramMessage[] = [];
    const msgRegex = /tgme_widget_message_wrap[\s\S]*?data-post="([^"]+)"[\s\S]*?<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    let match;
    let msgId = 0;

    while ((match = msgRegex.exec(html)) !== null) {
      const postId = match[1];
      const rawText = match[2]
        .replace(/<br\s*\/?>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      if (rawText.length > 0) {
        messages.push({
          message_id: msgId++,
          date: Math.floor(Date.now() / 1000),
          text: rawText,
          chat: { id: 0, username },
        });
      }
    }

    // Also try a simpler pattern for the text content
    if (messages.length === 0) {
      const simpleRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
      while ((match = simpleRegex.exec(html)) !== null) {
        const rawText = match[1]
          .replace(/<br\s*\/?>/g, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        if (rawText.length > 5) {
          messages.push({
            message_id: msgId++,
            date: Math.floor(Date.now() / 1000),
            text: rawText,
            chat: { id: 0, username },
          });
        }
      }
    }

    return messages.slice(-20);
  } catch {
    return [];
  }
}

export async function GET() {
  const db = getServiceSupabase();

  const { data: channels } = await db
    .from("intel_telegram_channels")
    .select("*")
    .eq("is_active", true);

  if (!channels || channels.length === 0) {
    return NextResponse.json({ messages: [], channels: [], new_messages: 0 });
  }

  let newMessages = 0;

  for (const channel of channels) {
    if (!channel.username) continue;

    const messages = await fetchChannelMessages(channel.username);

    for (const msg of messages) {
      const text = msg.text || msg.caption || "";
      if (!text || text.length < 5) continue;

      const msgKey = `${channel.username}_${msg.message_id}_${text.slice(0, 50)}`;

      const { data: existing } = await db
        .from("intel_telegram_messages")
        .select("id")
        .eq("chat_id", channel.username)
        .eq("text_content", text.slice(0, 500))
        .maybeSingle();

      if (existing) continue;

      await db.from("intel_telegram_messages").insert({
        message_id: String(msg.message_id),
        chat_id: channel.username,
        channel_name: channel.display_name,
        category: channel.category,
        text_content: text.slice(0, 2000),
        has_media: !!(msg.photo || msg.video || msg.document),
        media_type: msg.photo ? "photo" : msg.video ? "video" : msg.document ? "document" : null,
        forwarded_from: msg.forward_from_chat?.title || msg.forward_sender_name || null,
        message_date: new Date(msg.date * 1000).toISOString(),
      });
      newMessages++;
    }
  }

  // Return recent messages (last 7 days)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentMessages } = await db
    .from("intel_telegram_messages")
    .select("*")
    .gte("ingested_at", cutoff)
    .order("ingested_at", { ascending: false })
    .limit(100);

  return NextResponse.json({
    messages: recentMessages || [],
    channels: channels || [],
    new_messages: newMessages,
  });
}
