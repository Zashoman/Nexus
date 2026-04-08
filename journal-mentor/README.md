# Journal Mentor — Dialectic System

Private AI mentor that reads your journal entries, engages in dialogue, tracks psychological patterns, and generates accountability reports.

## Quick Start

```bash
cd ~/journal-mentor
pip3 install -r requirements.txt
python3 app.py
```

Open **http://localhost:5001** in your browser.

## Environment Variables

Add these to your `~/.zshrc`:

```bash
# Required — your Anthropic API key
export ANTHROPIC_JOURNAL_KEY="sk-ant-api03-your-key-here"

# Optional — Google Doc backup
export JOURNAL_GDOC_WEBHOOK="https://script.google.com/macros/s/.../exec"

# Optional — Email delivery for reports
export JOURNAL_EMAIL_WEBHOOK="https://script.google.com/macros/s/.../exec"
```

Then run `source ~/.zshrc`.

## Features

### Journal Tab
- Write journal entries on the left
- Mentor analysis appears on the right
- Engage in dialogue — push back, go deeper, correct the mentor
- Browse and review past entries

### Debugging Matrix
- Track recurring psychological patterns ("bugs")
- Mentor automatically detects and flags patterns
- See fire counts and trends over time

### System Tab
- **Goals**: Set "moving toward" and "moving away from" goals
- **Reports**: Generate weekly accountability reports and monthly deep reads
- **Documents**: Upload supporting documents for analysis
- **Baseline Profile**: Upload your psychological baseline for deeper reads

## Google Doc Backup Setup

1. Create a Google Doc at docs.google.com
2. Go to Extensions → Apps Script
3. Paste the webhook script (see below)
4. Deploy → New deployment → Web app → Execute as Me → Anyone
5. Copy the URL and set as `JOURNAL_GDOC_WEBHOOK`

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  if (body.getText().length > 0) body.appendPageBreak();
  var header = body.appendParagraph("Entry #" + data.entry_number + " — " + data.date);
  header.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  var jh = body.appendParagraph("My Journal Entry");
  jh.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(data.journal_entry);
  body.appendHorizontalRule();
  var mh = body.appendParagraph("Mentor Response");
  mh.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(data.analysis);
  body.appendParagraph("");
  return ContentService.createTextOutput(JSON.stringify({status: "ok"}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Email Delivery Setup

1. Go to script.google.com → New project
2. Paste the email script:

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: data.subject,
    htmlBody: data.body.replace(/\n/g, "<br>")
  });
  return ContentService.createTextOutput(JSON.stringify({status: "ok"}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Deploy → New deployment → Web app → Execute as Me → Anyone
4. Copy the URL and set as `JOURNAL_EMAIL_WEBHOOK`

## Files

- `journal_mentor.db` — SQLite database. **Back this up.**
- `mentor_memory.json` — Accumulated mentor memory. **Back this up.**
- `baseline_profile.md` — Your psychological baseline profile
- `analyses/` — Markdown files of each analysis
- `backups/` — Auto-backups of the memory file (last 30 kept)
- `documents/` — Uploaded documents

## Backup

Copy the entire `~/journal-mentor` folder to back up everything.

## Privacy

- All data stays on this machine
- External calls: Anthropic API only (+ optional Google webhooks)
- Do NOT put this folder in an iCloud-synced directory
- Enable FileVault: System Settings → Privacy & Security → FileVault
