# EthioLiveScores - Community Football Platform

EthioLiveScores is a dual-language Ethiopian football live-score community application using PostgreSQL, Express, JWT authentication, live chat, standings, predictions, account personalization, and PWA installation support.

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

Visit `/api/health`. A working database returns `database: "connected"`. If `DATABASE_URL` is not configured, the public frontend still loads with demo score data while database-backed account features remain unavailable.
