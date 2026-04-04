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

interface MessageCardProps {
  message: Message;
  isSelected: boolean;
  onClick: () => void;
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

export default function MessageCard({ message, isSelected, onClick }: MessageCardProps) {
  const text = message.text_content || "";
  const preview = text.length > 200 ? text.slice(0, 200) + "..." : text;

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-pointer transition-colors border-b ${
        isSelected
          ? "bg-[#1A2332] border-[#1E2A3A]"
          : "bg-[#141820] border-[#1E2A3A]/50 hover:bg-[#1A2030]"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono text-[#29B6F6] font-bold">{message.channel_name}</span>
        <span className="text-[10px] font-mono text-[#5A6A7A] capitalize">{message.category}</span>
        {message.forwarded_from && (
          <span className="text-[10px] font-mono text-[#FF8C00]">fwd: {message.forwarded_from}</span>
        )}
        {message.has_media && (
          <span className="text-[10px] font-mono text-[#5A6A7A]">[{message.media_type || "media"}]</span>
        )}
        <span className="text-[10px] font-mono text-[#5A6A7A] ml-auto">
          {timeAgo(message.ingested_at)}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); }}
          className="text-[#5A6A7A] hover:text-[#FF4444] text-[10px] cursor-pointer ml-1"
          title="Dismiss"
        >X</button>
      </div>
      <p className="text-[13px] text-[#E8EAED]/90 leading-relaxed">
        {preview}
      </p>
    </div>
  );
}
