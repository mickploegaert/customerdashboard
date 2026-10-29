# MK Studios Dashboard

Lead finder + CRM for MK Studios. Find businesses without a (good) website, score them 0–100, and follow them up.

## Starten

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app starts in **Demo Mode** with 30 fictional businesses. No API keys needed.

## Logo

Place the brand file at `public/MK.png` (already present).

## Environment variables

Copy `.env.example` to `.env.local`. Server-only keys (without `NEXT_PUBLIC_`) never reach the browser.

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | `true` = fictional data. Set to `false` for live search. |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth + database |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes of shared business data |
| `GOOGLE_PLACES_API_KEY` | Live business search |
| `PAGESPEED_API_KEY` | Extra performance metrics in the website analyzer |
| `OPENAI_API_KEY` | AI lead analysis + suggested email |

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Enable Email auth.
4. Put the URL, anon key and service role key in `.env.local`.
5. Set `NEXT_PUBLIC_DEMO_MODE=false`.

## Project structure

```
src/
  app/                    Pages + API routes
  components/             UI, layout, leads, map, dashboard, search
  lib/
    scoring.ts            Lead score 0–100 (weights in Settings)
    providers/            Google Places, website analyzer, maps, OpenAI
    store/                CRM state (localStorage or Supabase)
    supabase/             Client, server, RLS mappers
```
