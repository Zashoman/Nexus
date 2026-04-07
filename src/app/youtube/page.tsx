'use client';

import { useState, useEffect } from 'react';
import YouTubeTabs from '@/components/youtube/YouTubeTabs';
import VideoCard from '@/components/youtube/VideoCard';
import VideoDetailPanel from '@/components/youtube/VideoDetailPanel';

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
  full_summary: string | null;
}

interface Channel {
  id: string;
  channel_id: string;
  channel_name: string;
  category: string;
}

export default function YouTubePage() {
  const [activeTab, setActiveTab] = useState('all');
  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [addForm, setAddForm] = useState({ handle: '', channel_name: '', category: '' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, []);

  async function fetchFeed() {
    setLoading(true);
    try {
      const res = await fetch('/api/youtube/feed');
      const data = await res.json();
      setVideos(data.videos || []);
      setChannels(data.channels || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function addChannel() {
    if (!addForm.handle || !addForm.category) return;
    setAdding(true);
    try {
      await fetch('/api/youtube/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: addForm.handle, channel_name: addForm.channel_name || undefined, category: addForm.category }),
      });
      setAddForm({ handle: '', channel_name: '', category: '' });
      setShowAddChannel(false);
      fetchFeed();
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  }

  async function removeVideo(videoId: string) {
    try {
      await fetch(`/api/youtube/feed?video_id=${videoId}`, { method: "DELETE" });
      setVideos((prev) => prev.filter((v: Video) => v.video_id !== videoId));
      if (selectedVideo?.video_id === videoId) {
        setSelectedVideo(null);
      }
    } catch {
      // silent
    }
  }

  const categories = [...new Set(channels.map((c: Channel) => c.category))];
  const filteredVideos = activeTab === 'all'
    ? videos
    : videos.filter((v: Video) => v.category === activeTab);

  function handleSelectVideo(video: Video) {
    setSelectedVideo(video);
    setMobileDetailOpen(true);
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] text-[#E8EAED]">
      {/* Header */}
      <div className="border-b border-[#1E2A3A] bg-[#0D1117] px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-mono text-[#FF4444] font-bold uppercase tracking-wider">YouTube Intelligence</h1>
          <span className="text-[10px] font-mono text-[#5A6A7A]">{channels.length} channels · {videos.length} videos</span>
        </div>
        <button
          onClick={() => setShowAddChannel(!showAddChannel)}
          className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer"
        >
          {showAddChannel ? '✕ Cancel' : '+ Add Channel'}
        </button>
      </div>

      {/* Add Channel Form */}
      {showAddChannel && (
        <div className="px-4 py-2 bg-[#141820] border-b border-[#1E2A3A] space-y-2">
          <p className="text-[10px] font-mono text-[#5A6A7A]">
            To find the channel ID: go to the YouTube channel → View Page Source → search for &quot;channelId&quot;
          </p>
          <div className="flex gap-2">
            <input type="text" value={addForm.handle} onChange={(e) => setAddForm({ ...addForm, handle: e.target.value })} placeholder="YouTube handle (e.g. @CaspianReport)" className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
            <input type="text" value={addForm.channel_name} onChange={(e) => setAddForm({ ...addForm, channel_name: e.target.value })} placeholder="Channel name" className="w-40 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
            <input type="text" value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} placeholder="Category" className="w-28 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#4488FF]" />
            <button onClick={addChannel} disabled={adding || !addForm.handle || !addForm.category} className="px-3 py-1 text-xs font-mono bg-[#4488FF] text-white rounded-sm hover:bg-[#5599FF] disabled:opacity-50 cursor-pointer">
              {adding ? '...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <YouTubeTabs activeTab={activeTab} categories={categories} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Feed */}
        <div className="flex-1 overflow-y-auto bg-[#0B0E11] min-w-0 lg:max-w-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-[#5A6A7A] text-xs font-mono animate-pulse">Loading videos...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <p className="text-[#5A6A7A] text-xs font-mono">No videos yet</p>
                <p className="text-[#5A6A7A] text-[10px] font-mono mt-1">Add a channel and refresh to populate</p>
              </div>
            </div>
          ) : (
            filteredVideos.map((video: Video) => (
              <VideoCard
                key={video.id}
                video={video}
                isSelected={selectedVideo?.video_id === video.video_id}
                onClick={() => handleSelectVideo(video)}
                onRemove={() => removeVideo(video.video_id)}
              />
            ))
          )}
        </div>

        {/* Detail Panel — desktop */}
        <div className="hidden lg:flex flex-1">
          <VideoDetailPanel video={selectedVideo} />
        </div>

        {/* Detail Panel — mobile overlay */}
        {mobileDetailOpen && selectedVideo && (
          <div className="fixed inset-0 z-40 bg-[#0B0E11] lg:hidden overflow-y-auto">
            <VideoDetailPanel
              video={selectedVideo}
              onClose={() => setMobileDetailOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
