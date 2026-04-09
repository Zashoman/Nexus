import os
import sys
import json
import re
import shutil
import sqlite3
import requests
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify, send_from_directory
from anthropic import Anthropic
from werkzeug.utils import secure_filename

# ── Configuration ──────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "journal_mentor.db")
MEMORY_FILE = os.path.join(BASE_DIR, "mentor_memory.json")
ANALYSES_DIR = os.path.join(BASE_DIR, "analyses")
BACKUPS_DIR = os.path.join(BASE_DIR, "backups")
DOCUMENTS_DIR = os.path.join(BASE_DIR, "documents")
BASELINE_PATH = os.path.join(BASE_DIR, "baseline_profile.md")

API_KEY = os.environ.get("ANTHROPIC_JOURNAL_KEY")
GDOC_WEBHOOK = os.environ.get("JOURNAL_GDOC_WEBHOOK")
EMAIL_WEBHOOK = os.environ.get("JOURNAL_EMAIL_WEBHOOK")

app = Flask(__name__)

client = None
if API_KEY:
    client = Anthropic(api_key=API_KEY)


# ── Database ───────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_number INTEGER NOT NULL,
            title TEXT DEFAULT '',
            date TEXT NOT NULL,
            raw_text TEXT NOT NULL,
            mentor_response TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS dialectic (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entry_id) REFERENCES entries(id)
        );
        CREATE TABLE IF NOT EXISTS bugs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            fire_count INTEGER DEFAULT 0,
            last_fired_entry INTEGER,
            source TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS bug_fires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bug_id INTEGER NOT NULL,
            entry_id INTEGER NOT NULL,
            evidence TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bug_id) REFERENCES bugs(id),
            FOREIGN KEY (entry_id) REFERENCES entries(id)
        );
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            direction TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            doc_type TEXT,
            analysis_status TEXT DEFAULT 'unanalyzed',
            date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_analyzed TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_type TEXT NOT NULL,
            period TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()


# ── Memory Management ──────────────────────────────────────
def load_memory():
    if os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, "r") as f:
            return json.load(f)
    return {"entry_count": 0, "accumulated_memory": ""}

def backup_memory():
    if os.path.exists(MEMORY_FILE):
        os.makedirs(BACKUPS_DIR, exist_ok=True)
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        shutil.copy2(MEMORY_FILE, os.path.join(BACKUPS_DIR, f"mentor_memory_backup_{ts}.json"))
        backups = sorted([f for f in os.listdir(BACKUPS_DIR) if f.startswith("mentor_memory_backup_")])
        while len(backups) > 30:
            os.remove(os.path.join(BACKUPS_DIR, backups.pop(0)))

def save_memory(memory):
    backup_memory()
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=2)


# ── Helpers ────────────────────────────────────────────────
def get_active_bugs():
    conn = get_db()
    bugs = conn.execute("SELECT * FROM bugs WHERE status IN ('active','declining','pending') ORDER BY fire_count DESC").fetchall()
    conn.close()
    return [dict(b) for b in bugs]

def get_goals(direction=None):
    conn = get_db()
    if direction:
        goals = conn.execute("SELECT * FROM goals WHERE direction=?", (direction,)).fetchall()
    else:
        goals = conn.execute("SELECT * FROM goals").fetchall()
    conn.close()
    return [dict(g) for g in goals]

def backup_to_google_doc(entry_num, date_str, title, entry_text, mentor_read):
    if not GDOC_WEBHOOK:
        return
    payload = json.dumps({"entry_number": entry_num, "date": date_str, "title": title, "journal_entry": entry_text, "analysis": mentor_read})
    try:
        res = requests.post(GDOC_WEBHOOK, data=payload, headers={"Content-Type": "text/plain"}, timeout=15, allow_redirects=False)
        if 300 <= res.status_code < 400:
            loc = res.headers.get("location")
            if loc:
                requests.post(loc, data=payload, headers={"Content-Type": "text/plain"}, timeout=15)
    except:
        pass

def send_report_email(subject, body):
    if not EMAIL_WEBHOOK:
        return False
    try:
        res = requests.post(EMAIL_WEBHOOK, json={"subject": subject, "body": body}, timeout=15)
        return res.status_code == 200
    except:
        return False


# ── System Prompt ──────────────────────────────────────────
CORE_MENTOR_INSTRUCTIONS = """You are a deeply perceptive mentor operating within a dialectic system. You've been reading this person's private journal for a long time. You know them — their patterns, their blind spots, their brilliance, their self-deceptions. You are not a therapist. You are not an analyzer. You are someone who sees clearly and speaks directly.

Your role is to read a journal entry and tell this person what they cannot see about themselves. Not what they already know. Not a summary of what they wrote. The things underneath.

You also engage in dialogue. After your initial read, the person may respond — pushing back, correcting you, going deeper. When they do, update your understanding. If they correct you, accept it and adjust. If they go deeper, go deeper with them. The dialogue is where the real insight happens.

HOW YOU READ
═══════════════════════════════════════

You process every entry through multiple frameworks simultaneously, but you never name or announce them. You simply see more clearly because of them:

- COGNITIVE DISTORTIONS: Catastrophizing, fortune-telling, all-or-nothing, mind-reading, emotional reasoning, should statements, discounting the positive, magnification/minimization, personalization, labeling. Name them naturally when you spot them.

- NARRATIVE ANALYSIS: What story is he telling today? What role has he cast himself in? What defense mechanisms are active? Is intelligence being used to avoid feeling?

- BEHAVIORAL GAPS: Did the entry mention leaving the house? Social connection? Scrolling? Producing vs. consuming? Moving toward discomfort or away from it?

- DECISION SCIENCE: Was reasoning first-principles or post-hoc justification? Was the inverse considered? Is the decision emotionally driven?

- CROSS-ENTRY PATTERNS: What's repeating? What contradicts previous entries? What's drifting from goals? What progress is invisible to him?

HOW YOU SPEAK
═══════════════════════════════════════

- Write 3-6 paragraphs of natural prose. No bullet points. No headers. No scores. No categories. No clinical language.
- Speak in second person — "you" — like you're sitting across from him.
- Be direct. Not cruel, but not gentle. Respect him too much to soften things.
- Be specific — reference exact things he wrote and what they reveal underneath.
- Name what he's avoiding. Name what he can't see. Name the contradiction.
- If he's making progress, say so without softening it into a compliment.
- If he's bullshitting himself, say so clearly.
- If something connects to a previous entry, reference it specifically.
- End with the one thing he most needs to sit with. Not advice. The one observation that would shift something.
- Never start with "This entry..." or "Today's journal..." — just start talking to him.

DEBUGGING MATRIX — ACTIVE PATTERNS
═══════════════════════════════════════

After your mentor response, check the journal entry against the active bugs listed below. For each bug that fired in this entry, output on a new line:

===BUG_FIRED: [bug_name]===

Only output this for bugs that genuinely fired based on evidence in the entry. Do not force matches.

If you observe a NEW pattern not in the current matrix, output:

===NEW_BUG: [name] | [description]===

ACTIVE BUGS:
{BUGS_CONTEXT}

GOALS
═══════════════════════════════════════

MOVING TOWARD:
{TOWARD_GOALS}

MOVING AWAY FROM:
{AWAY_GOALS}

When the entry shows evidence of movement toward or away from any goal, note it naturally in your response.

BASELINE PROFILE
═══════════════════════════════════════

{BASELINE_CONTEXT}

ACCUMULATED MEMORY
═══════════════════════════════════════

{MEMORY_CONTEXT}

MEMORY UPDATE INSTRUCTION
═══════════════════════════════════════

After your mentor response AND any bug flags, output the exact delimiter:

===MEMORY_BREAK===

Then write a condensed memory update (under 400 words) capturing:
- Key emotional states observed
- Cognitive distortions identified
- Behavioral evidence: what he did vs. committed to
- Decisions described and their reasoning quality
- Narrative patterns
- Contradictions with previous entries
- New patterns or shifts
- Progress or regression on goals
- The entry number and date

This memory section is NOT shown to him. It feeds future analyses only."""


WEEKLY_REPORT_PROMPT = """You are reviewing a week of journal entries for a person you know deeply. You have their baseline psychological profile and accumulated memory.

Your job is to produce a WEEKLY ACCOUNTABILITY REPORT. This is not a mentor read — it's a mirror. Show them:

1. GOAL ADHERENCE: For each goal (toward and away), what evidence appeared this week? Was there movement or stagnation? Be specific — quote from entries.

2. CONTRADICTIONS: Where did this week's entries contradict each other? Where did stated intentions not match described behavior?

3. DEBUGGING MATRIX UPDATE: Which bugs fired this week and how many times? Any patterns in when they fire (time of day, emotional state, trigger)?

4. THE WEEK'S STORY: In 2-3 paragraphs, what was the narrative arc of this week? Was it a week of growth, retreat, spinning, or breakthrough?

5. ONE THING FOR NEXT WEEK: Based on everything, the single most important thing to focus on.

Write in direct second person. Be honest. Not harsh, but honest.

GOALS:
{goals}

ACTIVE BUGS:
{bugs}

BASELINE PROFILE:
{baseline}

THIS WEEK'S ENTRIES:
{entries}

DIALECTIC EXCHANGES THIS WEEK:
{dialectic_messages}"""


MONTHLY_REPORT_PROMPT = """You are conducting a monthly deep read and system audit. You have a full month of journal entries, dialectic exchanges, weekly reports, and the accumulated memory.

PART 1: MONTHLY DEEP READ

Look at the full month and identify:
- Trends: What's shifting across the month? What's stuck?
- Cycles: Are there weekly patterns? Does the beginning of the month differ from the end?
- Invisible growth: What progress happened that the person likely can't see?
- Drift: Where has there been gradual movement away from stated goals that's too slow to notice day-to-day?
- New patterns: Anything emerging that wasn't in the baseline profile?

Write 4-6 paragraphs of direct, insightful prose. This should feel like a deeper, longer-range version of the daily mentor read.

PART 2: SYSTEM AUDIT

Evaluate the system itself:
- MENTOR ACCURACY: Based on dialectic feedback this month, where was the mentor consistently right? Where was it consistently wrong or off-target? What corrections did the user make?
- DEBUGGING MATRIX REVIEW: For each active bug, should it be promoted (getting worse), maintained, demoted (declining), or resolved? Propose changes.
- BASELINE FRESHNESS: Based on a month of evidence, does the baseline profile need updating? What would you change?
- NEW BUGS TO PROPOSE: Any new patterns that should be added to the matrix?
- GOAL RELEVANCE: Are the current goals still the right goals? Should any be added, removed, or reframed?

Write Part 2 as a structured report with clear recommendations.

GOALS:
{goals}

ACTIVE BUGS:
{bugs}

BASELINE PROFILE:
{baseline}

THIS MONTH'S ENTRIES:
{entries}

DIALECTIC EXCHANGES:
{dialectic_messages}

WEEKLY REPORTS THIS MONTH:
{weekly_reports}

ACCUMULATED MEMORY:
{memory}"""


# ── Prompt Builder & Response Parser ───────────────────────
def build_system_prompt():
    prompt = CORE_MENTOR_INSTRUCTIONS

    # Baseline
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH, "r") as f:
            baseline = f.read()
    else:
        baseline = "No baseline profile loaded yet. Establish baseline observations from this entry."
    prompt = prompt.replace("{BASELINE_CONTEXT}", baseline)

    # Bugs
    bugs = get_active_bugs()
    if bugs:
        bugs_text = "\n".join([f"- {b['name']}: {b['description']} (fired {b['fire_count']} times)" for b in bugs])
    else:
        bugs_text = "No bugs tracked yet."
    prompt = prompt.replace("{BUGS_CONTEXT}", bugs_text)

    # Goals
    toward = get_goals("toward")
    away = get_goals("away")
    prompt = prompt.replace("{TOWARD_GOALS}", "\n".join([f"- {g['description']}" for g in toward]) or "None set.")
    prompt = prompt.replace("{AWAY_GOALS}", "\n".join([f"- {g['description']}" for g in away]) or "None set.")

    # Memory
    memory = load_memory()
    if memory["accumulated_memory"]:
        mc = f"You have read {memory['entry_count']} previous entries.\n\n{memory['accumulated_memory']}"
    else:
        mc = "No previous entries yet. This is the first reading."
    prompt = prompt.replace("{MEMORY_CONTEXT}", mc)

    return prompt


def parse_mentor_response(full_response):
    # 1. Split memory
    memory_update = ""
    visible = full_response
    if "===MEMORY_BREAK===" in full_response:
        parts = full_response.split("===MEMORY_BREAK===", 1)
        visible = parts[0].strip()
        memory_update = parts[1].strip()

    # 2. Extract bug fires
    bugs_fired = re.findall(r'===BUG_FIRED:\s*(.+?)===', visible)
    visible = re.sub(r'\n*===BUG_FIRED:\s*.+?===\n*', '\n', visible).strip()

    # 3. Extract new bugs
    new_bugs_raw = re.findall(r'===NEW_BUG:\s*(.+?)\s*\|\s*(.+?)===', visible)
    new_bugs = [{"name": n.strip(), "description": d.strip()} for n, d in new_bugs_raw]
    visible = re.sub(r'\n*===NEW_BUG:\s*.+?===\n*', '\n', visible).strip()

    return visible, memory_update, bugs_fired, new_bugs


def process_bugs(entry_id, entry_number, bugs_fired, new_bugs):
    conn = get_db()
    for bug_name in bugs_fired:
        bug = conn.execute("SELECT id FROM bugs WHERE name=? AND status IN ('active','declining')", (bug_name,)).fetchone()
        if bug:
            conn.execute("UPDATE bugs SET fire_count = fire_count + 1, last_fired_entry = ? WHERE id = ?", (entry_number, bug['id']))
            conn.execute("INSERT INTO bug_fires (bug_id, entry_id, evidence) VALUES (?, ?, ?)", (bug['id'], entry_id, f"Fired in entry #{entry_number}"))
    for nb in new_bugs:
        conn.execute("INSERT INTO bugs (name, description, status, source) VALUES (?, ?, 'pending', 'mentor')", (nb['name'], nb['description']))
    conn.commit()
    conn.close()


# ── Routes ─────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


# ── Entries ────────────────────────────────────────────────
@app.route('/api/entries', methods=['GET'])
def list_entries():
    conn = get_db()
    entries = conn.execute("SELECT id, entry_number, title, date, substr(raw_text, 1, 150) as preview, created_at FROM entries ORDER BY entry_number DESC").fetchall()
    conn.close()
    return jsonify([dict(e) for e in entries])


@app.route('/api/entries/<int:entry_id>', methods=['GET'])
def get_entry(entry_id):
    conn = get_db()
    entry = conn.execute("SELECT * FROM entries WHERE id=?", (entry_id,)).fetchone()
    conn.close()
    if not entry:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(entry))


@app.route('/api/entries', methods=['POST'])
def create_entry():
    if not client:
        return jsonify({"error": "ANTHROPIC_JOURNAL_KEY not set"}), 500

    data = request.json
    text = data.get("text", "").strip()
    title = data.get("title", "").strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400

    memory = load_memory()
    memory["entry_count"] += 1
    entry_num = memory["entry_count"]
    date_str = datetime.now().strftime('%d %B %Y')
    short_date = datetime.now().strftime('%d %b %Y')

    system = build_system_prompt()

    entry_header = f"Entry #{entry_num} — {date_str}"
    if title:
        entry_header += f"\nTitle: {title}"

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            system=system,
            messages=[{"role": "user", "content": f"{entry_header}\n\n{text}"}]
        )
    except Exception as e:
        memory["entry_count"] -= 1
        return jsonify({"error": str(e)}), 502

    full_resp = response.content[0].text
    clean_response, memory_update, bugs_fired, new_bugs = parse_mentor_response(full_resp)

    # Save entry
    conn = get_db()
    cur = conn.execute("INSERT INTO entries (entry_number, title, date, raw_text, mentor_response) VALUES (?, ?, ?, ?, ?)",
                        (entry_num, title, short_date, text, clean_response))
    entry_id = cur.lastrowid
    conn.commit()
    conn.close()

    # Process bugs
    process_bugs(entry_id, entry_num, bugs_fired, new_bugs)

    # Update memory
    memory["accumulated_memory"] += f"\n\n--- Entry #{entry_num} ({short_date}) ---\n{memory_update}"
    save_memory(memory)

    # Save analysis file
    os.makedirs(ANALYSES_DIR, exist_ok=True)
    fname = f"entry_{entry_num:03d}_{datetime.now().strftime('%Y%m%d')}.md"
    title_line = f" — {title}" if title else ""
    with open(os.path.join(ANALYSES_DIR, fname), "w") as f:
        f.write(f"# Entry #{entry_num}{title_line} — {short_date}\n\n## Journal Entry\n\n{text}\n\n---\n\n## Mentor Response\n\n{clean_response}")

    # Google Doc backup
    backup_to_google_doc(entry_num, short_date, title, text, clean_response)

    return jsonify({
        "entry": {"id": entry_id, "entry_number": entry_num, "title": title, "date": short_date, "raw_text": text, "mentor_response": clean_response},
        "bugs_fired": bugs_fired,
        "new_bugs": new_bugs
    })


@app.route('/api/entries/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    conn = get_db()
    conn.execute("DELETE FROM dialectic WHERE entry_id=?", (entry_id,))
    conn.execute("DELETE FROM bug_fires WHERE entry_id=?", (entry_id,))
    conn.execute("DELETE FROM entries WHERE id=?", (entry_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# ── Dialectic ──────────────────────────────────────────────
@app.route('/api/entries/<int:entry_id>/dialectic', methods=['GET'])
def get_dialectic(entry_id):
    conn = get_db()
    msgs = conn.execute("SELECT * FROM dialectic WHERE entry_id=? ORDER BY created_at", (entry_id,)).fetchall()
    conn.close()
    return jsonify([dict(m) for m in msgs])


@app.route('/api/entries/<int:entry_id>/dialectic', methods=['POST'])
def send_dialectic(entry_id):
    if not client:
        return jsonify({"error": "ANTHROPIC_JOURNAL_KEY not set"}), 500

    data = request.json
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"error": "No message"}), 400

    conn = get_db()
    entry = conn.execute("SELECT * FROM entries WHERE id=?", (entry_id,)).fetchone()
    if not entry:
        conn.close()
        return jsonify({"error": "Entry not found"}), 404

    prior = conn.execute("SELECT role, content FROM dialectic WHERE entry_id=? ORDER BY created_at", (entry_id,)).fetchall()
    conn.close()

    system = build_system_prompt()
    messages = [
        {"role": "user", "content": f"Entry #{entry['entry_number']} — {entry['date']}\n\n{entry['raw_text']}"},
        {"role": "assistant", "content": entry['mentor_response'] or ""}
    ]
    for p in prior:
        messages.append({"role": "user" if p['role'] == 'user' else "assistant", "content": p['content']})
    messages.append({"role": "user", "content": message})

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1200,
            system=system,
            messages=messages
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    reply = response.content[0].text

    conn = get_db()
    conn.execute("INSERT INTO dialectic (entry_id, role, content) VALUES (?, 'user', ?)", (entry_id, message))
    conn.execute("INSERT INTO dialectic (entry_id, role, content) VALUES (?, 'mentor', ?)", (entry_id, reply))
    conn.commit()
    conn.close()

    return jsonify({"response": reply})


# ── Bugs ───────────────────────────────────────────────────
@app.route('/api/bugs', methods=['GET'])
def list_bugs():
    conn = get_db()
    bugs = conn.execute("SELECT * FROM bugs ORDER BY status='pending' DESC, fire_count DESC").fetchall()
    conn.close()
    return jsonify([dict(b) for b in bugs])

@app.route('/api/bugs', methods=['POST'])
def add_bug():
    data = request.json
    conn = get_db()
    conn.execute("INSERT INTO bugs (name, description, source) VALUES (?, ?, 'user')", (data['name'], data['description']))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/bugs/<int:bug_id>', methods=['PUT'])
def update_bug(bug_id):
    data = request.json
    conn = get_db()
    if 'status' in data:
        conn.execute("UPDATE bugs SET status=? WHERE id=?", (data['status'], bug_id))
    if 'description' in data:
        conn.execute("UPDATE bugs SET description=? WHERE id=?", (data['description'], bug_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/bugs/<int:bug_id>', methods=['DELETE'])
def delete_bug(bug_id):
    conn = get_db()
    conn.execute("DELETE FROM bug_fires WHERE bug_id=?", (bug_id,))
    conn.execute("DELETE FROM bugs WHERE id=?", (bug_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/bugs/<int:bug_id>/confirm', methods=['POST'])
def confirm_bug(bug_id):
    conn = get_db()
    conn.execute("UPDATE bugs SET status='active' WHERE id=? AND status='pending'", (bug_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# ── Goals ──────────────────────────────────────────────────
@app.route('/api/goals', methods=['GET'])
def list_goals():
    conn = get_db()
    toward = conn.execute("SELECT * FROM goals WHERE direction='toward'").fetchall()
    away = conn.execute("SELECT * FROM goals WHERE direction='away'").fetchall()
    conn.close()
    return jsonify({"toward": [dict(g) for g in toward], "away": [dict(g) for g in away]})

@app.route('/api/goals', methods=['POST'])
def add_goal():
    data = request.json
    conn = get_db()
    conn.execute("INSERT INTO goals (direction, description) VALUES (?, ?)", (data['direction'], data['description']))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/goals/<int:goal_id>', methods=['DELETE'])
def delete_goal(goal_id):
    conn = get_db()
    conn.execute("DELETE FROM goals WHERE id=?", (goal_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# ── Documents ──────────────────────────────────────────────
@app.route('/api/documents', methods=['GET'])
def list_documents():
    conn = get_db()
    docs = conn.execute("SELECT * FROM documents ORDER BY date_added DESC").fetchall()
    conn.close()
    return jsonify([dict(d) for d in docs])

@app.route('/api/documents/upload', methods=['POST'])
def upload_document():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({"error": "No filename"}), 400
    os.makedirs(DOCUMENTS_DIR, exist_ok=True)
    fname = secure_filename(f.filename)
    fpath = os.path.join(DOCUMENTS_DIR, fname)
    f.save(fpath)
    doc_type = request.form.get("doc_type", "other")
    conn = get_db()
    conn.execute("INSERT INTO documents (filename, filepath, doc_type) VALUES (?, ?, ?)", (fname, fpath, doc_type))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok", "filename": fname})

@app.route('/api/documents/unanalyzed', methods=['GET'])
def unanalyzed_docs():
    conn = get_db()
    docs = conn.execute("SELECT * FROM documents WHERE analysis_status='unanalyzed'").fetchall()
    conn.close()
    return jsonify({"count": len(docs), "documents": [dict(d) for d in docs]})

@app.route('/api/documents/mark-analyzed', methods=['POST'])
def mark_analyzed():
    data = request.json
    ids = data.get("document_ids", [])
    conn = get_db()
    for did in ids:
        conn.execute("UPDATE documents SET analysis_status='included_in_baseline', last_analyzed=? WHERE id=?", (datetime.now().isoformat(), did))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# ── Baseline ──────────────────────────────────────────────
@app.route('/api/baseline', methods=['GET'])
def get_baseline():
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH, "r") as f:
            content = f.read()
        return jsonify({"exists": True, "word_count": len(content.split()), "preview": content[:500]})
    return jsonify({"exists": False})

@app.route('/api/baseline/upload', methods=['POST'])
def upload_baseline():
    # Support both JSON (paste) and file upload
    if request.content_type and 'multipart/form-data' in request.content_type:
        if 'file' not in request.files:
            return jsonify({"error": "No file"}), 400
        f = request.files['file']
        content = f.read().decode('utf-8', errors='replace')
    else:
        data = request.json
        content = data.get("content", "")
    with open(BASELINE_PATH, "w") as f:
        f.write(content)
    return jsonify({"status": "ok", "word_count": len(content.split())})


# ── Reports ────────────────────────────────────────────────
@app.route('/api/reports', methods=['GET'])
def list_reports():
    conn = get_db()
    reports = conn.execute("SELECT * FROM reports ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in reports])

def gather_report_data(days):
    conn = get_db()
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    entries = conn.execute("SELECT * FROM entries WHERE created_at >= ? ORDER BY entry_number", (cutoff,)).fetchall()
    entry_ids = [e['id'] for e in entries]
    dialectic = []
    for eid in entry_ids:
        msgs = conn.execute("SELECT * FROM dialectic WHERE entry_id=? ORDER BY created_at", (eid,)).fetchall()
        dialectic.extend(msgs)
    reports = conn.execute("SELECT * FROM reports WHERE created_at >= ? AND report_type='weekly' ORDER BY created_at", (cutoff,)).fetchall()
    conn.close()
    return [dict(e) for e in entries], [dict(d) for d in dialectic], [dict(r) for r in reports]

@app.route('/api/reports/weekly', methods=['POST'])
def generate_weekly():
    if not client:
        return jsonify({"error": "No API key"}), 500
    entries, dialectic, _ = gather_report_data(7)
    if not entries:
        return jsonify({"error": "No entries in the past 7 days"}), 400

    baseline = ""
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH) as f:
            baseline = f.read()

    bugs = get_active_bugs()
    goals_data = get_goals()

    prompt = WEEKLY_REPORT_PROMPT
    prompt = prompt.replace("{goals}", "\n".join([f"- [{g['direction']}] {g['description']}" for g in goals_data]) or "None set.")
    prompt = prompt.replace("{bugs}", "\n".join([f"- {b['name']}: {b['description']} (fired {b['fire_count']}x)" for b in bugs]) or "None.")
    prompt = prompt.replace("{baseline}", baseline or "No baseline loaded.")
    prompt = prompt.replace("{entries}", "\n\n---\n\n".join([f"Entry #{e['entry_number']} ({e['date']}):\n{e['raw_text']}" for e in entries]))
    prompt = prompt.replace("{dialectic_messages}", "\n".join([f"[{d['role']}]: {d['content']}" for d in dialectic]) or "None.")

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    content = response.content[0].text
    now = datetime.now()
    period = f"Week of {(now - timedelta(days=7)).strftime('%d')}–{now.strftime('%d %b %Y')}"

    conn = get_db()
    conn.execute("INSERT INTO reports (report_type, period, content) VALUES ('weekly', ?, ?)", (period, content))
    conn.commit()
    conn.close()

    email_sent = send_report_email(f"Journal Mentor — Weekly Report — {period}", content)

    return jsonify({"report": content, "period": period, "email_sent": email_sent})


@app.route('/api/reports/monthly', methods=['POST'])
def generate_monthly():
    if not client:
        return jsonify({"error": "No API key"}), 500
    entries, dialectic, weekly_reports = gather_report_data(30)
    if not entries:
        return jsonify({"error": "No entries in the past 30 days"}), 400

    baseline = ""
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH) as f:
            baseline = f.read()

    memory = load_memory()
    bugs = get_active_bugs()
    goals_data = get_goals()

    prompt = MONTHLY_REPORT_PROMPT
    prompt = prompt.replace("{goals}", "\n".join([f"- [{g['direction']}] {g['description']}" for g in goals_data]) or "None set.")
    prompt = prompt.replace("{bugs}", "\n".join([f"- {b['name']}: {b['description']} (fired {b['fire_count']}x)" for b in bugs]) or "None.")
    prompt = prompt.replace("{baseline}", baseline or "No baseline loaded.")
    prompt = prompt.replace("{entries}", "\n\n---\n\n".join([f"Entry #{e['entry_number']} ({e['date']}):\n{e['raw_text']}" for e in entries]))
    prompt = prompt.replace("{dialectic_messages}", "\n".join([f"[{d['role']}]: {d['content']}" for d in dialectic]) or "None.")
    prompt = prompt.replace("{weekly_reports}", "\n\n===\n\n".join([f"{r['period']}:\n{r['content']}" for r in weekly_reports]) or "None.")
    prompt = prompt.replace("{memory}", memory.get("accumulated_memory", "") or "None.")

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}]
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    content = response.content[0].text
    period = datetime.now().strftime('%B %Y')

    conn = get_db()
    conn.execute("INSERT INTO reports (report_type, period, content) VALUES ('monthly', ?, ?)", (period, content))
    conn.commit()
    conn.close()

    email_sent = send_report_email(f"Journal Mentor — Monthly Report — {period}", content)

    return jsonify({"report": content, "period": period, "email_sent": email_sent})


# ── System Stats ───────────────────────────────────────────
@app.route('/api/system/stats', methods=['GET'])
def system_stats():
    conn = get_db()
    total_entries = conn.execute("SELECT COUNT(*) as c FROM entries").fetchone()['c']
    bugs_active = conn.execute("SELECT COUNT(*) as c FROM bugs WHERE status='active'").fetchone()['c']
    bugs_pending = conn.execute("SELECT COUNT(*) as c FROM bugs WHERE status='pending'").fetchone()['c']
    bugs_declining = conn.execute("SELECT COUNT(*) as c FROM bugs WHERE status='declining'").fetchone()['c']
    bugs_resolved = conn.execute("SELECT COUNT(*) as c FROM bugs WHERE status='resolved'").fetchone()['c']
    goals_toward = conn.execute("SELECT COUNT(*) as c FROM goals WHERE direction='toward'").fetchone()['c']
    goals_away = conn.execute("SELECT COUNT(*) as c FROM goals WHERE direction='away'").fetchone()['c']
    unanalyzed = conn.execute("SELECT COUNT(*) as c FROM documents WHERE analysis_status='unanalyzed'").fetchone()['c']
    last_weekly = conn.execute("SELECT created_at FROM reports WHERE report_type='weekly' ORDER BY created_at DESC LIMIT 1").fetchone()
    last_monthly = conn.execute("SELECT created_at FROM reports WHERE report_type='monthly' ORDER BY created_at DESC LIMIT 1").fetchone()
    conn.close()
    return jsonify({
        "total_entries": total_entries,
        "bugs": {"active": bugs_active, "pending": bugs_pending, "declining": bugs_declining, "resolved": bugs_resolved},
        "goals": {"toward": goals_toward, "away": goals_away},
        "unanalyzed_docs": unanalyzed,
        "last_weekly": last_weekly['created_at'] if last_weekly else None,
        "last_monthly": last_monthly['created_at'] if last_monthly else None,
        "has_api_key": bool(API_KEY),
        "has_baseline": os.path.exists(BASELINE_PATH)
    })


# ── Startup ────────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    os.makedirs(ANALYSES_DIR, exist_ok=True)
    os.makedirs(BACKUPS_DIR, exist_ok=True)
    os.makedirs(DOCUMENTS_DIR, exist_ok=True)
    print("\n  JOURNAL MENTOR — Dialectic System")
    print("  Running at http://localhost:5001\n")
    app.run(host='127.0.0.1', port=5001, debug=False)
