'use client';

interface Video {
  id: string;
  video_id: string;
  channel_name: string;
  category: string;
  title: string;
  description: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  video_url: string;
  mini_summary: string | null;
}

interface VideoCardProps {
  video: Video;
  isSelected: boolean;
  onClick: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function VideoCard({ video, isSelected, onClick }: VideoCardProps) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 cursor-pointer transition-colors border-b ${
        isSelected
          ? 'bg-[#1A2332] border-[#1E2A3A]'
          : 'bg-[#141820] border-[#1E2A3A]/50 hover:bg-[#1A2030]'
      }`}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        {video.thumbnail_url && (
          <div className="flex-shrink-0 w-[120px] h-[68px] bg-[#0B0E11] rounded-sm overflow-hidden">
            <img
              src={video.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Channel + time */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono text-[#FF4444] font-bold">{video.channel_name}</span>
            <span className="text-[10px] font-mono text-[#5A6A7A] capitalize">{video.category}</span>
            {video.published_at && (
              <span className="text-[10px] font-mono text-[#5A6A7A] ml-auto">{timeAgo(video.published_at)}</span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-[13px] font-medium text-[#E8EAED] leading-tight line-clamp-2">
            {video.title}
          </h3>

          {/* Mini summary */}
          {video.mini_summary && (
            <p className="text-[11px] text-[#5A6A7A] leading-relaxed line-clamp-1 mt-0.5">
              {video.mini_summary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
