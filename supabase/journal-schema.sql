-- Journal Mentor System — Database Schema
-- Run this in the Supabase SQL Editor

-- Table: journal_entries
-- Stores each journal entry and its AI analysis
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number INTEGER NOT NULL,
  entry_text TEXT NOT NULL,
  analysis TEXT,
  memory_update TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journal_entries_number ON journal_entries(entry_number DESC);
CREATE INDEX idx_journal_entries_created ON journal_entries(created_at DESC);

-- Table: journal_memory
-- Persistent memory that accumulates across entries
CREATE TABLE journal_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_count INTEGER DEFAULT 0,
  accumulated_memory TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial memory row
INSERT INTO journal_memory (entry_count, accumulated_memory)
VALUES (0, '');
