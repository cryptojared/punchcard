# Loyaly — Loyalty Cards for Local Businesses

**Concept:** QR-code-based digital loyalty cards for coffee shops, salons, bars, and local businesses.
**Problem solved:** Paper punch cards are a hassle. Digital loyalty requires apps nobody downloads.
**Solution:** Customers scan QR → enter phone → get SMS code → card created. One QR code per promotion, customers auto-recognized on return.
**Price:** $29.99/month per business (includes Twilio SMS)

## Stack
- Next.js 16 (App Router, Tailwind CSS)
- Supabase (auth + PostgreSQL + RLS)
- Stripe (subscription billing — $29.99/mo, 30-day free trial)
- Twilio (SMS verification codes)
- QR code generation (qrcode.react)

## Pages
- `/` — Landing page (warm amber theme, 30-day free trial CTA)
- `/auth` — Sign up / Sign in (email + Google OAuth)
- `/auth/callback` — OAuth redirect handler
- `/dashboard` — Business dashboard (create promos, view QR codes, punch/redeem customers)
- `/punch/[token]` — Public customer card page (phone verify → card view → punch)

## Database Tables
- `businesses` — business profiles, owner_id links to auth.users
- `promo_templates` — one QR/promotion per business (name, punch_count, reward, qr_token)
- `customer_cards` — one per customer per promo (phone_hash, punches_remaining, status)
- `verification_codes` — SMS OTP codes (phone_hash, code, expires_at)

## Key Functions
- `punch_customer_card(p_customer_card_id)` — RPC: decrements punches_remaining, returns updated state
- `createPromo()` — dashboard: creates promo_templates row with auto-generated qr_token
- `/api/sms/send-code` — sends 4-digit OTP via Twilio
- `/api/sms/verify-code` — verifies OTP, creates/returns customer_card
- `/api/punch-customer` — calls punch_customer_card RPC

## Setup Steps
1. Create Supabase project → run `lib/schema.sql` in SQL Editor
2. Enable Google OAuth in Supabase Auth settings
3. Copy `.env.example` → `.env.local` with real Supabase keys
4. Create Stripe account → add keys → implement billing
5. Deploy to Vercel → set env vars
6. Set `NEXT_PUBLIC_APP_URL` to production URL

## Jared's Preferences
- "Made for a dummy" UI — simple, conversational, intuitive
- No domain references in marketing until live
- Build functional core first, add features second
