# EthioLiveScores - Community Football Platform

EthioLiveScores is a dual-language Ethiopian football live-score community application using PostgreSQL, Express, JWT authentication, live chat, standings, predictions, account personalization, and PWA installation support.

## International football (free source)

EthioLiveScores now supports an international-first score center covering the
English Premier League, La Liga, Bundesliga, Serie A and Ligue 1 using the
**documented TheSportsDB v1 free API**. To enable on Vercel, set:

```env
FOOTBALL_SOURCE=thesportsdb
```

No paid subscription or additional API key is needed for this development/web
integration. The app uses the public v1 key `123` provided in the official
TheSportsDB documentation.

**Limitations:** The free `eventsday` endpoint returns at most 3 matches for a
league/date, standings return the top 5 rows, and calls can be rate-limited.
These are partial, possibly delayed results, *not* real-time full match-day
coverage. The UI discloses those limitations and credits the source. The backend
uses a shared Supabase cache (`sports_provider_cache`) and local cache to avoid
wasting free requests.

Do not reuse unspecified TheSportsDB graphics or logos without checking the
relevant licence. The provider's terms restrict publishing applications to
app stores on the free plan; paid access and suitable media rights are required
for that release channel. See https://www.thesportsdb.com/docs_terms_of_use.php

The existing API-Football provider remains available when the source switch
is disabled, but its Free plan does not cover the current 2026 season. Do not
fall back to Gemini to invent unverified live scores.

## v2 React architecture

The frontend is now a component-based **React + Vite** application while the existing **Node.js + Express + PostgreSQL** backend remains the API layer. The app includes reusable components for the live match center, authentication, profile management, mobile navigation, favorites, notification preferences, predictions, and match-day chat.

## Account features

- Polished sign-in and registration flow with 7-day JWT sessions.
- Editable display name, username, and generated avatar seed.
- Favorite-team management.
- Notification preferences for goals, kickoff, half-time, full-time, red cards, and club news.
- Account-backed prediction voting and prediction history.
- Authenticated match-day chat with the existing ban filter.

For an existing database, run the migration:

```bash
psql "$DATABASE_URL" -f migrations/001_auth_profile.sql
```

For a fresh database, run:

```bash
psql "$DATABASE_URL" -f schema.sql
```

## Live football data (recommended)

A dedicated API-Football key is recommended for verified scores, fixtures and standings.
Get it from https://dashboard.api-football.com/ and add `API_FOOTBALL_KEY` in Vercel
**Production** environment variables. The backend uses the provider routes automatically
when the key is present. Without that key, the old Gemini provider is still used for
public football data and may fail with HTTP 429 if its quota is exhausted.

API-Football free has only 100 calls/day; the backend defaults to a 1-hour shared
cache across Vercel instances. This is suitable for testing, **not low-latency live
scores**. For a paid/higher-quota plan, set `API_FOOTBALL_CACHE_SECONDS=60` to
refresh in minutes. Competition-specific livescore coverage may vary.

With Supabase, use the **Transaction pooler** Postgres connection (usually port
6543), store it as `DATABASE_URL` in Vercel, and run migrations from the repository.
The shared cache is installed using `migrations/005_sports_provider_cache.sql`.
Keep all API keys out of Git and out of browser-accessible environment variables.

ChatGPT is not a replacement for a sports feed. OpenAI API with web search can
provide sourced football news/analysis in a future independent editorial pipeline;
it has separate API credentials and usage charges.

## Required Vercel environment variables

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=use-a-long-random-production-secret
```

## Local development

```bash
npm install
npm run dev
```

Vite runs the React development frontend and proxies `/api` to the Express server on port 5000. Production builds use `npm run build`, and Express serves the generated `dist` bundle.

## Health check

Visit `/api/health`. A working database returns `database: "connected"`. If `DATABASE_URL` is not configured, the public frontend remains available, but backend account features cannot work. The application does not invent or fabricate live match scores.
