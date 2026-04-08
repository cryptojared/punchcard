# Punchcard — Loyalty Cards for Local Businesses

**Concept:** QR-code-based digital loyalty cards for coffee shops, salons, bars, and local businesses.
**Problem solved:** Paper punch cards are a hassle. Digital loyalty requires apps nobody downloads.
**Solution:** Customers scan a QR code once, their card lives in their browser forever, staff taps to punch.
**Price:** $9/month per business

## Stack
- Next.js 16 (App Router, Tailwind CSS)
- Supabase (auth + PostgreSQL + RLS)
- Stripe (subscription billing — $9/mo)
- QR code generation (qrcode.react)

## Pages
- `/` — Landing page (warm amber theme, 30-day free trial CTA)
- `/auth` — Sign up / Sign in (email + Google OAuth)
- `/auth/callback` — OAuth redirect handler
- `/dashboard` — Business dashboard (create cards, punch, view QR codes, redeem)
- `/punch/[token]` — Public customer card page (punch + view progress)

## Database Tables
- `businesses` — business profiles, owner_id links to auth.users
- `cards` — loyalty cards with punch count, reward, QR token
- `punches` — visit log entries

## Key Functions
- `punch_card(p_card_id)` — RPC: decrements punches_remaining, logs punch, returns updated state

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
