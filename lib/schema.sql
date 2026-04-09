-- Loyaly Database Schema
-- Supabase PostgreSQL

create extension if not exists "uuid-ossp";

-- ============================================
-- BUSINESSES
-- ============================================
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  email text unique not null,
  owner_id uuid references auth.users(id) on delete cascade,
  plan text default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  logo_url text,
  color text default '#F59E0B',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- LOYALTY CARDS
-- ============================================
create table cards (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  description text,
  punch_count integer not null default 10,
  punches_remaining integer not null default 10,
  reward text not null,
  active boolean default true,
  qr_token text unique not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text default 'active' check (status in ('active', 'completed', 'redeemed', 'expired')),
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PUNCHES (visit log)
-- ============================================
create table punches (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid references cards(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  punched_at timestamptz default now(),
  note text
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table businesses enable row level security;
create policy "Businesses view own" on businesses for select using (owner_id = auth.uid());
create policy "Businesses manage own" on businesses for all using (owner_id = auth.uid());

alter table cards enable row level security;
create policy "Businesses view own cards" on cards for select using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "Businesses manage own cards" on cards for all using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "Anyone punch via token" on cards for update using (true);

alter table punches enable row level security;
create policy "Businesses view own punches" on punches for select using (business_id in (select id from businesses where owner_id = auth.uid()));
create policy "Punches created freely" on punches for insert with check (true);

-- ============================================
-- HELPERS
-- ============================================
create or replace function generate_card_token()
returns text as $$
  select encode(gen_random_bytes(16), 'hex');
$$ language sql;

create or replace function punch_card(p_card_id uuid)
returns jsonb as $$
declare
  v_card record;
  v_new_punches integer;
  v_punch_id uuid;
begin
  select * into v_card from cards where id = p_card_id and active = true and status = 'active';
  
  if not found then
    return jsonb_build_object('success', false, 'error', 'Card not found or inactive');
  end if;
  
  if v_card.punches_remaining <= 0 then
    return jsonb_build_object('success', false, 'error', 'Card is full — ready to redeem!');
  end if;
  
  insert into punches (card_id, business_id) values (p_card_id, v_card.business_id)
  returning id into v_punch_id;
  
  v_new_punches := v_card.punches_remaining - 1;
  
  update cards set
    punches_remaining = v_new_punches,
    status = case when v_new_punches <= 0 then 'completed' else 'active' end,
    updated_at = now()
  where id = p_card_id;
  
  return jsonb_build_object(
    'success', true,
    'punches_remaining', v_new_punches,
    'total_punches', v_card.punch_count,
    'is_complete', v_new_punches <= 0,
    'reward', v_card.reward
  );
end;
$$ language plpgsql;
