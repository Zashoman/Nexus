-- Phase B: research fields populated by Claude with web search.
-- Idempotent — safe to re-run.

alter table ipos add column if not exists website_url text;
alter table ipos add column if not exists revenue_usd bigint;
alter table ipos add column if not exists net_income_usd bigint;
alter table ipos add column if not exists pe_ratio numeric;
