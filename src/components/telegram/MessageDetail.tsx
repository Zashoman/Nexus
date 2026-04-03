"use client";

interface Message {
  id: string;
  message_id: string;
  chat_id: string;
  channel_name: string;
  category: string;
  text_content: string | null;
  has_media: boolean;
  media_type: string | null;
  forwarded_from: string | null;
  message_date: string;
  ingested_at: string;
}

interface MessageDetailProps {
  message: Message | null;
  onClose?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m ago";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  return days + "d ago";
}

function renderText(text: string) {
  // Detect URLs and make them clickable
  const urlRegex = new RegExp("(https?:\\/\\/[^\\s]+)", "g");
  const parts = text.split(urlRegex);

  return parts.map((part: string, i: number) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#29B6F6] hover:text-[#4FC3F7] underline break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function MessageDetail({ message, onClose }: MessageDetailProps) {
  if (!message) {
    return (
      <div className="flex-1 bg-[#141820] flex items-center justify-center">
        <p className="text-[#5A6A7A] text-sm font-mono">Select a message to view details</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#141820] overflow-y-auto border-l border-[#1E2A3A]">
      {onClose && (
        <button onClick={onClose} className="lg:hidden absolute top-2 right-2 text-[#5A6A7A] hover:text-[#E8EAED] text-lg px-2 cursor-pointer">
          X
        </button>
      )}

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[#29B6F6] font-bold">{message.channel_name}</span>
          <span className="text-[#5A6A7A] capitalize">{message.category}</span>
          <span className="text-[#5A6A7A]">{timeAgo(message.ingested_at)}</span>
        </div>

        {message.forwarded_from && (
          <div className="text-[11px] font-mono text-[#FF8C00] bg-[#FF8C00]/5 px-2 py-1 rounded-sm">
            Forwarded from: {message.forwarded_from}
          </div>
        )}

        {message.has_media && (
          <div className="text-[11px] font-mono text-[#5A6A7A] bg-[#5A6A7A]/5 px-2 py-1 rounded-sm">
            Contains: {message.media_type || "media"}
          </div>
        )}

        <div className="text-[14px] text-[#E8EAED]/90 leading-relaxed whitespace-pre-wrap">
          {message.text_content ? renderText(message.text_content) : "No text content"}
        </div>

        {message.chat_id && (
          <a
            href={`https://t.me/${message.chat_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono bg-[#29B6F6]/10 text-[#29B6F6] rounded-sm hover:bg-[#29B6F6]/20 transition-colors"
          >
            Open in Telegram
          </a>
        )}
      </div>
    </div>
  );
}
