import { getServiceSupabase } from '@/lib/supabase';

/**
 * Typed getters for platform settings. Each setting has a default used
 * when the row is missing.
 */

export interface Settings {
  auto_archive_days: number;
  llm_enabled: boolean;
  velocity_threshold: number;
  velocity_window_hours: number;
  digest_recipients: string[];
  digest_send_time_utc: string;
}

const DEFAULTS: Settings = {
  auto_archive_days: 30,
  llm_enabled: true,
  velocity_threshold: 3,
  velocity_window_hours: 24,
  digest_recipients: [],
  digest_send_time_utc: '08:00',
};

export async function getSettings(): Promise<Settings> {
  const supabase = getServiceSupabase();
  const { data } = await supabase.from('robox_settings').select('key, value');

  const map = new Map<string, unknown>();
  for (const row of data || []) {
    map.set(row.key, row.value);
  }

  return {
    auto_archive_days:
      (map.get('auto_archive_days') as number) ?? DEFAULTS.auto_archive_days,
    llm_enabled:
      (map.get('llm_enabled') as boolean) ?? DEFAULTS.llm_enabled,
    velocity_threshold:
      (map.get('velocity_threshold') as number) ?? DEFAULTS.velocity_threshold,
    velocity_window_hours:
      (map.get('velocity_window_hours') as number) ?? DEFAULTS.velocity_window_hours,
    digest_recipients:
      (map.get('digest_recipients') as string[]) ?? DEFAULTS.digest_recipients,
    digest_send_time_utc:
      (map.get('digest_send_time_utc') as string) ?? DEFAULTS.digest_send_time_utc,
  };
}

export async function updateSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase
    .from('robox_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
}
