'use strict';
const express = require('express');
const router = express.Router();
const sources = Object.freeze({
  fixtures: { endpoint: '/api/matches', note: 'Licensed or permitted provider data; check freshness before publishing.' },
  standings: { endpoint: '/api/standings', note: 'Provider-derived standings; not independently verified by FETAN.' },
  news: { endpoint: '/api/news', note: 'Editorial articles must be attributed and independently checked.' }
});
// FETAN owns this API contract, not the underlying third-party match facts.
router.get('/football/source-policy', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ platform: 'FETAN', model: 'hybrid', dataOwnership: 'FETAN owns its original editorial content, user preferences and database schema, not third-party feeds.', sources, liveScoresGuaranteed: false, updatedAt: null });
});
router.get('/football/notification-types', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ types: ['kickoff','goal','full_time','breaking_news'], delivery: 'opt-in', note: 'Availability depends on push credentials, subscriptions, verified events and dispatch configuration.' });
});
module.exports = router;
