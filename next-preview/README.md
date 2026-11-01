# EthioLiveScores — Next.js 16 migration preview

This is a **separate, non-production Next.js App Router workstream** in the existing GitHub repository.
The production Vite/Express app remains untouched until auth, accounts, favorites,
predictions, push, and match chat have been migrated and tested.

## Stack
- Next.js 16.4.3 (stable), React 19, TypeScript, App Router
- Existing-account JWT/bcrypt sign-in, registration, profile, favorites and notification preferences API parity
- Supabase-linked prediction history, poll voting and match chat routes (staging verification pending)
- Playwright viewport checks at 360, 390, 430, tablet and desktop widths
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

The Next.js preview contains account/community **code**, but they are NOT yet
production-verified. Live sign-in, favorites, poll/chat authorization and user
isolation must be tested with real staging credentials, never production secrets
in CI logs. Push subscription and delivery routes remain outstanding. An abuse-
resistant rate limiter, account recovery and full session security audit remain
release blockers. The new PostgreSQL connections require trusted TLS certificates;
never disable certificate verification as a shortcut.

No scores are fabricated. No app-store rights are implied by the free sports API.

## Production release checklist

- [x] Next.js isolated from the working Vite/Express production app
- [x] App Router public routes, league pages, match details and accessible UX
- [x] Node build and HTTP smoke checks
- [ ] Playwright screenshots and all five viewport tests green
- [ ] Verify existing accounts/login/register/profile/favorites in staging
- [ ] Verify per-user authorization, predictions/chat and abuse protection
- [ ] Add and verify web-push subscription, unsubscribe and background delivery
- [ ] Restore production news/article SEO routes and bilingual content
- [ ] Performance budgets measured on representative Android devices
- [ ] Test rollback and cutover from existing Vite/Express deployment
- [ ] Only then release reviewed Next.js code to current Vercel project


## Authentic club and league logos — rights-gated release

The match center, detailed match page, league selector and standings are wired to use
TheSportsDB's stable team and competition IDs. The reusable FootballLogo component
renders approved badge artwork with next/image, proper aspect ratios and neutral fallback.

Third-party trademarks require individual legal permission or another applicable legal basis.
Receiving image URLs through the free data API does not by itself clear third-party rights.
See https://www.thesportsdb.com/docs_terms_of_use.php . Free-tier rights also exclude
app-store publication.

Run the Football artwork rights audit GitHub Action to generate a JSON candidate inventory
with immutable provider ID, asset URL, source and blank permission fields. The pipeline
never downloads artwork, asserts ownership or marks assets approved automatically.

Once documentary evidence is reviewed, record exact asset, licensing, attribution and
permission reference inside lib/sports-identity.ts in APPROVED_ARTWORK.
Approved club crests and league logos will then appear automatically by immutable
provider ID across fixtures, standings, league pills and match details.

GET /api/assets/coverage reports the count of verified, reviewed image assets.
English, Spanish, German, Italian and French national flags are displayed independently
of third-party club and league trademarks.
