"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CANONICAL_SECTORS,
  GEOGRAPHIES,
  STAGES,
  EXCLUDES,
  type Channel,
} from "@/lib/types";

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  initial?: Partial<Channel>;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1 rounded-full text-sm border transition-colors " +
        (active
          ? "bg-[var(--accent)] text-[var(--background)] border-[var(--accent)]"
          : "bg-transparent text-[var(--foreground)] border-[var(--border)] hover:border-[var(--muted)]")
      }
    >
      {label}
    </button>
  );
}

export default function ChannelEditor({ mode, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [chatId, setChatId] = useState(initial?.telegram_chat_id ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sectors, setSectors] = useState<string[]>(initial?.sectors ?? []);
  const [geographies, setGeographies] = useState<string[]>(
    initial?.geographies ?? [],
  );
  const [stages, setStages] = useState<string[]>(
    initial?.stages ?? ["filed", "priced"],
  );
  const [excludes, setExcludes] = useState<string[]>(initial?.excludes ?? []);
  const [minRaise, setMinRaise] = useState<number>(
    initial?.min_raise_usd ?? 0,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (
    list: string[],
    value: string,
    setter: (x: string[]) => void,
  ) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const toggleSectorAll = () => {
    setSectors(sectors.includes("*") ? [] : ["*"]);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const body = {
      name,
      telegram_chat_id: chatId,
      is_active: isActive,
      sectors,
      geographies,
      stages,
      excludes,
      min_raise_usd: minRaise,
    };
    const url = mode === "create" ? "/api/channels" : `/api/channels/${initial?.id}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "save failed");
      return;
    }
    router.push("/channels");
    router.refresh();
  };

  const remove = async () => {
    if (mode !== "edit" || !initial?.id) return;
    if (!confirm(`Delete channel "${initial.name}"? This cannot be undone.`))
      return;
    const res = await fetch(`/api/channels/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/channels");
      router.refresh();
    } else {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "delete failed");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Channel name</label>
          <input
            className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--muted)]"
            placeholder="@biotech-ipos"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-xs text-[var(--muted)] mt-1">
            Display name. Usually the Telegram channel handle.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Telegram chat ID
          </label>
          <input
            className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--muted)]"
            placeholder="-1001234567890"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
          />
          <p className="text-xs text-[var(--muted)] mt-1">
            Numeric chat ID (channels start with -100). Get it from getUpdates.
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Sectors</label>
          <button
            type="button"
            onClick={toggleSectorAll}
            className="text-xs underline text-[var(--muted)]"
          >
            {sectors.includes("*") ? "unpin *" : "match any (*)"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {CANONICAL_SECTORS.map((s) => (
            <Chip
              key={s}
              label={s}
              active={sectors.includes(s) || sectors.includes("*")}
              onClick={() => {
                if (sectors.includes("*")) setSectors([s]);
                else toggle(sectors, s, setSectors);
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Geographies</label>
        <div className="flex flex-wrap gap-2">
          {GEOGRAPHIES.map((g) => (
            <Chip
              key={g}
              label={g}
              active={geographies.includes(g)}
              onClick={() => toggle(geographies, g, setGeographies)}
            />
          ))}
        </div>
        <p className="text-xs text-[var(--muted)] mt-1">
          Empty = any geography.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Stages</label>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <Chip
              key={s}
              label={s}
              active={stages.includes(s)}
              onClick={() => toggle(stages, s, setStages)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Excludes</label>
        <div className="flex flex-wrap gap-2">
          {EXCLUDES.map((e) => (
            <Chip
              key={e}
              label={e}
              active={excludes.includes(e)}
              onClick={() => toggle(excludes, e, setExcludes)}
            />
          ))}
        </div>
        <p className="text-xs text-[var(--muted)] mt-1">
          Hard filters. e.g. exclude SPACs even if they match on sector.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            Min raise (USD)
          </label>
          <input
            type="number"
            min={0}
            step={1000000}
            className="w-full px-3 py-2 bg-transparent border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--muted)]"
            value={minRaise}
            onChange={(e) => setMinRaise(Number(e.target.value) || 0)}
          />
          <p className="text-xs text-[var(--muted)] mt-1">
            IPOs with deal size below this are skipped. 0 = no floor.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <label className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>Active (receives alerts)</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500 bg-red-500/10 text-red-600 dark:text-red-300 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
        <div>
          {mode === "edit" && (
            <button
              type="button"
              onClick={remove}
              className="px-4 py-2 text-sm rounded-md text-red-600 dark:text-red-400 hover:bg-red-500/10"
            >
              Delete channel
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--card)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !name || !chatId}
            className="px-4 py-2 text-sm rounded-md bg-[var(--accent)] text-[var(--background)] disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "create" ? "Create channel" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
