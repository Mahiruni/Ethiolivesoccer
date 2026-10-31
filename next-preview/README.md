# EthioLiveScores — Next.js 16 migration preview

This is a **separate, non-production Next.js App Router workstream** in the existing GitHub repository.
The production Vite/Express app remains untouched until auth, accounts, favorites,
predictions, push, and match chat have been migrated and tested.

## Stack
- Next.js 16.4.3 (stable), React 19, TypeScript, App Router
- Server-rendered SEO metadata for leagues and match-detail routes
- React client score center, responsive premium midnight/lime interface
- Documented TheSportsDB free provider; 3 daily fixture rows and 5 table entries per league
- Optional shared PostgreSQL provider cache via the existing Supabase schema

## Build and test
```bash
cd next-preview
npm install
npm test
npm run build
```

## Critical release gate
**Do not change Vercel's production root directory or merge this migration into
the production app.** A full cutover requires auth/session, community, push, route,
PWA and performance parity, then staging/preview E2E testing and an explicit release.

This migration preview does NOT yet enable production auth, push subscriptions,
community chat, or favorites. No sports scores are fabricated. No app-store rights
are implied by TheSportsDB free API.
