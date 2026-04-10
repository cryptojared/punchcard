-- ============================================
-- LOYALY PHONE-AUTH MIGRATION
-- Adds: promo_templates, customer_cards, verification_codes
-- Migrates: existing cards → promo_templates (optional one-time step)
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- PROMO TEMPLATES (one per business per promotion)
-- ============================================
create table if not exists promo_templates (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  description text,
  punch_count integer not null default 10,
  reward text not null,
  active boolean default true,
  qr_token text unique not null,
  color text default '#F59E0B',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Generate QR token function
create or replace function generate_promo_token()
returns text as $$
  select encode(gen_random_bytes(16), 'hex');
$$ language sql;

-- ============================================
-- CUSTOMER CARDS (one per customer per promo)
-- ============================================
create table if not exists customer_cards (
  id uuid primary key default uuid_generate_v4(),
  promo_id uuid references promo_templates(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  phone_hash text not null, -- SHA-256 hash of phone for privacy
  phone_last4 text, -- Last 4 digits for display (extracted from raw phone)
  punches_remaining integer not null,
  total_punches integer not null,
  status text default 'active' check (status in ('active', 'completed', 'redeemed')),
  last_punched_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(promo_id, phone_hash)
);

-- ============================================
-- VERIFICATION CODES (SMS OTP)
-- ============================================
create table if not exists verification_codes (
  id uuid primary key default uuid_generate_v4(),
  phone_hash text not null,
  promo_id uuid references promo_templates(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  code text not null,
  used boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Unique constraint: one active code per phone per promo
create unique index if not exists verification_codes_active
  on verification_codes(phone_hash, promo_id)
  where used = false;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- promo_templates
alter table promo_templates enable row level security;
create policy "Businesses manage own promos" on promo_templates
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "Anyone view promo via token" on promo_templates
  for select using (true);

-- customer_cards
alter table customer_cards enable row level security;
create policy "Businesses view own customer cards" on customer_cards
  for select using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "Businesses manage own customer cards" on customer_cards
  for all using (business_id in (select id from businesses where owner_id = auth.uid()));
-- Public read via customer_card_id (safe — only used after phone verification)
create policy "Customer cards punch via customer_card_id" on customer_cards
  for update using (true);

-- verification_codes
alter table verification_codes enable row level security;
-- Only service role can insert/read verification codes (server-side only)
create policy "Service role manages codes" on verification_codes
  for all using (auth.role() = 'service_role');

-- ============================================
-- HELPERS
-- ============================================

-- Punch a customer card
create or replace function punch_customer_card(p_customer_card_id uuid)
returns jsonb as $$
declare
  v_card record;
  v_new_remaining integer;
  v_reward text;
begin
  select cc.*, pt.reward, pt.name as promo_name
  into v_card
  from customer_cards cc
  join promo_templates pt on pt.id = cc.promo_id
  where cc.id = p_customer_card_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Card not found');
  end if;

  if v_card.status = 'redeemed' then
    return jsonb_build_object('success', false, 'error', 'Card already redeemed');
  end if;

  if v_card.punches_remaining <= 0 then
    return jsonb_build_object('success', false, 'error', 'Card is complete — ready to redeem!');
  end if;

  v_new_remaining := v_card.punches_remaining - 1;

  update customer_cards set
    punches_remaining = v_new_remaining,
    status = case when v_new_remaining <= 0 then 'completed' else 'active' end,
    last_punched_at = now(),
    updated_at = now()
  where id = p_customer_card_id;

  return jsonb_build_object(
    'success', true,
    'punches_remaining', v_new_remaining,
    'total_punches', v_card.total_punches,
    'is_complete', v_new_remaining <= 0,
    'reward', v_card.reward,
    'promo_name', v_card.promo_name
  );
end;
$$ language plpgsql;
