# FactoryTwin AI

AI-native manufacturing & digital twin intelligence. Next.js 15 · TypeScript · Tailwind · Supabase (Auth, Postgres, Storage, RLS) · Google Gemini.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in values.
3. In Supabase, run `supabase/migrations/0001_schema.sql` (SQL editor or `supabase db push`). Enable email auth; set Site URL and add `<site>/auth/callback` as a redirect URL.
4. `npm run dev`

## Environment
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: adding team members, verified subscription updates |
| `GEMINI_API_KEY` (`GEMINI_MODEL` optional) | Server only: Copilot and AI agents |
| `PROFESSIONAL_PAYMENT_LINK`, `ENTERPRISE_PAYMENT_LINK` | External payment links ($57 / $97 per month) |
| `PLATFORM_ADMIN_EMAILS` | Comma-separated emails allowed to set subscriptions on Usage & Billing |

## Design principles
- KPIs and simulation are deterministic (`src/lib/metrics.ts`, `src/lib/simulation.ts`, unit-tested); Gemini only interprets/explains.
- No fabricated data: empty states until the organization uploads records; unconnected integrations are labelled Coming Soon.
- Multi-tenancy via Row Level Security on every org-owned table; roles mirrored in `src/lib/permissions.ts`.
- Plan limits are configured centrally in `src/lib/plans.ts` and enforced server-side (none set by default).

Scripts: `npm run dev | build | lint | test`.
