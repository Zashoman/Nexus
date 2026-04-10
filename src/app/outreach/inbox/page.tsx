'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  Check,
  Pencil,
  Clock,
  SkipForward,
  ChevronDown,
  Mail,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '@/components/outreach/layout/PageHeader';
import Card from '@/components/outreach/ui/Card';
import Badge from '@/components/outreach/ui/Badge';
import Button from '@/components/outreach/ui/Button';

type TabId = 'pending' | 'approved' | 'sent' | 'skipped';

const tabs: { id: TabId; label: string; count: number }[] = [
  { id: 'pending', label: 'Pending', count: 7 },
  { id: 'approved', label: 'Approved', count: 3 },
  { id: 'sent', label: 'Sent', count: 34 },
  { id: 'skipped', label: 'Skipped', count: 5 },
];

interface InboxThread {
  id: string;
  contact_name: string;
  contact_email: string;
  campaign_name: string;
  persona_name?: string;
  classification: string;
  confidence: number;
  subject: string;
  last_message: string;
  draft_preview: string;
  time: string;
  is_unread: boolean;
}

const mockThreads: InboxThread[] = [
  {
    id: '1',
    contact_name: 'Sarah Chen',
    contact_email: 'sarah@techcrunch.com',
    campaign_name: 'Atera Guest Posts',
    persona_name: 'Sarah',
    classification: 'Interested in topic',
    confidence: 94,
    subject: 'Re: Cybersecurity trends for SMBs — guest post pitch',
    last_message: 'Thanks for reaching out. We\'re interested in the cybersecurity angle. Can you send me a draft by Friday?',
    draft_preview: 'Hi Sarah, Great to hear! I\'ll have a polished draft over to you by Thursday afternoon. The piece will focus on the three biggest...',
    time: '12m ago',
    is_unread: true,
  },
  {
    id: '2',
    contact_name: 'Marcus Rodriguez',
    contact_email: 'marcus@fintech-weekly.com',
    campaign_name: 'BT Sales — Fintech',
    classification: 'Meeting request',
    confidence: 88,
    subject: 'Re: Scaling content for Series B companies',
    last_message: 'This sounds interesting. Could we set up a 30-minute call next week to discuss further?',
    draft_preview: 'Hi Marcus, Absolutely — I\'d love to walk you through how we\'ve helped similar companies. Here are a few times that work next week...',
    time: '45m ago',
    is_unread: true,
  },
  {
    id: '3',
    contact_name: 'Emma Johnson',
    contact_email: 'emma@wired.com',
    campaign_name: 'Atera Guest Posts',
    persona_name: 'James',
    classification: 'Wants different angle',
    confidence: 76,
    subject: 'Re: AI in cybersecurity — unique angles',
    last_message: 'We covered something similar last month. Do you have a different take on this?',
    draft_preview: 'Hi Emma, Great point — I saw the piece from last month. Here\'s a different angle I think your readers would love: rather than enterprise...',
    time: '2h ago',
    is_unread: false,
  },
  {
    id: '4',
    contact_name: 'Alex Park',
    contact_email: 'alex@siliconrepublic.com',
    campaign_name: 'Atera Guest Posts',
    persona_name: 'Sarah',
    classification: 'Send me a draft',
    confidence: 91,
    subject: 'Re: Remote work security challenges',
    last_message: 'We\'re looking for content in this space. Send me a 1,200 word draft and I\'ll review.',
    draft_preview: 'Hi Alex, Wonderful — I\'ll have a draft ready within 48 hours. Just to confirm: 1,200 words covering the top security challenges...',
    time: '3h ago',
    is_unread: false,
  },
  {
    id: '5',
    contact_name: 'Rachel Torres',
    contact_email: 'rachel@venturebeat.com',
    campaign_name: 'Atera Guest Posts',
    persona_name: 'James',
    classification: 'Pricing inquiry',
    confidence: 82,
    subject: 'Re: Expert commentary opportunity',
    last_message: 'Interesting. What does a typical collaboration look like? Is this paid content?',
    draft_preview: 'Hi Rachel, Great question. Our typical process is: we provide a fully-written, publication-ready article on a topic that aligns...',
    time: '4h ago',
    is_unread: false,
  },
];

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [selectedThread, setSelectedThread] = useState<string | null>('1');

  const selected = mockThreads.find((t) => t.id === selectedThread);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        subtitle="Review and approve draft responses"
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-bt-bg-alt rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-bt-surface text-bt-text shadow-sm'
                : 'text-bt-text-secondary hover:text-bt-text'
              }
            `}
          >
            {tab.label}
            <span className={`
              text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums
              ${activeTab === tab.id
                ? 'bg-bt-primary text-white'
                : 'bg-bt-border text-bt-text-secondary'
              }
            `}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bt-text-tertiary" />
          <input
            type="text"
            placeholder="Search threads..."
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary focus:border-transparent transition-shadow"
          />
        </div>
        <Button variant="secondary" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
          Campaign
          <ChevronDown className="w-3 h-3" />
        </Button>
        <Button variant="secondary" size="sm" icon={<Filter className="w-3.5 h-3.5" />}>
          Classification
          <ChevronDown className="w-3 h-3" />
        </Button>
      </div>

      {/* Split view: thread list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[600px]">
        {/* Thread list */}
        <div className="lg:col-span-2">
          <Card padding="none" className="h-full">
            <div className="divide-y divide-bt-border">
              {mockThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread.id)}
                  className={`
                    w-full text-left px-4 py-3.5 transition-colors
                    ${selectedThread === thread.id ? 'bg-bt-primary-bg/50' : 'hover:bg-bt-surface-hover'}
                  `}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {thread.is_unread && (
                        <span className="w-2 h-2 rounded-full bg-bt-primary shrink-0" />
                      )}
                      <span className={`text-sm ${thread.is_unread ? 'font-semibold text-bt-text' : 'font-medium text-bt-text'}`}>
                        {thread.contact_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-bt-text-tertiary shrink-0">{thread.time}</span>
                  </div>
                  <p className="text-xs text-bt-text-secondary truncate mb-1.5">{thread.subject}</p>
                  <p className="text-xs text-bt-text-tertiary truncate">{thread.last_message}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge variant="default" size="sm">{thread.campaign_name}</Badge>
                    {thread.persona_name && (
                      <Badge variant="info" size="sm">{thread.persona_name}</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Thread detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card padding="none" className="h-full flex flex-col">
              {/* Thread header */}
              <div className="p-5 border-b border-bt-border">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-bt-text">{selected.contact_name}</h3>
                    <p className="text-xs text-bt-text-secondary mt-0.5">{selected.contact_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={selected.confidence >= 90 ? 'success' : selected.confidence >= 70 ? 'warning' : 'danger'}
                      size="sm"
                    >
                      {selected.confidence}% confidence
                    </Badge>
                    <Badge variant="primary" size="sm">{selected.classification}</Badge>
                  </div>
                </div>
                <p className="text-xs text-bt-text-secondary mt-2">{selected.subject}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Incoming message */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-bt-bg-alt shrink-0 flex items-center justify-center text-xs font-bold text-bt-text-secondary">
                    {selected.contact_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-bt-text">{selected.contact_name}</span>
                      <span className="text-[11px] text-bt-text-tertiary">{selected.time}</span>
                    </div>
                    <div className="bg-bt-bg-alt rounded-lg rounded-tl-sm p-3">
                      <p className="text-sm text-bt-text leading-relaxed">{selected.last_message}</p>
                    </div>
                  </div>
                </div>

                {/* Agent draft */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bt-primary-light to-bt-teal shrink-0 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-bt-text">Agent Draft</span>
                      {selected.persona_name && (
                        <Badge variant="info" size="sm">as {selected.persona_name}</Badge>
                      )}
                      <span className="text-[11px] text-bt-text-tertiary">Just now</span>
                    </div>
                    <div className="bg-bt-primary-bg/50 border border-bt-primary/20 rounded-lg rounded-tl-sm p-3">
                      <p className="text-sm text-bt-text leading-relaxed">{selected.draft_preview}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="p-4 border-t border-bt-border bg-bt-bg/50">
                <div className="flex items-center gap-2">
                  <Button variant="success" size="sm" icon={<Check className="w-3.5 h-3.5" />}>
                    Approve & Send
                  </Button>
                  <Button variant="secondary" size="sm" icon={<Pencil className="w-3 h-3" />}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" icon={<Clock className="w-3.5 h-3.5" />}>
                    Delay
                  </Button>
                  <Button variant="ghost" size="sm" icon={<SkipForward className="w-3.5 h-3.5" />}>
                    Skip
                  </Button>
                  <div className="flex-1" />
                  <Button variant="ghost" size="sm">
                    View full thread
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <Mail className="w-10 h-10 text-bt-text-tertiary mx-auto mb-3" />
                <p className="text-sm text-bt-text-secondary">Select a thread to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
