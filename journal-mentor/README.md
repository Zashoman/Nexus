# Journal Mentor

Private AI mentor that reads your journal entries and tells you what you can't see about yourself.

## Daily Usage

```
cd ~/journal-mentor
python3 journal_mentor.py
```

1. Paste your journal entry
2. Press Enter on an empty line TWICE
3. Wait 10-30 seconds
4. Read the mentor's response

## Files

- `mentor_memory.json` — The mentor's accumulated memory. **Back this up.** If you lose it, the mentor resets to zero.
- `analyses/` — Every analysis saved as a markdown file.
- `backups/` — Auto-backups of the memory file (last 30 kept).

## Privacy

- All data stays on this machine
- The only external call is to the Anthropic API for analysis
- Make sure this folder is NOT inside an iCloud-synced directory
- Make sure FileVault (disk encryption) is turned on: System Settings → Privacy & Security → FileVault
