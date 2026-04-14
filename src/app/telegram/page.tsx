"use client";

import { useState, useEffect } from "react";
import TelegramTabs from "@/components/telegram/TelegramTabs";
import MessageCard from "@/components/telegram/MessageCard";
import MessageDetail from "@/components/telegram/MessageDetail";
import { apiFetch } from "@/lib/api-client";

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

interface Channel {
  id: string;
  username: string | null;
  display_name: string;
  category: string;
}

export default function TelegramPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [addForm, setAddForm] = useState({ username: "", display_name: "", category: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, []);

  async function fetchFeed() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/telegram/feed");
      const data = await res.json();
      setMessages(data.messages || []);
      setChannels(data.channels || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function addChannel() {
    if (!addForm.display_name || !addForm.category) return;
    setAdding(true);
    try {
      await apiFetch("/api/telegram/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      setAddForm({ username: "", display_name: "", category: "" });
      setShowAddChannel(false);
      fetchFeed();
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  }

  const categories = [...new Set(channels.map((c: Channel) => c.category))];
  const filteredMessages = activeTab === "all"
    ? messages
    : messages.filter((m: Message) => m.category === activeTab);

  function handleSelectMessage(msg: Message) {
    setSelectedMessage(msg);
    setMobileDetailOpen(true);
  }

  return (
    <div className="flex flex-col h-screen bg-[#0B0E11] text-[#E8EAED]">
      <div className="border-b border-[#1E2A3A] bg-[#0D1117] px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-mono text-[#29B6F6] font-bold uppercase tracking-wider">Telegram Intelligence</h1>
          <span className="text-[10px] font-mono text-[#5A6A7A]">{channels.length} channels - {messages.length} messages</span>
        </div>
        <button
          onClick={() => setShowAddChannel(!showAddChannel)}
          className="text-[10px] font-mono text-[#4488FF] hover:text-[#6699FF] cursor-pointer"
        >
          {showAddChannel ? "X Cancel" : "+ Add Channel"}
        </button>
      </div>

      {showAddChannel && (
        <div className="px-4 py-2 bg-[#141820] border-b border-[#1E2A3A] space-y-2">
          <div className="flex gap-2">
            <input type="text" value={addForm.username} onChange={(e) => setAddForm({ ...addForm, username: e.target.value })} placeholder="Channel username (without @)" className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#29B6F6]" />
            <input type="text" value={addForm.display_name} onChange={(e) => setAddForm({ ...addForm, display_name: e.target.value })} placeholder="Display name" className="w-40 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#29B6F6]" />
            <input type="text" value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} placeholder="Category" className="w-28 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-2 py-1 text-xs text-[#E8EAED] placeholder-[#5A6A7A] focus:outline-none focus:border-[#29B6F6]" />
            <button onClick={addChannel} disabled={adding || !addForm.display_name || !addForm.category} className="px-3 py-1 text-xs font-mono bg-[#29B6F6] text-[#0B0E11] rounded-sm hover:bg-[#4FC3F7] disabled:opacity-50 cursor-pointer">
              {adding ? "..." : "Add"}
            </button>
          </div>
        </div>
      )}

      <TelegramTabs activeTab={activeTab} categories={categories} onTabChange={setActiveTab} />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-[#0B0E11] min-w-0 lg:max-w-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-[#5A6A7A] text-xs font-mono animate-pulse">Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <p className="text-[#5A6A7A] text-xs font-mono">No messages yet</p>
                <p className="text-[#5A6A7A] text-[10px] font-mono mt-1">Messages will appear when channels post</p>
              </div>
            </div>
          ) : (
            filteredMessages.map((msg: Message) => (
              <MessageCard
                key={msg.id}
                message={msg}
                isSelected={selectedMessage?.id === msg.id}
                onClick={() => handleSelectMessage(msg)}
              />
            ))
          )}
        </div>

        <div className="hidden lg:flex flex-1">
          <MessageDetail message={selectedMessage} />
        </div>

        {mobileDetailOpen && selectedMessage && (
          <div className="fixed inset-0 z-40 bg-[#0B0E11] lg:hidden overflow-y-auto">
            <MessageDetail
              message={selectedMessage}
              onClose={() => setMobileDetailOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
