import os
import sys
import json
import re
import math
import shutil
import sqlite3
import requests
from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify
from anthropic import Anthropic
from werkzeug.utils import secure_filename

# ── Configuration ──────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "journal_mentor.db")
MEMORY_FILE = os.path.join(BASE_DIR, "mentor_memory.json")
ANALYSES_DIR = os.path.join(BASE_DIR, "analyses")
BACKUPS_DIR = os.path.join(BASE_DIR, "backups")
BASELINES_DIR = os.path.join(BASE_DIR, "baselines")
DOCUMENTS_DIR = os.path.join(BASE_DIR, "documents")
BASELINE_PATH = os.path.join(BASE_DIR, "baseline_profile.md")

API_KEY = os.environ.get("ANTHROPIC_JOURNAL_KEY")
GDOC_WEBHOOK = os.environ.get("JOURNAL_GDOC_WEBHOOK")

app = Flask(__name__)

client = None
if API_KEY:
    client = Anthropic(api_key=API_KEY)


# ── Database ───────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def migrate_db():
    """Add new columns to existing tables without destroying data. Safe to run repeatedly."""
    conn = get_db()

    # Auto-backup before any migration
    if os.path.exists(DB_PATH):
        os.makedirs(BACKUPS_DIR, exist_ok=True)
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup = os.path.join(BACKUPS_DIR, f"journal_mentor_db_backup_{ts}.db")
        if not os.path.exists(backup):
            shutil.copy2(DB_PATH, backup)
            # Keep last 10 DB backups
            db_backups = sorted([f for f in os.listdir(BACKUPS_DIR) if f.startswith("journal_mentor_db_backup_")])
            while len(db_backups) > 10:
                os.remove(os.path.join(BACKUPS_DIR, db_backups.pop(0)))

    def table_exists(table):
        return conn.execute("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()['c'] > 0

    def has_column(table, column):
        if not table_exists(table):
            return True  # Skip — table doesn't exist yet, init_db will create it properly
        cols = [c['name'] for c in conn.execute(f"PRAGMA table_info({table})").fetchall()]
        return column in cols

    def add_column(table, column, col_type, default=None):
        if not table_exists(table):
            return  # Table will be created by init_db with all columns
        if not has_column(table, column):
            default_clause = f" DEFAULT {default}" if default is not None else ""
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause}")

    # Entries table migrations
    add_column('entries', 'title', 'TEXT', "''")
    add_column('entries', 'time_of_day', 'TEXT')
    add_column('entries', 'tags', 'TEXT', "'[]'")
    add_column('entries', 'emotional_valence', 'INTEGER')
    add_column('entries', 'commitments_made', 'TEXT', "'[]'")
    add_column('entries', 'processing_mode', 'TEXT')
    add_column('entries', 'somatic_content', 'INTEGER', '0')
    add_column('entries', 'schema_level', 'TEXT')
    add_column('entries', 'insight_action_ratio', 'TEXT')
    add_column('entries', 'containment_level', 'TEXT')
    add_column('entries', 'journaling_mode', 'TEXT', "'freeform'")

    # Bugs table migrations
    add_column('bugs', 'parent_id', 'INTEGER')
    add_column('bugs', 'superseded_by', 'INTEGER')
    add_column('bugs', 'trigger_pattern', 'TEXT')
    add_column('bugs', 'thought_signature', 'TEXT')
    add_column('bugs', 'behavior_signature', 'TEXT')
    add_column('bugs', 'intervention', 'TEXT')

    # Goals table migrations
    add_column('goals', 'layer', 'TEXT', "'objective'")
    add_column('goals', 'domain', 'TEXT')
    add_column('goals', 'status', 'TEXT', "'active'")

    # Reports table migrations
    add_column('reports', 'email_sent', 'INTEGER', '0')

    # Entries backup tracking
    add_column('entries', 'backed_up', 'INTEGER', '0')

    conn.commit()
    conn.close()


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
            time_of_day TEXT,
            tags TEXT DEFAULT '[]',
            emotional_valence INTEGER,
            commitments_made TEXT DEFAULT '[]',
            processing_mode TEXT,
            somatic_content INTEGER DEFAULT 0,
            schema_level TEXT,
            insight_action_ratio TEXT,
            containment_level TEXT,
            journaling_mode TEXT DEFAULT 'freeform',
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
            parent_id INTEGER,
            superseded_by INTEGER,
            trigger_pattern TEXT,
            thought_signature TEXT,
            behavior_signature TEXT,
            intervention TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES bugs(id),
            FOREIGN KEY (superseded_by) REFERENCES bugs(id)
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
            layer TEXT NOT NULL,
            domain TEXT,
            direction TEXT,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS priors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            current_estimate TEXT NOT NULL,
            confidence TEXT DEFAULT 'moderate',
            evidence_count INTEGER DEFAULT 0,
            source TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            history TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS phases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            start_entry INTEGER NOT NULL,
            end_entry INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS behavioral_experiments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id INTEGER NOT NULL,
            pattern_name TEXT,
            belief_tested TEXT NOT NULL,
            prediction TEXT NOT NULL,
            experiment TEXT NOT NULL,
            status TEXT DEFAULT 'assigned',
            outcome TEXT,
            belief_rating_before INTEGER,
            belief_rating_after INTEGER,
            reflection TEXT,
            due_date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (entry_id) REFERENCES entries(id)
        );

        CREATE TABLE IF NOT EXISTS micro_assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time_of_day TEXT,
            wellbeing INTEGER,
            interpersonal INTEGER,
            social_role INTEGER,
            overall INTEGER,
            body_sensation TEXT,
            context TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS relational_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id INTEGER NOT NULL,
            other_person TEXT,
            wish TEXT NOT NULL,
            response_of_other TEXT,
            response_of_self TEXT,
            matches_master_ccrt INTEGER DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entry_id) REFERENCES entries(id)
        );

        CREATE TABLE IF NOT EXISTS defense_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id INTEGER NOT NULL,
            defense_name TEXT NOT NULL,
            vaillant_level TEXT NOT NULL,
            evidence TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entry_id) REFERENCES entries(id)
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
            email_sent INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            notes TEXT DEFAULT '',
            status TEXT DEFAULT 'open',
            priority INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS mentor_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            summary TEXT NOT NULL,
            details TEXT,
            entry_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entry_id) REFERENCES entries(id)
        );
    """)
    conn.commit()
    # Seed system init log if empty
    count = conn.execute("SELECT COUNT(*) as c FROM mentor_log").fetchone()['c']
    if count == 0:
        conn.execute("INSERT INTO mentor_log (event_type, summary) VALUES ('memory_note', 'System initialized')")
        conn.commit()
    # Seed default goals if empty
    goal_count = conn.execute("SELECT COUNT(*) as c FROM goals").fetchone()['c']
    if goal_count == 0:
        for g in DEFAULT_GOALS:
            conn.execute("INSERT INTO goals (layer, domain, direction, description) VALUES (?,?,?,?)", g)
        conn.commit()
    conn.close()


DEFAULT_GOALS = [
    ("objective", "financial", "toward", "Protect existing financial assets and grow them — 20% is a win"),
    ("objective", "cognitive", "toward", "Think from first principles always — biggest cognitive gap and biggest consistent problem throughout entire adult life"),
    ("objective", "cognitive", "toward", "Move from consuming to thinking — defined by writing, reflecting, planning, and researching"),
    ("objective", "cognitive", "toward", "Let intelligence augment and commoditize upwards — focus on building agency and decision-making"),
    ("objective", "social", "toward", "2 new high-quality friends in Dubai — takes sacrifice and consistent effort to build community"),
    ("objective", "social", "toward", "Massively improve friends and community"),
    ("objective", "purpose", "toward", "Find meaning beyond blind speculation — prime years of exploration intellectually, focusing solely on money is a lack of purpose"),
    ("objective", "purpose", "toward", "Work on something with focused intent, exponential payoff, and high level of personal challenge"),
    ("objective", "behavioral", "away", "Infinite comparison and FOMO — either start winning through discipline and calculated risk, or fully decide not to care"),
    ("objective", "behavioral", "away", "Massively reduce Twitter usage — one of the biggest failures of the last two years"),
    ("behavioral", "behavioral", "toward", "Get out of the house min 2, max 3 times a week to work elsewhere for better focus"),
    ("behavioral", "social", "toward", "Phone calls sometimes with friends"),
    ("behavioral", "behavioral", "away", "When mindlessly scrolling — STOP"),
    ("behavioral", "identity", "toward", "Move toward pain — got too comfortable in the last 12 months"),
    ("principle", "identity", None, "Maximize time with Kian. One day it will all be gone."),
    ("principle", "identity", None, "Love yourself. First time making this a priority. Love yourself unconditionally."),
    ("principle", "identity", None, "Only compare yourself to yourself."),
    ("principle", "identity", None, "The universe always provides what you need. Openness and acceptance. Everything that comes to you is data to move forward."),
    ("principle", "cognitive", None, "My ability to trade and make decisions is based strongly off my ability to NOT torture myself. This applies to nearly everything."),
    ("principle", "identity", None, "I always create some big problem thing that I think is haunting me — heart problems, money problems, girl problems. The problem changes, the pattern doesn't."),
]


# ── Memory Management ──────────────────────────────────────
def load_memory():
    if os.path.exists(MEMORY_FILE):
        with open(MEMORY_FILE, "r") as f:
            return json.load(f)
    return {"entry_count": 0, "compressed_memory": "", "last_synthesis_entry": 0, "synthesis_count": 0}


def save_memory(memory):
    backup_memory()
    with open(MEMORY_FILE, "w") as f:
        json.dump(memory, f, indent=2)


def backup_memory():
    if os.path.exists(MEMORY_FILE):
        os.makedirs(BACKUPS_DIR, exist_ok=True)
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        shutil.copy2(MEMORY_FILE, os.path.join(BACKUPS_DIR, f"mentor_memory_backup_{ts}.json"))
        backups = sorted([f for f in os.listdir(BACKUPS_DIR) if f.startswith("mentor_memory_backup_")])
        while len(backups) > 30:
            os.remove(os.path.join(BACKUPS_DIR, backups.pop(0)))


def append_raw_note(entry_id, note_text):
    add_mentor_log('memory_note', f'Memory note from entry', note_text, entry_id)


# ── Mentor Log ─────────────────────────────────────────────
def add_mentor_log(event_type, summary, details=None, entry_id=None):
    conn = get_db()
    conn.execute("INSERT INTO mentor_log (event_type, summary, details, entry_id) VALUES (?,?,?,?)",
                 (event_type, summary, details, entry_id))
    conn.commit()
    conn.close()


def get_mentor_log_entries(event_type=None, since_entry=None, limit=100):
    conn = get_db()
    q = "SELECT * FROM mentor_log WHERE 1=1"
    params = []
    if event_type:
        q += " AND event_type=?"
        params.append(event_type)
    if since_entry:
        q += " AND (entry_id IS NULL OR entry_id > ?)"
        params.append(since_entry)
    q += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Helper Queries ─────────────────────────────────────────
def get_active_bugs():
    conn = get_db()
    bugs = conn.execute("SELECT * FROM bugs WHERE status IN ('active','declining','pending') ORDER BY fire_count DESC").fetchall()
    conn.close()
    return [dict(b) for b in bugs]


def get_goals(layer=None, direction=None):
    conn = get_db()
    q = "SELECT * FROM goals WHERE status='active'"
    params = []
    if layer:
        q += " AND layer=?"
        params.append(layer)
    if direction:
        q += " AND direction=?"
        params.append(direction)
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_active_priors():
    conn = get_db()
    rows = conn.execute("SELECT * FROM priors ORDER BY name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_current_phase():
    conn = get_db()
    row = conn.execute("SELECT * FROM phases WHERE end_entry IS NULL ORDER BY id DESC LIMIT 1").fetchone()
    conn.close()
    return dict(row) if row else None


def get_open_experiments():
    conn = get_db()
    rows = conn.execute("SELECT * FROM behavioral_experiments WHERE status='assigned' ORDER BY due_date").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_time_of_day():
    hour = datetime.now().hour
    if hour < 6: return 'night'
    elif hour < 12: return 'morning'
    elif hour < 17: return 'afternoon'
    elif hour < 21: return 'evening'
    else: return 'night'


def call_anthropic(prompt, max_tokens=2000, system=None):
    if not client:
        return ""
    msgs = [{"role": "user", "content": prompt}]
    kwargs = {"model": "claude-sonnet-4-20250514", "max_tokens": max_tokens, "messages": msgs}
    if system:
        kwargs["system"] = system
    response = client.messages.create(**kwargs)
    return response.content[0].text


def backup_to_google_doc(entry_num, date_str, title, entry_text, mentor_read):
    if not GDOC_WEBHOOK:
        return
    payload = json.dumps({"entry_number": entry_num, "date": date_str, "title": title or "", "journal_entry": entry_text, "analysis": mentor_read})
    try:
        res = requests.post(GDOC_WEBHOOK, data=payload, headers={"Content-Type": "text/plain"}, timeout=15, allow_redirects=False)
        if 300 <= res.status_code < 400:
            loc = res.headers.get("location")
            if loc:
                requests.post(loc, data=payload, headers={"Content-Type": "text/plain"}, timeout=15)
    except:
        pass


def send_to_apple_notes(title, body, folder="Journal Mentor"):
    """Create a new note in Apple Notes via AppleScript."""
    import subprocess
    html_body = body.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')
    escaped_title = title.replace('"', '\\"')
    applescript = (
        'tell application "Notes"\n'
        '    tell account "iCloud"\n'
        '        if not (exists folder "' + folder + '") then\n'
        '            make new folder with properties {name:"' + folder + '"}\n'
        '        end if\n'
        '        tell folder "' + folder + '"\n'
        '            make new note with properties {name:"' + escaped_title + '", body:"<html><body style=\\"font-family: -apple-system, system-ui, sans-serif; font-size: 15px; line-height: 1.7; color: #1a1a1a;\\">' + html_body + '</body></html>"}\n'
        '        end tell\n'
        '    end tell\n'
        'end tell'
    )
    try:
        subprocess.run(['osascript', '-e', applescript], check=True, capture_output=True, timeout=15)
        return True
    except Exception as e:
        print(f"  Apple Notes delivery failed: {e}")
        return False


def save_entry_to_apple_notes(entry_num, date_str, entry_text, mentor_read):
    """Save journal entry + mentor response to Apple Notes."""
    body = f"MY JOURNAL ENTRY\n{'='*40}\n\n{entry_text}\n\n\nMENTOR RESPONSE\n{'='*40}\n\n{mentor_read}"
    send_to_apple_notes(
        title=f"Entry #{entry_num} — {date_str}",
        body=body
    )


# ══════════════════════════════════════════════════════════
# SYSTEM PROMPTS
# ══════════════════════════════════════════════════════════

CORE_MENTOR_INSTRUCTIONS = """You are a deeply perceptive mentor operating within a dialectic system. You've been reading this person's private journal for a long time. You know them — their patterns, their blind spots, their brilliance, their self-deceptions. You are not a therapist. You are not an analyzer. You are someone who sees clearly and speaks directly.

Your role is to read a journal entry and tell this person what they cannot see about themselves. Not what they already know. Not a summary of what they wrote. The things underneath.

You also engage in dialogue. After your initial read, the person may respond — pushing back, correcting you, going deeper. When they do, update your understanding. If they correct you, accept it and adjust. If they go deeper, go deeper with them. The dialogue is where the real insight happens.

═══════════════════════════════════════
CRISIS DETECTION — ALWAYS CHECK FIRST
═══════════════════════════════════════

Before any pattern analysis, scan for:
- Expressions of hopelessness, worthlessness, or being a burden
- References to self-harm, suicidal ideation, or wanting to "disappear"
- Acute despair qualitatively different from the person's baseline distress
- Sudden calm after intense distress (potential decision point)
- Farewell language or tying up loose ends

If ANY of these are present:
1. STOP all pattern analysis
2. Respond with direct, warm acknowledgment of the pain
3. Ask directly: "Are you thinking about hurting yourself?"
4. Provide: 988 Suicide & Crisis Lifeline, Crisis Text Line (text HOME to 741741)
5. Output ===CRISIS_FLAG=== in structured output
6. Do NOT proceed with normal analysis

═══════════════════════════════════════
INTERPRETATION DEPTH CALIBRATION
═══════════════════════════════════════

Before offering deep pattern analysis, assess containment capacity:

HIGH CONTAINMENT (proceed with full interpretation):
- Emotional tone is regulated, even if distressed
- Entry shows capacity to hold complexity
- User is engaging with patterns rather than overwhelmed by them

LOW CONTAINMENT (shift to supportive mode):
- Entry shows acute distress, despair, or crisis
- Language is fragmented, repetitive, or catastrophic
- Multiple simultaneous stressors with no resolution

When containment is low:
1. Acknowledge what is hard, specifically
2. Validate the emotion without analyzing it
3. Name one concrete strength visible in the entry
4. Ask one grounding question
5. Do NOT interpret patterns or connect to recurring dynamics
6. Output ===CONTAINMENT: low=== in structured output

═══════════════════════════════════════
HOW YOU READ
═══════════════════════════════════════

You process every entry through multiple frameworks simultaneously, but you never name or announce them:

- COGNITIVE DISTORTIONS: Catastrophizing, fortune-telling, all-or-nothing, mind-reading, emotional reasoning, should statements, discounting the positive, magnification/minimization, personalization, labeling.

- NARRATIVE ANALYSIS: What story is he telling today? What role has he cast himself in? What defense mechanisms are active? Is intelligence being used to avoid feeling?

- DEFENSE MECHANISMS: Track which defenses are operating. Note the Vaillant level (mature/neurotic/immature). Movement toward mature defenses is progress.

- RELATIONAL PATTERNS: When interpersonal episode present, extract CCRT triad: What did he want? How did the other person respond? How did he respond to that?

- BEHAVIORAL GAPS: Leaving the house? Social connection? Scrolling? Producing vs. consuming? Moving toward discomfort or away?

- DECISION SCIENCE: First-principles or post-hoc justification? Inverse considered? Emotionally driven?

- PROCESSING MODE: Abstract-evaluative ("Why am I like this?") or concrete-experiential ("This is how it felt moment by moment")? Abstract-evaluative is sophisticated rumination when repeated without behavioral change.

- SOMATIC AWARENESS: Does the entry reference bodily sensation? If significant emotion is entirely in the head with zero somatic reference, note intellectualization.

- CROSS-ENTRY PATTERNS: What's repeating? What contradicts previous entries? What's drifting from goals?

- PRIOR TRACKING: Does this entry confirm or disconfirm any tracked prior?

- EXPERIMENT CHECK: Are there open behavioral experiments? Has the user reported outcomes?

═══════════════════════════════════════
RUMINATION VS. REFLECTION DETECTION
═══════════════════════════════════════

CONSTRUCTIVE REFLECTION (encourage): Concrete, forward-moving, emotionally varied, asks "how" and "what happened."
PATHOLOGICAL RUMINATION (redirect): Abstract, circular, monotone, uses jargon to describe feelings without feeling them, appeared 3+ times before.

When you detect rumination:
1. Name it directly
2. Propose a behavioral experiment instead
3. Redirect to somatic awareness
4. Output ===RUMINATION_DETECTED===

═══════════════════════════════════════
HOW YOU SPEAK
═══════════════════════════════════════

- Write 3-6 paragraphs of natural prose. No bullet points. No headers. No scores.
- Speak in second person — "you."
- Be direct. Not cruel, but not gentle.
- Be specific — reference exact things he wrote.
- Name what he's avoiding.
- If he's bullshitting himself, say so clearly.
- End with the one thing he most needs to sit with.
- Never start with "This entry..." or "Today's journal..."

LANGUAGE DISCIPLINE: Never describe the person AS a pattern. Describe them as DOING a pattern.
SOMATIC INTEGRATION: At least once per response, include a somatic prompt when significant emotion present.
FEEDBACK DISCIPLINE: Frame feedback as task-focused, not self-focused. Maintain ~3:1 positive-to-negative across responses.

═══════════════════════════════════════
BEHAVIORAL EXPERIMENTS
═══════════════════════════════════════

When a pattern has been analyzed 2+ times without behavioral change, or when a testable belief is visible, propose an experiment. Output in structured format.

═══════════════════════════════════════
STRUCTURED OUTPUT
═══════════════════════════════════════

After your mentor response, output structured data:

BUG DETECTION:
===BUG_FIRED: [bug_name] | [brief evidence]===
===NEW_BUG: [name] | [description]===

ENTRY METADATA:
===TAGS: ["tag1", "tag2"]===
===VALENCE: [integer -2 to +2]===
===COMMITMENTS: ["commitment 1"]===
===PROCESSING_MODE: [abstract_evaluative|concrete_experiential]===
===SOMATIC_CONTENT: [0|1]===
===SCHEMA_LEVEL: [automatic_thought|intermediate_belief|core_schema]===
===INSIGHT_ACTION: [insight_only|insight_plus_plan|insight_plus_action|action_report]===
===CONTAINMENT: [high|low]===

FLAGS (only when applicable):
===CRISIS_FLAG===
===RUMINATION_DETECTED===

DEFENSE OBSERVATION:
===DEFENSE: [name] | [mature|neurotic|immature] | [evidence]===

RELATIONAL PATTERN:
===CCRT: [person] | [wish] | [response_of_other] | [response_of_self]===

PRIOR EVIDENCE:
===PRIOR_EVIDENCE: [prior_name] | [confirming|disconfirming] | [note]===

BEHAVIORAL EXPERIMENT:
===EXPERIMENT: [belief] | [prediction] | [action] | [due_date]===

MEMORY UPDATE:
===MEMORY_BREAK===
[Condensed memory note under 400 words]

ACTIVE BUGS:
{BUGS_CONTEXT}

TRACKED PRIORS:
{PRIORS_CONTEXT}

CURRENT DEVELOPMENTAL PHASE:
{PHASE_CONTEXT}

ORIENTATION:
{ORIENTATION}

OPEN BEHAVIORAL EXPERIMENTS:
{EXPERIMENTS_CONTEXT}

BASELINE PROFILE:
{BASELINE_CONTEXT}

COMPRESSED MEMORY:
{MEMORY_CONTEXT}"""


MEMORY_SYNTHESIS_PROMPT = """You are a memory compression system for a journal mentor. Take the current compressed understanding AND a batch of raw notes from recent entries and produce a NEW compressed memory that is:

1. SHORTER than the combined inputs — max 1,000 words
2. SHARPER — noise dropped, signal amplified
3. UPDATED — where new evidence contradicts old understanding, new evidence wins
4. PRIORITIZED — most important patterns, shifts, concerns first

What matters:
- What patterns are currently active and how intense?
- What has shifted recently vs. what is stable?
- What commitments are outstanding and track record?
- What emotional baseline right now?
- Behavioral experiments: open ones and outcomes of completed ones?
- Trending toward concrete-experiential or staying abstract-evaluative?
- Somatic awareness developing?
- Signs of replicating master CCRT with the mentor?
- What does the mentor most need for the next entry?

Drop anything redundant with baseline. Drop anything superseded. Keep genuine shifts, new patterns, intensity changes. Weight experiment outcomes HEAVILY.

USER CORRECTIONS SINCE LAST SYNTHESIS:
{corrections}

CURRENT COMPRESSED MEMORY:
{current_compressed}

RAW NOTES FROM RECENT ENTRIES ({entry_count} total entries so far):
{raw_notes}

Output ONLY the new compressed memory. No preamble."""


WEEKLY_REPORT_PROMPT = """You are reviewing a week of journal entries for a person you know deeply.

Produce a WEEKLY ACCOUNTABILITY REPORT:

1. GOAL ADHERENCE: For each goal, evidence? Movement or stagnation?
2. COMMITMENT TRACKING: List every commitment made. Follow-through evidence? Calculate rate.
3. BEHAVIORAL EXPERIMENTS: Completed? Outcomes? Skipped? New proposals?
4. CONTRADICTIONS: Entries vs. each other? Intentions vs. behavior?
5. PROCESSING MODE: Abstract-evaluative to concrete-experiential ratio? Somatic content? Rumination risk?
6. DEBUGGING MATRIX: Which bugs fired? How many times? Timing patterns?
7. PRIOR CHECK: Evidence updating any tracked prior?
8. WELLBEING TREND: Micro-assessment trajectory? Journal tone discrepancy?
9. THE WEEK'S STORY: 2-3 paragraphs. Growth, retreat, spinning, or breakthrough?
10. ONE THING FOR NEXT WEEK.

At the end output:
===WEEKLY_WRITEBACK===
Key findings: [2-3 sentences]
Commitment follow-through: [X]%
Experiments completed: [N] / assigned: [N]
Processing mode: [X]% abstract / [Y]% concrete
Prior evidence: [any updates]
===END_WRITEBACK===

OBJECTIVES — TRACK THESE THIS WEEK:
TOWARD: {toward_objectives}
AWAY FROM: {away_objectives}

BEHAVIORAL COMMITMENTS: {behavioral_goals}

GUIDING PRINCIPLES (for context, not scoring): {principles}

ACTIVE BUGS: {bugs}
TRACKED PRIORS: {priors}
CURRENT PHASE: {phase}
OPEN EXPERIMENTS: {experiments}
BASELINE: {baseline}
COMPRESSED MEMORY: {memory}
THIS WEEK'S ENTRIES: {entries}
DIALECTIC EXCHANGES: {dialectic_messages}
MICRO-ASSESSMENTS: {micro_assessments}"""


MONTHLY_REPORT_PROMPT = """You are conducting a monthly deep read and system audit.

PART 1: MONTHLY DEEP READ
- Trends, cycles, invisible growth, drift, new patterns, processing mode evolution, experiment insights.
Write 4-6 paragraphs.

PART 2: SYSTEM AUDIT
2A. MENTOR ACCURACY
2B. DEBUGGING MATRIX: For each bug: PROMOTE/MAINTAIN/DEMOTE/RESOLVE/EVOLVE
2C. PRIOR UPDATES: Revised estimates
2D. DEFENSE MATURITY: Ratio and movement
2E. RELATIONAL PATTERNS: CCRT match rate
2F. INSIGHT VS ACTION: Distribution and recommendations
2G. BASELINE DELTA: What's confirmed, invalidated, new
2H. PHASE ASSESSMENT
2I. GOAL RECOMMENDATIONS

Output:
===MONTHLY_AUDIT===
BUG_RECOMMENDATIONS: - [bug]: [action] — [rationale]
PRIOR_UPDATES: - [prior]: [current] → [proposed] — [rationale]
DEFENSE_MATURITY: [assessment]
CCRT_EVOLUTION: [assessment]
INSIGHT_ACTION_GAP: [assessment]
BASELINE_DELTA: [full delta]
PHASE_ASSESSMENT: [assessment]
GOAL_RECOMMENDATIONS: - [goal]: [action] — [rationale]
===END_AUDIT===

OBJECTIVES — TOWARD: {toward_objectives}
OBJECTIVES — AWAY FROM: {away_objectives}
BEHAVIORAL COMMITMENTS: {behavioral_goals}
GUIDING PRINCIPLES: {principles}

GOAL RELEVANCE CHECK:
- Are the current objectives still the right objectives?
- Should any be marked as achieved, paused, or removed?
- Are there new objectives that should be added based on this month's entries?
- Have the guiding principles shifted or deepened?

ACTIVE BUGS: {bugs}
TRACKED PRIORS: {priors}
CURRENT PHASE: {phase}
EXPERIMENTS: {experiments}
BASELINE: {baseline}
COMPRESSED MEMORY: {memory}
THIS MONTH'S ENTRIES: {entries}
DIALECTIC EXCHANGES: {dialectic_messages}
WEEKLY REPORTS: {weekly_reports}
MICRO-ASSESSMENTS: {micro_assessments}
MENTOR LOG HIGHLIGHTS: {mentor_log_highlights}
DEFENSE TRACKING: {defense_observations}
RELATIONAL PATTERNS: {relational_patterns}"""


BASELINE_EVOLUTION_PROMPT = """You are regenerating a psychological baseline profile incorporating a month of new evidence.

Produce an UPDATED baseline that:
- Keeps everything still accurate
- Revises anything the delta identifies as changed
- Adds new patterns that emerged
- Removes or deprioritizes anything resolved
- Stays within 3,000 words
- Maintains direct, observable tone

CURRENT BASELINE: {current_baseline}
BASELINE DELTA: {delta}
COMPRESSED MEMORY: {compressed_memory}
CURRENT PRIORS: {priors}

Output the full updated baseline. No preamble."""


# ══════════════════════════════════════════════════════════
# SYSTEM PROMPT BUILDER
# ══════════════════════════════════════════════════════════

def build_system_prompt():
    prompt = CORE_MENTOR_INSTRUCTIONS

    # Baseline (cap at 3000 words)
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH, "r") as f:
            baseline = f.read()
        words = baseline.split()
        if len(words) > 3000:
            baseline = " ".join(words[:3000]) + "\n\n[Baseline truncated. Full version on disk.]"
    else:
        baseline = "No baseline profile loaded yet. Establish baseline observations from this entry."
    prompt = prompt.replace("{BASELINE_CONTEXT}", baseline)

    # Bugs
    bugs = get_active_bugs()
    if bugs:
        bugs_lines = []
        for b in bugs:
            line = f"- {b['name']}: {b['description']} (fired {b['fire_count']}x, status: {b['status']})"
            if b.get('trigger_pattern'):
                line += f"\n  TRIGGERS: {b['trigger_pattern']}"
            if b.get('thought_signature'):
                line += f"\n  THOUGHT SIGNATURE: {b['thought_signature']}"
            if b.get('behavior_signature'):
                line += f"\n  BEHAVIOR SIGNATURE: {b['behavior_signature']}"
            if b.get('intervention'):
                line += f"\n  INTERVENTION: {b['intervention']}"
            bugs_lines.append(line)
        bugs_text = "\n\n".join(bugs_lines)
    else:
        bugs_text = "No bugs tracked yet."
    prompt = prompt.replace("{BUGS_CONTEXT}", bugs_text)

    # Priors
    priors = get_active_priors()
    priors_text = "\n".join([f"- {p['name']}: {p['current_estimate']} (confidence: {p['confidence']}, evidence: {p['evidence_count']})" for p in priors]) if priors else "No priors tracked yet."
    prompt = prompt.replace("{PRIORS_CONTEXT}", priors_text)

    # Phase
    phase = get_current_phase()
    phase_text = f"{phase['name']}: {phase['description']} (since Entry #{phase['start_entry']})" if phase else "No developmental phases defined yet."
    prompt = prompt.replace("{PHASE_CONTEXT}", phase_text)

    # Orientation (short paragraph for daily prompt instead of full goal list)
    orientation = """This person is oriented toward self-knowledge, first-principles thinking, and closing the gap between insight and action. He is building a life around agency, meaning, and genuine connection — and moving away from comparison, self-torture, mindless consumption, and using money as the sole measure of self-worth. He is a new father entering midlife who has identified that the same energy drives all his suffering: a voice that says he didn't do the right thing, that he's not enough, that he should be further along. He knows this. Knowing it hasn't stopped it yet.

His guiding principles — which he has written himself — include: "Until death all defeat is in your mind." "I'm torturing myself for no reason in every area of life — trading was just the spark that let me see the bigger fire burning." "The voice of doubt, the recurring thought of not doing the right thing, self-doubt — it's ALL the same energy, always."

Do not turn any of this into a checklist or scorecard. This context helps you READ him more accurately, not GRADE him."""
    prompt = prompt.replace("{ORIENTATION}", orientation)

    # Experiments
    experiments = get_open_experiments()
    exp_text = "\n".join([f"- [{e['status']}] {e['belief_tested']} → {e['experiment']} (due: {e['due_date'] or 'unset'})" for e in experiments]) if experiments else "No open experiments."
    prompt = prompt.replace("{EXPERIMENTS_CONTEXT}", exp_text)

    # Memory
    memory = load_memory()
    if memory.get("compressed_memory"):
        mc = f"You have read {memory['entry_count']} previous entries.\n\n{memory['compressed_memory']}"
    else:
        mc = "No previous entries yet. This is the first reading."
    prompt = prompt.replace("{MEMORY_CONTEXT}", mc)

    return prompt


# ══════════════════════════════════════════════════════════
# RESPONSE PARSER
# ══════════════════════════════════════════════════════════

def parse_mentor_response(full_response):
    result = {
        "clean_response": "",
        "memory_update": "",
        "bugs_fired": [],
        "new_bugs": [],
        "tags": [],
        "valence": None,
        "commitments": [],
        "processing_mode": None,
        "somatic_content": 0,
        "schema_level": None,
        "insight_action": None,
        "containment": None,
        "crisis_flag": False,
        "rumination_detected": False,
        "defenses": [],
        "ccrt_patterns": [],
        "prior_evidence": [],
        "experiments": [],
    }

    # 1. Split memory
    visible = full_response
    if "===MEMORY_BREAK===" in full_response:
        parts = full_response.split("===MEMORY_BREAK===", 1)
        visible = parts[0].strip()
        result["memory_update"] = parts[1].strip()

    # 2. Extract structured data
    # Bug fires
    for m in re.finditer(r'===BUG_FIRED:\s*(.+?)\s*\|\s*(.+?)===', visible):
        result["bugs_fired"].append({"name": m.group(1).strip(), "evidence": m.group(2).strip()})
    # Also handle format without evidence
    for m in re.finditer(r'===BUG_FIRED:\s*([^|]+?)===', visible):
        name = m.group(1).strip()
        if not any(b["name"] == name for b in result["bugs_fired"]):
            result["bugs_fired"].append({"name": name, "evidence": ""})
    visible = re.sub(r'\n*===BUG_FIRED:.*?===\n*', '\n', visible)

    # New bugs
    for m in re.finditer(r'===NEW_BUG:\s*(.+?)\s*\|\s*(.+?)===', visible):
        result["new_bugs"].append({"name": m.group(1).strip(), "description": m.group(2).strip()})
    visible = re.sub(r'\n*===NEW_BUG:.*?===\n*', '\n', visible)

    # Tags
    m = re.search(r'===TAGS:\s*(\[.*?\])===', visible)
    if m:
        try: result["tags"] = json.loads(m.group(1))
        except: pass
    visible = re.sub(r'\n*===TAGS:.*?===\n*', '\n', visible)

    # Valence
    m = re.search(r'===VALENCE:\s*(-?\d+)===', visible)
    if m: result["valence"] = int(m.group(1))
    visible = re.sub(r'\n*===VALENCE:.*?===\n*', '\n', visible)

    # Commitments
    m = re.search(r'===COMMITMENTS:\s*(\[.*?\])===', visible)
    if m:
        try: result["commitments"] = json.loads(m.group(1))
        except: pass
    visible = re.sub(r'\n*===COMMITMENTS:.*?===\n*', '\n', visible)

    # Processing mode
    m = re.search(r'===PROCESSING_MODE:\s*(\S+)===', visible)
    if m: result["processing_mode"] = m.group(1)
    visible = re.sub(r'\n*===PROCESSING_MODE:.*?===\n*', '\n', visible)

    # Somatic
    m = re.search(r'===SOMATIC_CONTENT:\s*(\d)===', visible)
    if m: result["somatic_content"] = int(m.group(1))
    visible = re.sub(r'\n*===SOMATIC_CONTENT:.*?===\n*', '\n', visible)

    # Schema level
    m = re.search(r'===SCHEMA_LEVEL:\s*(\S+)===', visible)
    if m: result["schema_level"] = m.group(1)
    visible = re.sub(r'\n*===SCHEMA_LEVEL:.*?===\n*', '\n', visible)

    # Insight action
    m = re.search(r'===INSIGHT_ACTION:\s*(\S+)===', visible)
    if m: result["insight_action"] = m.group(1)
    visible = re.sub(r'\n*===INSIGHT_ACTION:.*?===\n*', '\n', visible)

    # Containment
    m = re.search(r'===CONTAINMENT:\s*(\S+)===', visible)
    if m: result["containment"] = m.group(1)
    visible = re.sub(r'\n*===CONTAINMENT:.*?===\n*', '\n', visible)

    # Flags
    if "===CRISIS_FLAG===" in visible:
        result["crisis_flag"] = True
    visible = re.sub(r'\n*===CRISIS_FLAG===\n*', '\n', visible)

    if "===RUMINATION_DETECTED===" in visible:
        result["rumination_detected"] = True
    visible = re.sub(r'\n*===RUMINATION_DETECTED===\n*', '\n', visible)

    # Defenses
    for m in re.finditer(r'===DEFENSE:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)===', visible):
        result["defenses"].append({"name": m.group(1).strip(), "level": m.group(2).strip(), "evidence": m.group(3).strip()})
    visible = re.sub(r'\n*===DEFENSE:.*?===\n*', '\n', visible)

    # CCRT
    for m in re.finditer(r'===CCRT:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)===', visible):
        result["ccrt_patterns"].append({"person": m.group(1).strip(), "wish": m.group(2).strip(), "ro": m.group(3).strip(), "rs": m.group(4).strip()})
    visible = re.sub(r'\n*===CCRT:.*?===\n*', '\n', visible)

    # Prior evidence
    for m in re.finditer(r'===PRIOR_EVIDENCE:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)===', visible):
        result["prior_evidence"].append({"name": m.group(1).strip(), "direction": m.group(2).strip(), "note": m.group(3).strip()})
    visible = re.sub(r'\n*===PRIOR_EVIDENCE:.*?===\n*', '\n', visible)

    # Experiments
    for m in re.finditer(r'===EXPERIMENT:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)===', visible):
        result["experiments"].append({"belief": m.group(1).strip(), "prediction": m.group(2).strip(), "action": m.group(3).strip(), "due": m.group(4).strip()})
    visible = re.sub(r'\n*===EXPERIMENT:.*?===\n*', '\n', visible)

    result["clean_response"] = visible.strip()
    return result


# ══════════════════════════════════════════════════════════
# POST-ENTRY PROCESSING
# ══════════════════════════════════════════════════════════

def process_entry_results(entry_id, entry_number, parsed):
    conn = get_db()
    logs = []

    # Update entry metadata
    conn.execute("""UPDATE entries SET tags=?, emotional_valence=?, commitments_made=?,
        processing_mode=?, somatic_content=?, schema_level=?, insight_action_ratio=?, containment_level=?
        WHERE id=?""",
        (json.dumps(parsed["tags"]), parsed["valence"], json.dumps(parsed["commitments"]),
         parsed["processing_mode"], parsed["somatic_content"], parsed["schema_level"],
         parsed["insight_action"], parsed["containment"], entry_id))

    # Bug fires
    for bf in parsed["bugs_fired"]:
        bug = conn.execute("SELECT id FROM bugs WHERE name=? AND status IN ('active','declining')", (bf["name"],)).fetchone()
        if bug:
            conn.execute("UPDATE bugs SET fire_count=fire_count+1, last_fired_entry=? WHERE id=?", (entry_number, bug['id']))
            conn.execute("INSERT INTO bug_fires (bug_id, entry_id, evidence) VALUES (?,?,?)", (bug['id'], entry_id, bf["evidence"]))
            logs.append(('bug_fired', f'Bug fired: {bf["name"]}', bf["evidence"], entry_id))

    # New bugs
    for nb in parsed["new_bugs"]:
        conn.execute("INSERT INTO bugs (name, description, status, source) VALUES (?,?,'pending','mentor')", (nb["name"], nb["description"]))
        logs.append(('bug_proposed', f'New pattern proposed: {nb["name"]}', nb["description"], entry_id))

    # Defenses
    for d in parsed["defenses"]:
        conn.execute("INSERT INTO defense_tracking (entry_id, defense_name, vaillant_level, evidence) VALUES (?,?,?,?)",
                     (entry_id, d["name"], d["level"], d["evidence"]))
        logs.append(('defense_observed', f'Defense: {d["name"]} ({d["level"]})', d["evidence"], entry_id))

    # CCRT
    for c in parsed["ccrt_patterns"]:
        conn.execute("INSERT INTO relational_patterns (entry_id, other_person, wish, response_of_other, response_of_self) VALUES (?,?,?,?,?)",
                     (entry_id, c["person"], c["wish"], c["ro"], c["rs"]))
        logs.append(('ccrt_extracted', f'CCRT: {c["person"]}', f'W:{c["wish"]} RO:{c["ro"]} RS:{c["rs"]}', entry_id))

    # Prior evidence
    for pe in parsed["prior_evidence"]:
        prior = conn.execute("SELECT id, evidence_count FROM priors WHERE name=?", (pe["name"],)).fetchone()
        if prior:
            conn.execute("UPDATE priors SET evidence_count=evidence_count+1, last_updated=? WHERE id=?",
                         (datetime.now().isoformat(), prior['id']))
            logs.append(('prior_evidence', f'Prior evidence: {pe["name"]} ({pe["direction"]})', pe["note"], entry_id))

    # Experiments
    for exp in parsed["experiments"]:
        conn.execute("INSERT INTO behavioral_experiments (entry_id, belief_tested, prediction, experiment, due_date) VALUES (?,?,?,?,?)",
                     (entry_id, exp["belief"], exp["prediction"], exp["action"], exp["due"]))
        logs.append(('experiment_assigned', f'Experiment: {exp["belief"][:50]}', f'{exp["action"]} (due: {exp["due"]})', entry_id))

    # Flags
    if parsed["crisis_flag"]:
        logs.append(('crisis_flag', 'CRISIS LANGUAGE DETECTED', 'Entry requires immediate attention', entry_id))
    if parsed["rumination_detected"]:
        logs.append(('rumination_detected', 'Rumination pattern detected', None, entry_id))

    # Containment shift
    if parsed["containment"] == "low":
        logs.append(('containment_shift', 'Low containment — supportive mode activated', None, entry_id))

    # Write all logs
    for log in logs:
        conn.execute("INSERT INTO mentor_log (event_type, summary, details, entry_id) VALUES (?,?,?,?)", log)

    conn.commit()
    conn.close()
    return logs


def check_rumination(entry_id):
    """Check for 3+ consecutive abstract-evaluative entries."""
    conn = get_db()
    recent = conn.execute("SELECT id, processing_mode FROM entries ORDER BY entry_number DESC LIMIT 3").fetchall()
    conn.close()
    if len(recent) >= 3 and all(r['processing_mode'] == 'abstract_evaluative' for r in recent):
        last_id = recent[0]['id']
        add_mentor_log('processing_mode_alert', '3+ consecutive abstract-evaluative entries', None, last_id)
        return True
    return False


def check_deterioration(entry_id):
    """Simple deterioration check based on valence trend."""
    conn = get_db()
    recent = conn.execute("SELECT id, emotional_valence FROM entries WHERE emotional_valence IS NOT NULL ORDER BY entry_number DESC LIMIT 5").fetchall()
    conn.close()
    if len(recent) < 5:
        return False
    vals = [r['emotional_valence'] for r in recent]
    last_entry_id = recent[0]['id']  # Use actual DB id for FK safety
    avg = sum(vals) / len(vals)
    if avg <= -1.0:
        add_mentor_log('deterioration_flag', f'Declining trend: avg valence {avg:.1f} over last 5 entries', json.dumps(vals), last_entry_id)
        return True
    return False


def run_memory_synthesis():
    """Compress raw memory notes into sharper understanding."""
    memory = load_memory()
    raw_notes = get_mentor_log_entries(event_type='memory_note', since_entry=memory.get('last_synthesis_entry', 0), limit=500)
    raw_notes.reverse()  # chronological order
    if not raw_notes:
        return

    raw_text = "\n\n---\n\n".join([n.get('details', '') or '' for n in raw_notes if n.get('details')])
    current_compressed = memory.get('compressed_memory', '')

    corrections = get_mentor_log_entries(event_type='user_correction', since_entry=memory.get('last_synthesis_entry', 0), limit=50)
    corrections.reverse()
    corrections_text = "\n".join([c.get('details', '') or '' for c in corrections]) if corrections else "None."

    prompt = MEMORY_SYNTHESIS_PROMPT.format(
        current_compressed=current_compressed or "No prior compressed memory.",
        raw_notes=raw_text,
        corrections=corrections_text,
        entry_count=memory['entry_count']
    )

    try:
        new_compressed = call_anthropic(prompt, max_tokens=1500)
    except:
        return

    memory['compressed_memory'] = new_compressed
    memory['last_synthesis_entry'] = memory['entry_count']
    memory['synthesis_count'] = memory.get('synthesis_count', 0) + 1
    save_memory(memory)

    add_mentor_log('memory_synthesis',
        f'Memory synthesized: {len(raw_notes)} notes compressed (synthesis #{memory["synthesis_count"]})',
        f'Compressed {len(raw_text.split())} words into {len(new_compressed.split())} words.')


# ══════════════════════════════════════════════════════════
# API ROUTES
# ══════════════════════════════════════════════════════════

@app.route('/')
def index():
    return render_template('index.html')


# ── Entries ────────────────────────────────────────────────

@app.route('/api/entries', methods=['GET'])
def list_entries():
    conn = get_db()
    entries = conn.execute("""SELECT id, entry_number, title, date, substr(raw_text,1,200) as preview,
        tags, emotional_valence, time_of_day, processing_mode, insight_action_ratio, backed_up, created_at
        FROM entries ORDER BY entry_number DESC""").fetchall()
    conn.close()
    return jsonify([dict(e) for e in entries])


@app.route('/api/entries/<int:eid>', methods=['GET'])
def get_entry(eid):
    conn = get_db()
    entry = conn.execute("SELECT * FROM entries WHERE id=?", (eid,)).fetchone()
    if not entry:
        conn.close()
        return jsonify({"error": "Not found"}), 404
    dialects = conn.execute("SELECT * FROM dialectic WHERE entry_id=? ORDER BY created_at", (eid,)).fetchall()
    experiments = conn.execute("SELECT * FROM behavioral_experiments WHERE entry_id=?", (eid,)).fetchall()
    conn.close()
    r = dict(entry)
    r["dialectic"] = [dict(d) for d in dialects]
    r["experiments"] = [dict(e) for e in experiments]
    return jsonify(r)


@app.route('/api/entries', methods=['POST'])
def create_entry():
    if not client:
        return jsonify({"error": "ANTHROPIC_JOURNAL_KEY not set. Set it in ~/.zshrc and restart."}), 500

    data = request.json
    text = data.get("text", "").strip()
    title = data.get("title", "").strip()
    mode = data.get("mode", "freeform")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    memory = load_memory()
    memory["entry_count"] += 1
    entry_num = memory["entry_count"]
    date_str = datetime.now().strftime('%d %B %Y')
    short_date = datetime.now().strftime('%d %b %Y')
    tod = get_time_of_day()

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
    parsed = parse_mentor_response(full_resp)

    # Save entry
    conn = get_db()
    cur = conn.execute("""INSERT INTO entries (entry_number, title, date, raw_text, mentor_response, time_of_day, journaling_mode)
        VALUES (?,?,?,?,?,?,?)""", (entry_num, title, short_date, text, parsed["clean_response"], tod, mode))
    entry_id = cur.lastrowid
    conn.commit()
    conn.close()

    # Process all structured data
    log_entries = process_entry_results(entry_id, entry_num, parsed)

    # Raw memory note
    if parsed["memory_update"]:
        append_raw_note(entry_id, parsed["memory_update"])

    # Save memory count
    save_memory(memory)

    # Memory synthesis every 10 entries
    if memory["entry_count"] % 10 == 0:
        run_memory_synthesis()

    # Post-entry checks
    check_rumination(entry_id)
    check_deterioration(entry_id)

    # Save analysis file
    os.makedirs(ANALYSES_DIR, exist_ok=True)
    fname = f"entry_{entry_num:03d}_{datetime.now().strftime('%Y%m%d')}.md"
    title_line = f" — {title}" if title else ""
    with open(os.path.join(ANALYSES_DIR, fname), "w") as f:
        f.write(f"# Entry #{entry_num}{title_line} — {short_date}\n\n## Journal Entry\n\n{text}\n\n---\n\n## Mentor Response\n\n{parsed['clean_response']}")

    # Google Sheet backup
    backup_to_google_doc(entry_num, short_date, title, text, parsed["clean_response"])

    # Apple Notes backup
    save_entry_to_apple_notes(entry_num, short_date, text, parsed["clean_response"])

    # Mark as backed up
    if GDOC_WEBHOOK:
        conn = get_db()
        conn.execute("UPDATE entries SET backed_up=1 WHERE id=?", (entry_id,))
        conn.commit()
        conn.close()

    return jsonify({
        "entry": {"id": entry_id, "entry_number": entry_num, "title": title, "date": short_date,
                  "raw_text": text, "mentor_response": parsed["clean_response"], "backed_up": 1 if GDOC_WEBHOOK else 0},
        "bugs_fired": parsed["bugs_fired"],
        "new_bugs": parsed["new_bugs"],
        "experiments_proposed": parsed["experiments"],
        "flags": {"crisis": parsed["crisis_flag"], "rumination": parsed["rumination_detected"],
                  "containment": parsed["containment"]},
        "log_entries": [{"type": l[0], "summary": l[1]} for l in log_entries]
    })


@app.route('/api/entries/<int:eid>', methods=['DELETE'])
def delete_entry(eid):
    conn = get_db()
    conn.execute("DELETE FROM dialectic WHERE entry_id=?", (eid,))
    conn.execute("DELETE FROM bug_fires WHERE entry_id=?", (eid,))
    conn.execute("DELETE FROM defense_tracking WHERE entry_id=?", (eid,))
    conn.execute("DELETE FROM relational_patterns WHERE entry_id=?", (eid,))
    conn.execute("DELETE FROM behavioral_experiments WHERE entry_id=?", (eid,))
    conn.execute("UPDATE mentor_log SET entry_id=NULL WHERE entry_id=?", (eid,))
    conn.execute("DELETE FROM entries WHERE id=?", (eid,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route('/api/entries/<int:eid>/backup', methods=['POST'])
def backup_entry(eid):
    if not GDOC_WEBHOOK:
        return jsonify({"error": "JOURNAL_GDOC_WEBHOOK not configured"}), 500
    conn = get_db()
    entry = conn.execute("SELECT * FROM entries WHERE id=?", (eid,)).fetchone()
    conn.close()
    if not entry:
        return jsonify({"error": "Not found"}), 404
    backup_to_google_doc(entry['entry_number'], entry['date'], entry.get('title','') or '', entry['raw_text'], entry['mentor_response'] or '')
    conn = get_db()
    conn.execute("UPDATE entries SET backed_up=1 WHERE id=?", (eid,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# ── Dialectic ──────────────────────────────────────────────

@app.route('/api/entries/<int:eid>/dialectic', methods=['GET'])
def get_dialectic(eid):
    conn = get_db()
    msgs = conn.execute("SELECT * FROM dialectic WHERE entry_id=? ORDER BY created_at", (eid,)).fetchall()
    conn.close()
    return jsonify([dict(m) for m in msgs])


@app.route('/api/entries/<int:eid>/dialectic', methods=['POST'])
def send_dialectic(eid):
    if not client:
        return jsonify({"error": "No API key"}), 500
    data = request.json
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"error": "No message"}), 400

    conn = get_db()
    entry = conn.execute("SELECT * FROM entries WHERE id=?", (eid,)).fetchone()
    if not entry:
        conn.close()
        return jsonify({"error": "Entry not found"}), 404
    prior = conn.execute("SELECT role, content FROM dialectic WHERE entry_id=? ORDER BY created_at", (eid,)).fetchall()
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
        response = client.messages.create(model="claude-sonnet-4-20250514", max_tokens=1200, system=system, messages=messages)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    reply_raw = response.content[0].text

    # Strip structured delimiters from dialectic replies (same parser as entry responses)
    parsed = parse_mentor_response(reply_raw)
    reply = parsed["clean_response"]

    # If there's a memory update in the dialectic, save it
    if parsed["memory_update"]:
        append_raw_note(eid, f"Dialectic followup: {parsed['memory_update']}")

    conn = get_db()
    conn.execute("INSERT INTO dialectic (entry_id, role, content) VALUES (?,'user',?)", (eid, message))
    conn.execute("INSERT INTO dialectic (entry_id, role, content) VALUES (?,'mentor',?)", (eid, reply))
    conn.commit()
    conn.close()
    return jsonify({"response": reply})


# ── Bugs ───────────────────────────────────────────────────

@app.route('/api/bugs', methods=['GET'])
def list_bugs():
    conn = get_db()
    bugs = conn.execute("SELECT * FROM bugs ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 WHEN 'declining' THEN 2 ELSE 3 END, fire_count DESC").fetchall()
    conn.close()
    return jsonify([dict(b) for b in bugs])

@app.route('/api/bugs', methods=['POST'])
def add_bug():
    data = request.json
    conn = get_db()
    conn.execute("""INSERT INTO bugs (name, description, source, trigger_pattern, thought_signature, behavior_signature, intervention)
        VALUES (?,?,'user',?,?,?,?)""",
        (data['name'], data['description'], data.get('trigger_pattern'), data.get('thought_signature'),
         data.get('behavior_signature'), data.get('intervention')))
    conn.commit()
    conn.close()
    add_mentor_log('bug_confirmed', f'User added pattern: {data["name"]}', data['description'])
    return jsonify({"status": "ok"})

@app.route('/api/bugs/<int:bid>', methods=['PUT'])
def update_bug(bid):
    data = request.json
    conn = get_db()
    old = conn.execute("SELECT * FROM bugs WHERE id=?", (bid,)).fetchone()
    old_name = old['name'] if old else ''
    old_status = old['status'] if old else ''
    if 'status' in data:
        conn.execute("UPDATE bugs SET status=? WHERE id=?", (data['status'], bid))
    if 'description' in data:
        conn.execute("UPDATE bugs SET description=? WHERE id=?", (data['description'], bid))
    for field in ['trigger_pattern', 'thought_signature', 'behavior_signature', 'intervention']:
        if field in data:
            conn.execute(f"UPDATE bugs SET {field}=? WHERE id=?", (data[field], bid))
    conn.commit()
    conn.close()
    if 'status' in data and old_name:
        add_mentor_log('bug_status_change', f'Bug "{old_name}": {old_status} → {data["status"]}')
    return jsonify({"status": "ok"})

@app.route('/api/bugs/<int:bid>', methods=['DELETE'])
def delete_bug(bid):
    conn = get_db()
    conn.execute("DELETE FROM bug_fires WHERE bug_id=?", (bid,))
    conn.execute("DELETE FROM bugs WHERE id=?", (bid,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/bugs/<int:bid>/confirm', methods=['POST'])
def confirm_bug(bid):
    conn = get_db()
    bug = conn.execute("SELECT name FROM bugs WHERE id=?", (bid,)).fetchone()
    conn.execute("UPDATE bugs SET status='active' WHERE id=? AND status='pending'", (bid,))
    conn.commit()
    conn.close()
    if bug:
        add_mentor_log('bug_confirmed', f'Confirmed pattern: {bug["name"]}')
    return jsonify({"status": "ok"})

@app.route('/api/bugs/<int:bid>/evolve', methods=['POST'])
def evolve_bug(bid):
    data = request.json
    conn = get_db()
    old = conn.execute("SELECT * FROM bugs WHERE id=?", (bid,)).fetchone()
    if not old:
        conn.close()
        return jsonify({"error": "Bug not found"}), 404
    cur = conn.execute("""INSERT INTO bugs (name, description, source, parent_id, trigger_pattern, thought_signature, behavior_signature, intervention)
        VALUES (?,?,'monthly_audit',?,?,?,?,?)""",
        (data['new_name'], data['new_description'], bid,
         data.get('trigger_pattern', old['trigger_pattern']),
         data.get('thought_signature', old['thought_signature']),
         data.get('behavior_signature', old['behavior_signature']),
         data.get('intervention', old['intervention'])))
    new_id = cur.lastrowid
    conn.execute("UPDATE bugs SET superseded_by=?, status='resolved' WHERE id=?", (new_id, bid))
    conn.commit()
    conn.close()
    add_mentor_log('bug_evolved', f'Bug evolved: "{old["name"]}" → "{data["new_name"]}"')
    return jsonify({"status": "ok", "new_id": new_id})


# ── Goals ──────────────────────────────────────────────────

@app.route('/api/goals', methods=['GET'])
def list_goals():
    conn = get_db()
    objectives = conn.execute("SELECT * FROM goals WHERE layer='objective' ORDER BY direction, domain").fetchall()
    behavioral = conn.execute("SELECT * FROM goals WHERE layer='behavioral' ORDER BY direction").fetchall()
    principles = conn.execute("SELECT * FROM goals WHERE layer='principle'").fetchall()
    conn.close()
    return jsonify({
        "objectives": [dict(g) for g in objectives],
        "behavioral": [dict(g) for g in behavioral],
        "principles": [dict(g) for g in principles]
    })

@app.route('/api/goals', methods=['POST'])
def add_goal():
    data = request.json
    conn = get_db()
    conn.execute("INSERT INTO goals (layer, domain, direction, description) VALUES (?,?,?,?)",
                 (data.get('layer', 'objective'), data.get('domain'), data.get('direction'), data['description']))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/goals/<int:gid>', methods=['PUT'])
def update_goal(gid):
    data = request.json
    conn = get_db()
    if 'status' in data:
        conn.execute("UPDATE goals SET status=? WHERE id=?", (data['status'], gid))
    if 'description' in data:
        conn.execute("UPDATE goals SET description=? WHERE id=?", (data['description'], gid))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/goals/<int:gid>', methods=['DELETE'])
def delete_goal(gid):
    conn = get_db()
    conn.execute("DELETE FROM goals WHERE id=?", (gid,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# ── Priors ─────────────────────────────────────────────────

@app.route('/api/priors', methods=['GET'])
def list_priors():
    conn = get_db()
    priors = conn.execute("SELECT * FROM priors ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(p) for p in priors])

@app.route('/api/priors/<int:pid>', methods=['PUT'])
def update_prior(pid):
    data = request.json
    conn = get_db()
    old = conn.execute("SELECT * FROM priors WHERE id=?", (pid,)).fetchone()
    if not old:
        conn.close()
        return jsonify({"error": "Not found"}), 404
    history = json.loads(old['history'] or '[]')
    history.append({"date": datetime.now().isoformat(), "old": old['current_estimate'], "new": data.get('current_estimate', old['current_estimate']), "reason": data.get('reason', 'Manual update')})
    conn.execute("UPDATE priors SET current_estimate=?, confidence=?, history=?, last_updated=? WHERE id=?",
                 (data.get('current_estimate', old['current_estimate']), data.get('confidence', old['confidence']),
                  json.dumps(history), datetime.now().isoformat(), pid))
    conn.commit()
    conn.close()
    add_mentor_log('prior_updated', f'Prior updated: {old["name"]}', f'{old["current_estimate"]} → {data.get("current_estimate", old["current_estimate"])}')
    return jsonify({"status": "ok"})

@app.route('/api/priors', methods=['POST'])
def add_prior():
    data = request.json
    conn = get_db()
    conn.execute("INSERT INTO priors (name, current_estimate, confidence, source) VALUES (?,?,?,?)",
                 (data['name'], data['current_estimate'], data.get('confidence', 'moderate'), data.get('source', 'user')))
    conn.commit()
    conn.close()
    add_mentor_log('prior_added', f'New prior: {data["name"]}', data['current_estimate'])
    return jsonify({"status": "ok"})

INITIAL_PRIORS = [
    {"name": "Commitment follow-through rate", "current_estimate": "20-25%", "confidence": "moderate", "source": "baseline"},
    {"name": "Post-hoc rationalization frequency", "current_estimate": "80-85% of major decisions", "confidence": "moderate", "source": "baseline"},
    {"name": "Self-torture cycle frequency", "current_estimate": "Multiple times weekly", "confidence": "moderate", "source": "baseline"},
    {"name": "Comparison engine triggers", "current_estimate": "Peer success, Twitter, social media", "confidence": "high", "source": "baseline"},
    {"name": "Abstract-to-concrete processing ratio", "current_estimate": "Heavily abstract-evaluative (est. 80%+)", "confidence": "moderate", "source": "baseline"},
    {"name": "Somatic awareness frequency", "current_estimate": "Rare — body referenced in <10% of entries", "confidence": "low", "source": "baseline"},
    {"name": "Defense maturity ratio", "current_estimate": "Predominantly neurotic (intellectualization)", "confidence": "moderate", "source": "baseline"},
    {"name": "Insight-to-action conversion rate", "current_estimate": "Low — est. 20-25%", "confidence": "moderate", "source": "baseline"},
    {"name": "Behavioral experiment completion rate", "current_estimate": "No data yet", "confidence": "low", "source": "baseline"},
]

@app.route('/api/priors/seed', methods=['POST'])
def seed_priors():
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) as c FROM priors").fetchone()['c']
    if count > 0:
        conn.close()
        return jsonify({"status": "already_seeded", "count": count})
    for p in INITIAL_PRIORS:
        conn.execute("INSERT INTO priors (name, current_estimate, confidence, source) VALUES (?,?,?,?)",
                     (p['name'], p['current_estimate'], p['confidence'], p['source']))
    conn.commit()
    conn.close()
    add_mentor_log('prior_added', f'Seeded {len(INITIAL_PRIORS)} initial priors from baseline')
    return jsonify({"status": "ok", "count": len(INITIAL_PRIORS)})


# ── Phases ─────────────────────────────────────────────────

@app.route('/api/phases', methods=['GET'])
def list_phases():
    conn = get_db()
    phases = conn.execute("SELECT * FROM phases ORDER BY start_entry").fetchall()
    conn.close()
    return jsonify([dict(p) for p in phases])

@app.route('/api/phases', methods=['POST'])
def add_phase():
    data = request.json
    conn = get_db()
    # Close current phase
    memory = load_memory()
    conn.execute("UPDATE phases SET end_entry=? WHERE end_entry IS NULL", (memory['entry_count'],))
    conn.execute("INSERT INTO phases (name, description, start_entry) VALUES (?,?,?)",
                 (data['name'], data['description'], memory['entry_count'] + 1))
    conn.commit()
    conn.close()
    add_mentor_log('phase_confirmed', f'New phase: {data["name"]}', data['description'])
    return jsonify({"status": "ok"})


# ── Experiments ────────────────────────────────────────────

@app.route('/api/experiments', methods=['GET'])
def list_experiments():
    status = request.args.get('status')
    conn = get_db()
    if status:
        rows = conn.execute("SELECT * FROM behavioral_experiments WHERE status=? ORDER BY created_at DESC", (status,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM behavioral_experiments ORDER BY created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/experiments/<int:xid>/complete', methods=['POST'])
def complete_experiment(xid):
    data = request.json
    conn = get_db()
    conn.execute("""UPDATE behavioral_experiments SET status='completed', outcome=?, belief_rating_after=?,
        reflection=?, completed_at=? WHERE id=?""",
        (data.get('outcome',''), data.get('belief_rating_after'), data.get('reflection',''), datetime.now().isoformat(), xid))
    exp = conn.execute("SELECT * FROM behavioral_experiments WHERE id=?", (xid,)).fetchone()
    conn.commit()
    conn.close()
    if exp:
        add_mentor_log('experiment_completed', f'Experiment completed: {exp["belief_tested"][:60]}',
                       f'Outcome: {data.get("outcome","")}. Belief before: {exp["belief_rating_before"]}, after: {data.get("belief_rating_after")}')
    return jsonify({"status": "ok"})

@app.route('/api/experiments/<int:xid>/skip', methods=['POST'])
def skip_experiment(xid):
    data = request.json
    conn = get_db()
    conn.execute("UPDATE behavioral_experiments SET status='skipped', reflection=? WHERE id=?", (data.get('reason',''), xid))
    exp = conn.execute("SELECT * FROM behavioral_experiments WHERE id=?", (xid,)).fetchone()
    conn.commit()
    conn.close()
    if exp:
        add_mentor_log('experiment_skipped', f'Experiment skipped: {exp["belief_tested"][:60]}', data.get('reason',''))
    return jsonify({"status": "ok"})


# ── Micro-Assessments ─────────────────────────────────────

@app.route('/api/micro-assessments', methods=['GET'])
def list_micro():
    days = int(request.args.get('days', 30))
    cutoff = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    conn = get_db()
    rows = conn.execute("SELECT * FROM micro_assessments WHERE date >= ? ORDER BY date DESC", (cutoff,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/micro-assessments', methods=['POST'])
def add_micro():
    data = request.json
    conn = get_db()
    conn.execute("""INSERT INTO micro_assessments (date, time_of_day, wellbeing, interpersonal, social_role, overall, body_sensation, context)
        VALUES (?,?,?,?,?,?,?,?)""",
        (datetime.now().strftime('%Y-%m-%d'), get_time_of_day(),
         data.get('wellbeing'), data.get('interpersonal'), data.get('social_role'), data.get('overall'),
         data.get('body_sensation',''), data.get('context','')))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


# ── Topics / Ideation ─────────────────────────────────────

@app.route('/api/topics', methods=['GET'])
def list_topics():
    conn = get_db()
    topics = conn.execute("SELECT * FROM topics ORDER BY status='open' DESC, priority DESC, created_at DESC").fetchall()
    conn.close()
    return jsonify([dict(t) for t in topics])

@app.route('/api/topics', methods=['POST'])
def add_topic():
    data = request.json
    conn = get_db()
    conn.execute("INSERT INTO topics (text, notes, priority) VALUES (?,?,?)",
                 (data['text'], data.get('notes', ''), data.get('priority', 0)))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/topics/<int:tid>', methods=['PUT'])
def update_topic(tid):
    data = request.json
    conn = get_db()
    if 'status' in data:
        conn.execute("UPDATE topics SET status=? WHERE id=?", (data['status'], tid))
    if 'text' in data:
        conn.execute("UPDATE topics SET text=? WHERE id=?", (data['text'], tid))
    if 'notes' in data:
        conn.execute("UPDATE topics SET notes=? WHERE id=?", (data['notes'], tid))
    if 'priority' in data:
        conn.execute("UPDATE topics SET priority=? WHERE id=?", (data['priority'], tid))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/topics/<int:tid>', methods=['DELETE'])
def delete_topic(tid):
    conn = get_db()
    conn.execute("DELETE FROM topics WHERE id=?", (tid,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route('/api/topics/export', methods=['GET'])
def export_topics():
    """Export topics as plain text for Apple Notes."""
    conn = get_db()
    topics = conn.execute("SELECT * FROM topics WHERE status='open' ORDER BY priority DESC, created_at DESC").fetchall()
    conn.close()
    lines = ["Ideation — Topics\n"]
    for t in topics:
        lines.append(f"• {t['text']}")
        if t['notes']:
            lines.append(f"  {t['notes']}")
        lines.append("")
    return jsonify({"text": "\n".join(lines), "count": len(topics)})

@app.route('/api/topics/sync-notes', methods=['POST'])
def sync_to_apple_notes():
    """Sync topics to Apple Notes via osascript (macOS only)."""
    conn = get_db()
    topics = conn.execute("SELECT * FROM topics WHERE status='open' ORDER BY priority DESC, created_at DESC").fetchall()
    conn.close()

    lines = ["Ideation — Topics", f"Updated: {datetime.now().strftime('%d %b %Y %H:%M')}", ""]
    for t in topics:
        lines.append(f"• {t['text']}")
        if t['notes']:
            lines.append(f"  {t['notes']}")
        lines.append("")

    note_content = "\n".join(lines)
    note_title = "Journal Mentor — Ideation"

    # Use AppleScript to create/update a note in Apple Notes
    import subprocess
    escaped_content = note_content.replace(chr(10), '<br>').replace('"', '\\"')
    script = ('tell application "Notes"\n'
              '    set noteFound to false\n'
              '    repeat with eachNote in notes of default account\n'
              '        if name of eachNote is "' + note_title + '" then\n'
              '            set body of eachNote to "' + escaped_content + '"\n'
              '            set noteFound to true\n'
              '            exit repeat\n'
              '        end if\n'
              '    end repeat\n'
              '    if not noteFound then\n'
              '        make new note at default account with properties {name:"' + note_title + '", body:"' + escaped_content + '"}\n'
              '    end if\n'
              'end tell')
    try:
        subprocess.run(['osascript', '-e', script], capture_output=True, timeout=10)
        return jsonify({"status": "ok", "message": "Synced to Apple Notes"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _do_pull_from_apple_notes():
    """Pull topics from Apple Notes. Returns (added, total) or None on error."""
    import subprocess, re as regex_mod
    note_title = "Journal Mentor — Ideation"
    script = (
        'tell application "Notes"\n'
        '    set noteBody to ""\n'
        '    repeat with eachNote in notes\n'
        '        if name of eachNote is "' + note_title + '" then\n'
        '            set noteBody to body of eachNote\n'
        '            exit repeat\n'
        '        end if\n'
        '    end repeat\n'
        '    return noteBody\n'
        'end tell'
    )
    try:
        result = subprocess.run(['osascript', '-e', script], capture_output=True, timeout=15, text=True)
        body = result.stdout or ""
    except Exception:
        return None

    if not body:
        return None

    text = regex_mod.sub(r'<br[^>]*>', '\n', body)
    text = regex_mod.sub(r'</div>', '\n', text)
    text = regex_mod.sub(r'<[^>]+>', '', text)
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&#39;', "'").replace('&quot;', '"')

    lines = [l.strip() for l in text.split('\n')]
    topics_found = []
    for line in lines:
        if not line:
            continue
        if line.startswith('Journal Mentor') or line.startswith('Updated:') or line.startswith('Ideation'):
            continue
        if line.startswith('•') or line.startswith('-') or line.startswith('*'):
            line = line[1:].strip()
        if line and len(line) > 1:
            topics_found.append(line)

    conn = get_db()
    existing = set(r['text'].lower().strip() for r in conn.execute("SELECT text FROM topics").fetchall())
    added = 0
    for t in topics_found:
        if t.lower().strip() not in existing:
            conn.execute("INSERT INTO topics (text) VALUES (?)", (t,))
            existing.add(t.lower().strip())
            added += 1
    conn.commit()
    conn.close()
    return (added, len(topics_found))


@app.route('/api/topics/pull-from-notes', methods=['POST'])
def pull_from_apple_notes():
    """Read the Journal Mentor — Ideation note from Apple Notes and merge new topics."""
    result = _do_pull_from_apple_notes()
    if result is None:
        return jsonify({"error": "Note not found in Apple Notes. Click 'Push to Notes' first to create it."}), 404
    added, total = result
    return jsonify({"status": "ok", "added": added, "total_found": total})


def background_notes_sync():
    """Pulls from Apple Notes every 60 seconds in a background thread."""
    import time
    while True:
        time.sleep(60)
        try:
            r = _do_pull_from_apple_notes()
            if r and r[0] > 0:
                print(f"  [auto-sync] Pulled {r[0]} new topic(s) from Apple Notes")
        except Exception:
            pass


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
    conn.execute("INSERT INTO documents (filename, filepath, doc_type) VALUES (?,?,?)", (fname, fpath, doc_type))
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
        conn.execute("UPDATE documents SET analysis_status='included_in_baseline', last_analyzed=? WHERE id=?",
                     (datetime.now().isoformat(), did))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


PLAYBOOK_DECOMPOSITION_PROMPT = """You are extracting actionable pattern-intervention protocols from a practical psychology document. This document describes recurring thinking and behavior patterns observed in a specific person, with guidance on how to identify and interrupt each pattern.

For EACH pattern you identify, extract:

1. NAME: Short plain-language name (2-5 words)
2. DESCRIPTION: One paragraph describing what this pattern is and why it matters
3. TRIGGER_PATTERN: What situations, emotions, or conditions activate this pattern?
4. THOUGHT_SIGNATURE: What does the internal monologue sound like when this is running?
5. BEHAVIOR_SIGNATURE: What observable behavior follows?
6. INTERVENTION: The specific action protocol for the mentor — what to say, what question to ask, what redirect to use. Calibrated to this specific person.

Output as a JSON array:
[{"name":"...","description":"...","trigger_pattern":"...","thought_signature":"...","behavior_signature":"...","intervention":"..."}, ...]

Output ONLY the JSON array. No preamble.

DOCUMENT TO DECOMPOSE:
{document_content}"""


@app.route('/api/documents/<int:did>/decompose', methods=['POST'])
def decompose_document(did):
    if not client:
        return jsonify({"error": "No API key"}), 500
    conn = get_db()
    doc = conn.execute("SELECT * FROM documents WHERE id=?", (did,)).fetchone()
    conn.close()
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    if doc['doc_type'] != 'practical_playbook':
        return jsonify({"error": "Only practical_playbook documents can be decomposed"}), 400

    # Read file content
    try:
        with open(doc['filepath'], 'r', errors='replace') as f:
            content = f.read()
    except:
        return jsonify({"error": "Could not read document file"}), 500

    prompt = PLAYBOOK_DECOMPOSITION_PROMPT.replace("{document_content}", content)

    try:
        result = call_anthropic(prompt, max_tokens=3000)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    # Parse JSON response
    try:
        # Find JSON array in response
        match = re.search(r'\[.*\]', result, re.DOTALL)
        if match:
            proposed = json.loads(match.group())
        else:
            proposed = json.loads(result)
    except:
        return jsonify({"error": "Failed to parse decomposition result", "raw": result}), 500

    return jsonify({"proposed_bugs": proposed, "document_id": did})


@app.route('/api/documents/<int:did>/decompose/confirm', methods=['POST'])
def confirm_decomposition(did):
    data = request.json
    bugs_list = data.get("bugs", [])
    conn = get_db()
    for b in bugs_list:
        conn.execute("""INSERT INTO bugs (name, description, source, trigger_pattern, thought_signature, behavior_signature, intervention)
            VALUES (?,?,'practical_playbook',?,?,?,?)""",
            (b['name'], b['description'], b.get('trigger_pattern'), b.get('thought_signature'),
             b.get('behavior_signature'), b.get('intervention')))
    conn.execute("UPDATE documents SET analysis_status='decomposed_into_bugs', last_analyzed=? WHERE id=?",
                 (datetime.now().isoformat(), did))
    conn.commit()
    conn.close()
    for b in bugs_list:
        add_mentor_log('bug_confirmed', f'Bug from playbook: {b["name"]}', b.get('description'))
    return jsonify({"status": "ok", "bugs_created": len(bugs_list)})


# ── Baseline ──────────────────────────────────────────────

@app.route('/api/baseline', methods=['GET'])
def get_baseline():
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH, "r") as f:
            content = f.read()
        # Count versions
        os.makedirs(BASELINES_DIR, exist_ok=True)
        versions = len([f for f in os.listdir(BASELINES_DIR) if f.startswith("baseline_v")])
        return jsonify({"exists": True, "word_count": len(content.split()), "preview": content[:500],
                        "version": versions + 1, "full_content": content})
    return jsonify({"exists": False, "version": 0})

@app.route('/api/baseline/upload', methods=['POST'])
def upload_baseline():
    if request.content_type and 'multipart/form-data' in request.content_type:
        if 'file' not in request.files:
            return jsonify({"error": "No file"}), 400
        f = request.files['file']
        content = f.read().decode('utf-8', errors='replace')
    else:
        data = request.json
        content = data.get("content", "")

    # Archive old baseline if exists
    if os.path.exists(BASELINE_PATH):
        os.makedirs(BASELINES_DIR, exist_ok=True)
        versions = len([f for f in os.listdir(BASELINES_DIR) if f.startswith("baseline_v")])
        archive_path = os.path.join(BASELINES_DIR, f"baseline_v{versions + 1}.md")
        shutil.copy2(BASELINE_PATH, archive_path)

    with open(BASELINE_PATH, "w") as f:
        f.write(content)

    add_mentor_log('baseline_evolved', f'Baseline uploaded/updated ({len(content.split())} words)')
    return jsonify({"status": "ok", "word_count": len(content.split())})

@app.route('/api/baseline/versions', methods=['GET'])
def baseline_versions():
    os.makedirs(BASELINES_DIR, exist_ok=True)
    versions = sorted([f for f in os.listdir(BASELINES_DIR) if f.startswith("baseline_v")])
    return jsonify({"versions": versions})


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
    experiments = conn.execute("SELECT * FROM behavioral_experiments WHERE created_at >= ? ORDER BY created_at", (cutoff,)).fetchall()
    micros = conn.execute("SELECT * FROM micro_assessments WHERE date >= ? ORDER BY date", ((datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d'),)).fetchall()
    log_highlights = conn.execute("SELECT * FROM mentor_log WHERE created_at >= ? AND event_type IN ('deterioration_flag','crisis_flag','rumination_detected','memory_synthesis','user_correction') ORDER BY created_at", (cutoff,)).fetchall()
    defenses = conn.execute("SELECT * FROM defense_tracking WHERE created_at >= ? ORDER BY created_at", (cutoff,)).fetchall()
    rels = conn.execute("SELECT * FROM relational_patterns WHERE created_at >= ? ORDER BY created_at", (cutoff,)).fetchall()
    conn.close()
    return {
        "entries": [dict(e) for e in entries],
        "dialectic": [dict(d) for d in dialectic],
        "weekly_reports": [dict(r) for r in reports],
        "experiments": [dict(x) for x in experiments],
        "micro_assessments": [dict(m) for m in micros],
        "mentor_log_highlights": [dict(l) for l in log_highlights],
        "defense_observations": [dict(d) for d in defenses],
        "relational_patterns": [dict(r) for r in rels],
    }


@app.route('/api/reports/weekly', methods=['POST'])
def generate_weekly():
    if not client:
        return jsonify({"error": "No API key"}), 500

    # Run synthesis first
    run_memory_synthesis()

    data = gather_report_data(7)
    if not data["entries"]:
        return jsonify({"error": "No entries in the past 7 days"}), 400

    baseline = ""
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH) as f:
            baseline = f.read()

    memory = load_memory()
    bugs = get_active_bugs()
    toward_obj = get_goals(layer='objective', direction='toward')
    away_obj = get_goals(layer='objective', direction='away')
    behavioral = get_goals(layer='behavioral')
    principles = get_goals(layer='principle')
    priors = get_active_priors()
    phase = get_current_phase()
    experiments = get_open_experiments()

    prompt = WEEKLY_REPORT_PROMPT
    prompt = prompt.replace("{toward_objectives}", "\n".join([f"- [{g.get('domain','')}] {g['description']}" for g in toward_obj]) or "None.")
    prompt = prompt.replace("{away_objectives}", "\n".join([f"- [{g.get('domain','')}] {g['description']}" for g in away_obj]) or "None.")
    prompt = prompt.replace("{behavioral_goals}", "\n".join([f"- [{g.get('direction','toward')}] {g['description']}" for g in behavioral]) or "None.")
    prompt = prompt.replace("{principles}", "\n".join([f"- {g['description']}" for g in principles]) or "None.")
    prompt = prompt.replace("{bugs}", "\n".join([f"- {b['name']}: {b['description']} (fired {b['fire_count']}x)" for b in bugs]) or "None.")
    prompt = prompt.replace("{priors}", "\n".join([f"- {p['name']}: {p['current_estimate']}" for p in priors]) or "None.")
    prompt = prompt.replace("{phase}", f"{phase['name']}: {phase['description']}" if phase else "None defined.")
    prompt = prompt.replace("{experiments}", "\n".join([f"- {e['belief_tested']}: {e['experiment']} (status: {e['status']})" for e in data["experiments"]]) or "None.")
    prompt = prompt.replace("{baseline}", baseline[:2000] or "No baseline.")
    prompt = prompt.replace("{memory}", memory.get('compressed_memory','') or "None.")
    prompt = prompt.replace("{entries}", "\n\n---\n\n".join([f"Entry #{e['entry_number']} ({e['date']}):\n{e['raw_text']}" for e in data["entries"]]))
    prompt = prompt.replace("{dialectic_messages}", "\n".join([f"[{d['role']}]: {d['content'][:200]}" for d in data["dialectic"]]) or "None.")
    prompt = prompt.replace("{micro_assessments}", "\n".join([f"{m['date']}: WB={m['wellbeing']} IP={m['interpersonal']} SR={m['social_role']} OV={m['overall']}" for m in data["micro_assessments"]]) or "None.")

    try:
        content = call_anthropic(prompt, max_tokens=3000)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    now = datetime.now()
    period = f"Week of {(now - timedelta(days=7)).strftime('%d')}–{now.strftime('%d %b %Y')}"

    conn = get_db()
    notes_sent = 1 if send_to_apple_notes(f"Weekly Report — {period}", content) else 0
    conn.execute("INSERT INTO reports (report_type, period, content, email_sent) VALUES ('weekly',?,?,?)", (period, content, notes_sent))
    conn.commit()
    conn.close()

    add_mentor_log('weekly_synthesis', f'Weekly report generated: {period}', content[:200])
    return jsonify({"report": content, "period": period, "notes_sent": bool(notes_sent)})


@app.route('/api/reports/monthly', methods=['POST'])
def generate_monthly():
    if not client:
        return jsonify({"error": "No API key"}), 500

    run_memory_synthesis()

    data = gather_report_data(30)
    if not data["entries"]:
        return jsonify({"error": "No entries in the past 30 days"}), 400

    baseline = ""
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH) as f:
            baseline = f.read()

    memory = load_memory()
    bugs = get_active_bugs()
    toward_obj = get_goals(layer='objective', direction='toward')
    away_obj = get_goals(layer='objective', direction='away')
    behavioral = get_goals(layer='behavioral')
    principles = get_goals(layer='principle')
    priors = get_active_priors()
    phase = get_current_phase()

    prompt = MONTHLY_REPORT_PROMPT
    prompt = prompt.replace("{toward_objectives}", "\n".join([f"- [{g.get('domain','')}] {g['description']}" for g in toward_obj]) or "None.")
    prompt = prompt.replace("{away_objectives}", "\n".join([f"- [{g.get('domain','')}] {g['description']}" for g in away_obj]) or "None.")
    prompt = prompt.replace("{behavioral_goals}", "\n".join([f"- [{g.get('direction','toward')}] {g['description']}" for g in behavioral]) or "None.")
    prompt = prompt.replace("{principles}", "\n".join([f"- {g['description']}" for g in principles]) or "None.")
    prompt = prompt.replace("{bugs}", "\n".join([f"- {b['name']}: {b['description']} (fired {b['fire_count']}x)" for b in bugs]) or "None.")
    prompt = prompt.replace("{priors}", "\n".join([f"- {p['name']}: {p['current_estimate']}" for p in priors]) or "None.")
    prompt = prompt.replace("{phase}", f"{phase['name']}: {phase['description']}" if phase else "None.")
    prompt = prompt.replace("{experiments}", "\n".join([f"- {e['belief_tested']}: {e['experiment']} ({e['status']})" for e in data["experiments"]]) or "None.")
    prompt = prompt.replace("{baseline}", baseline[:2000] or "No baseline.")
    prompt = prompt.replace("{memory}", memory.get('compressed_memory','') or "None.")
    prompt = prompt.replace("{entries}", "\n\n---\n\n".join([f"Entry #{e['entry_number']} ({e['date']}):\n{e['raw_text'][:500]}" for e in data["entries"]]))
    prompt = prompt.replace("{dialectic_messages}", "\n".join([f"[{d['role']}]: {d['content'][:200]}" for d in data["dialectic"][:50]]) or "None.")
    prompt = prompt.replace("{weekly_reports}", "\n\n===\n\n".join([f"{r['period']}:\n{r['content'][:500]}" for r in data["weekly_reports"]]) or "None.")
    prompt = prompt.replace("{micro_assessments}", "\n".join([f"{m['date']}: WB={m['wellbeing']} OV={m['overall']}" for m in data["micro_assessments"]]) or "None.")
    prompt = prompt.replace("{mentor_log_highlights}", "\n".join([f"[{l['event_type']}] {l['summary']}" for l in data["mentor_log_highlights"]]) or "None.")
    prompt = prompt.replace("{defense_observations}", "\n".join([f"{d['defense_name']} ({d['vaillant_level']})" for d in data["defense_observations"]]) or "None.")
    prompt = prompt.replace("{relational_patterns}", "\n".join([f"W:{r['wish']} RO:{r['response_of_other']} RS:{r['response_of_self']}" for r in data["relational_patterns"]]) or "None.")

    try:
        content = call_anthropic(prompt, max_tokens=4000)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    period = datetime.now().strftime('%B %Y')

    conn = get_db()
    notes_sent = 1 if send_to_apple_notes(f"Monthly Deep Report — {period}", content) else 0
    conn.execute("INSERT INTO reports (report_type, period, content, email_sent) VALUES ('monthly',?,?,?)", (period, content, notes_sent))
    conn.commit()
    conn.close()

    add_mentor_log('monthly_audit', f'Monthly report generated: {period}', content[:200])
    return jsonify({"report": content, "period": period, "notes_sent": bool(notes_sent)})


# ── Mentor Log ─────────────────────────────────────────────

@app.route('/api/mentor-log', methods=['GET'])
def get_log():
    event_type = request.args.get('type')
    limit = int(request.args.get('limit', 100))
    conn = get_db()
    if event_type:
        rows = conn.execute("SELECT * FROM mentor_log WHERE event_type=? ORDER BY created_at DESC LIMIT ?", (event_type, limit)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM mentor_log ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/mentor-log/<int:lid>/respond', methods=['POST'])
def respond_to_log(lid):
    data = request.json
    conn = get_db()
    original = conn.execute("SELECT * FROM mentor_log WHERE id=?", (lid,)).fetchone()
    conn.close()
    if not original:
        return jsonify({"error": "Not found"}), 404
    add_mentor_log('user_correction',
                   f'Correction re: {original["event_type"]} — {original["summary"][:50]}',
                   data.get('response', ''),
                   original['entry_id'])
    return jsonify({"status": "ok"})


# ── System ─────────────────────────────────────────────────

@app.route('/api/system/stats', methods=['GET'])
def system_stats():
    conn = get_db()
    memory = load_memory()
    s = {
        "total_entries": conn.execute("SELECT COUNT(*) as c FROM entries").fetchone()['c'],
        "bugs": {
            "active": conn.execute("SELECT COUNT(*) as c FROM bugs WHERE status='active'").fetchone()['c'],
            "pending": conn.execute("SELECT COUNT(*) as c FROM bugs WHERE status='pending'").fetchone()['c'],
            "declining": conn.execute("SELECT COUNT(*) as c FROM bugs WHERE status='declining'").fetchone()['c'],
            "resolved": conn.execute("SELECT COUNT(*) as c FROM bugs WHERE status='resolved'").fetchone()['c'],
        },
        "goals": {
            "toward": conn.execute("SELECT COUNT(*) as c FROM goals WHERE direction='toward'").fetchone()['c'],
            "away": conn.execute("SELECT COUNT(*) as c FROM goals WHERE direction='away'").fetchone()['c'],
        },
        "priors_count": conn.execute("SELECT COUNT(*) as c FROM priors").fetchone()['c'],
        "experiments": {
            "assigned": conn.execute("SELECT COUNT(*) as c FROM behavioral_experiments WHERE status='assigned'").fetchone()['c'],
            "completed": conn.execute("SELECT COUNT(*) as c FROM behavioral_experiments WHERE status='completed'").fetchone()['c'],
        },
        "unanalyzed_docs": conn.execute("SELECT COUNT(*) as c FROM documents WHERE analysis_status='unanalyzed'").fetchone()['c'],
        "pending_log_items": conn.execute("SELECT COUNT(*) as c FROM mentor_log WHERE event_type IN ('bug_proposed','phase_proposed')").fetchone()['c'],
        "has_api_key": bool(API_KEY),
        "has_baseline": os.path.exists(BASELINE_PATH),
        "memory_entry_count": memory.get('entry_count', 0),
        "synthesis_count": memory.get('synthesis_count', 0),
    }
    lw = conn.execute("SELECT created_at FROM reports WHERE report_type='weekly' ORDER BY created_at DESC LIMIT 1").fetchone()
    lm = conn.execute("SELECT created_at FROM reports WHERE report_type='monthly' ORDER BY created_at DESC LIMIT 1").fetchone()
    s["last_weekly"] = lw['created_at'] if lw else None
    s["last_monthly"] = lm['created_at'] if lm else None
    conn.close()
    return jsonify(s)


@app.route('/api/system/model-summary', methods=['GET'])
def model_summary():
    if not client:
        return jsonify({"error": "No API key"}), 500
    memory = load_memory()
    bugs = get_active_bugs()
    priors = get_active_priors()
    phase = get_current_phase()

    prompt = f"""Generate a plain-language summary of what you currently believe about this person, based on {memory.get('entry_count',0)} journal entries.

Cover: core patterns, strongest defenses, key priors (with numbers), active bugs, current phase, and where you've been wrong (based on user corrections).

End with: "Where am I wrong?"

COMPRESSED MEMORY: {memory.get('compressed_memory','None yet.')}
ACTIVE BUGS: {json.dumps([{'name':b['name'],'fires':b['fire_count'],'status':b['status']} for b in bugs])}
PRIORS: {json.dumps([{'name':p['name'],'estimate':p['current_estimate'],'confidence':p['confidence']} for p in priors])}
PHASE: {phase['name'] + ': ' + phase['description'] if phase else 'None defined.'}

Write in second person. Direct. Under 500 words."""

    try:
        summary = call_anthropic(prompt, max_tokens=800)
    except Exception as e:
        return jsonify({"error": str(e)}), 502
    return jsonify({"summary": summary})


# ── Startup ────────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    migrate_db()
    for d in [ANALYSES_DIR, BACKUPS_DIR, BASELINES_DIR, DOCUMENTS_DIR]:
        os.makedirs(d, exist_ok=True)
    # Start background Apple Notes sync (pulls every 60s)
    import threading
    sync_thread = threading.Thread(target=background_notes_sync, daemon=True)
    sync_thread.start()
    print("\n  JOURNAL MENTOR — Dialectic System v3")
    print("  Running at http://localhost:5001")
    print("  [auto-sync] Apple Notes pull every 60s")
    if not API_KEY:
        print("  ⚠ WARNING: ANTHROPIC_JOURNAL_KEY not set!")
    print()
    app.run(host='127.0.0.1', port=5001, debug=False)
