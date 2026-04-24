-- IPO alert system schema
-- Run against a fresh Supabase project (SQL Editor or `supabase db push`).

create extension if not exists "pgcrypto";

-- channels: one row per Telegram destination, each with its own filter config.
create table if not exists channels (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  telegram_chat_id text not null,
  is_active        boolean not null default true,
  sectors          text[] not null default '{}',          -- ['*'] = match any
  min_raise_usd    bigint not null default 0,
  geographies      text[] not null default '{}',          -- US, HK, LSE, EU, CA, JP, AU
  stages           text[] not null default '{filed,priced}',
  excludes         text[] not null default '{}',          -- spac, bdc
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists channels_is_active_idx on channels (is_active);

-- ipos: one row per unique ticker we've seen.
create table if not exists ipos (
  ticker                    text primary key,
  company_name              text not null,
  exchange                  text,                         -- NASDAQ, NYSE, HKEX, LSE, etc.
  stage                     text not null,                -- filed | priced
  sectors                   text[] not null default '{}',
  deal_size_usd             bigint,
  price_low                 numeric,
  price_high                numeric,
  shares_offered            bigint,
  expected_date             date,
  business_description      text,
  source                    text not null,                -- finnhub | edgar
  source_url                text,
  is_spac                   boolean not null default false,
  classification_confidence numeric,                      -- 0..1
  first_seen_at             timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists ipos_first_seen_idx on ipos (first_seen_at desc);
create index if not exists ipos_stage_idx on ipos (stage);

-- alerts: fan-out record. UNIQUE(ipo_ticker, channel_id) dedups across retries.
create table if not exists alerts (
  id                  uuid primary key default gen_random_uuid(),
  ipo_ticker          text not null references ipos(ticker) on delete cascade,
  channel_id          uuid not null references channels(id) on delete cascade,
  telegram_message_id bigint,
  sent_at             timestamptz not null default now(),
  unique (ipo_ticker, channel_id)
);

create index if not exists alerts_channel_sent_idx on alerts (channel_id, sent_at desc);
create index if not exists alerts_sent_idx on alerts (sent_at desc);

-- sources_log: per-source audit row per scan.
create table if not exists sources_log (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,
  items_fetched  integer not null default 0,
  error          text,
  scanned_at     timestamptz not null default now()
);

create index if not exists sources_log_scanned_idx on sources_log (scanned_at desc);

-- Keep updated_at honest.
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists channels_set_updated_at on channels;
create trigger channels_set_updated_at before update on channels
  for each row execute function set_updated_at();

drop trigger if exists ipos_set_updated_at on ipos;
create trigger ipos_set_updated_at before update on ipos
  for each row execute function set_updated_at();

-- Seed: four starter channels. Replace telegram_chat_id after creating the bot.
insert into channels (name, telegram_chat_id, sectors, min_raise_usd, geographies, stages, excludes) values
  ('@biotech-ipos',        'REPLACE_ME', array['biotech','diagnostics','oncology','rare-disease','metabolic'],  50000000, array['US'],               array['filed','priced'], array['spac']),
  ('@defense-ipos',        'REPLACE_ME', array['defense','cuas','aerospace','dual-use','space'],                30000000, array['US','LSE','EU'],    array['filed','priced'], array['spac']),
  ('@ai-hardtech',         'REPLACE_ME', array['ai-infra','semis','quantum','robotics'],                       100000000, array['US','HK','LSE'],    array['priced'],         array['spac']),
  ('@all-ipos-firehose',   'REPLACE_ME', array['*'],                                                            75000000, array['US'],               array['priced'],         array['spac','bdc'])
on conflict do nothing;
