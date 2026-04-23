// Phase 5: runs at 23:59 LOCAL_TZ. Appends any session rows with backed_up_at IS NULL
// to the three-tab Google Sheet and marks them backed up.

export async function runNightlyBackup(): Promise<void> {
  // Phase 1 stub
  // eslint-disable-next-line no-console
  console.log('[nightly-backup] phase 1 stub — no-op');
}
