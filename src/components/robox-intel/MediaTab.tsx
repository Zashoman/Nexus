'use client';

import { useState } from 'react';
import type { MediaContact, PitchAngle } from '@/types/robox-intel';
import { AddMediaContactModal } from './AddMediaContactModal';
import { AddPitchModal } from './AddPitchModal';

interface MediaTabProps {
  contacts: MediaContact[];
  pitches: PitchAngle[];
  onUpdated?: () => void;
}

const TYPE_COLORS = {
  journalist: { bg: '#3B82F620', color: '#60A5FA', label: 'Journalist' },
  newsletter: { bg: '#A855F720', color: '#C084FC', label: 'Newsletter' },
  publication: { bg: '#6B728020', color: '#A1A1AA', label: 'Publication' },
};

const RELEVANCE_COLORS = {
  high: { bg: '#EF444420', color: '#F87171', label: 'High' },
  medium: { bg: '#F59E0B20', color: '#FBBF24', label: 'Medium' },
  low: { bg: '#6B728020', color: '#A1A1AA', label: 'Low' },
};

export function MediaTab({ contacts, pitches, onUpdated }: MediaTabProps) {
  const [contactOpen, setContactOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Pitch Angles */}
      <section className="rounded-lg border border-[#F97316]/30 bg-[#F97316]/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] text-[#FB923C]">
            PITCH ANGLES
          </h2>
          {onUpdated && (
            <button
              onClick={() => setPitchOpen(true)}
              className="text-[11px] px-2 py-1 rounded border border-[#F97316]/40 text-[#FB923C] hover:bg-[#F97316]/10 transition-colors"
            >
              + Add angle
            </button>
          )}
        </div>
        <div className="space-y-3">
          {pitches.length === 0 ? (
            <p className="text-[12px] text-[#A1A1AA]">No pitch angles yet.</p>
          ) : (
            pitches.map((pitch) => (
              <div
                key={pitch.id}
                className="rounded-md border border-[#F97316]/20 bg-[#0F0F11] p-3"
              >
                <h3 className="text-[13px] font-semibold text-[#FAFAFA] mb-1">
                  {pitch.title}
                </h3>
                <p className="text-[10px] text-[#FB923C] uppercase tracking-wider mb-1.5">
                  {pitch.target_outlets}
                </p>
                <p className="text-[12px] text-[#D4D4D8] leading-relaxed">
                  {pitch.hook}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Media Contacts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] text-[#71717A]">
            MEDIA CONTACTS
          </h2>
          {onUpdated && (
            <button
              onClick={() => setContactOpen(true)}
              className="text-[11px] px-2 py-1 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3F3F46] transition-colors"
            >
              + Add contact
            </button>
          )}
        </div>
        <div className="rounded-lg border border-[#27272A] overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#18181B] border-b border-[#27272A]">
                <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA]">
                  Name
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA]">
                  Outlet
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA]">
                  Type
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA]">
                  Notes
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#A1A1AA]">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, idx) => {
                const typeCfg = TYPE_COLORS[c.type];
                const relCfg = RELEVANCE_COLORS[c.relevance] || RELEVANCE_COLORS.medium;
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-[#1C1C1F] last:border-b-0 ${
                      idx % 2 === 0 ? 'bg-[#0F0F11]' : 'bg-[#131316]'
                    }`}
                  >
                    <td className="px-3 py-2.5 align-top">
                      <div className="text-[#FAFAFA] font-medium">{c.name}</div>
                      {c.beat && (
                        <div className="text-[10px] text-[#71717A] mt-0.5">
                          {c.beat}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[#D4D4D8] align-top">
                      {c.outlet}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          backgroundColor: typeCfg.bg,
                          color: typeCfg.color,
                        }}
                      >
                        {typeCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[#A1A1AA] text-[11px] align-top max-w-md">
                      {c.notes}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                        style={{
                          backgroundColor: relCfg.bg,
                          color: relCfg.color,
                        }}
                      >
                        {relCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-[#71717A]">
                    No media contacts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PR Strategy Note */}
      <section className="rounded-lg border border-[#F97316]/30 bg-[#F97316]/5 p-5">
        <h3 className="text-[11px] font-semibold tracking-[0.2em] text-[#FB923C] mb-2">
          PR STRATEGY NOTE
        </h3>
        <p className="text-[12px] text-[#D4D4D8] leading-relaxed">
          Do not pitch press until you have a concrete milestone — a volume
          number, customer name, funding event, or open dataset release. Press
          attention without a story becomes a liability when the follow-up
          question is &quot;so what&apos;s new?&quot;. Build the list now so you
          are ready the moment you cross the threshold.
        </p>
      </section>

      {onUpdated && (
        <>
          <AddMediaContactModal
            open={contactOpen}
            onClose={() => setContactOpen(false)}
            onAdded={onUpdated}
          />
          <AddPitchModal
            open={pitchOpen}
            onClose={() => setPitchOpen(false)}
            onAdded={onUpdated}
          />
        </>
      )}
    </div>
  );
}
