const express = require('express');
const geminiRouter = require('./gemini-router');
const internationalRouter = require('./international-router');
const legacyApp = require('./legacy-server');

const app = express();

// International football is the default product direction when selected in
// deployment settings. TheSportsDB's documented free v1 API needs no secret.
// Route these requests before the legacy Ethiopian API-Football/Gemini handlers.
if (process.env.FOOTBALL_SOURCE === 'thesportsdb') app.use('/api', internationalRouter);

// Prefer the dedicated sports data feed for scores and standings when its
// server-side key is set. These existing Express routes return provider fixture
// IDs and database-local match IDs, enabling predictions and match-day chat.
// Never treat a generative model's search results as authoritative live scores.
const sportsProviderEnabled = Boolean(process.env.API_FOOTBALL_KEY);
const sportsPaths = new Set([
  '/api/provider/status', '/api/matches', '/api/standings', '/api/teams'
]);
app.use((req, res, next) => {
  const providerDetails = /^\/api\/match\/p-\d+\/details$/.test(req.path);
  if (sportsProviderEnabled && (sportsPaths.has(req.path) || providerDetails)) {
    return legacyApp(req, res, next);
  }
  return next();
});

// The existing Gemini-backed routes remain available for editorial/news
// research and static competition catalog, but not the primary scoreboard
// when an authoritative sports provider is configured.
app.use('/api', geminiRouter);

// Auth, community, push notifications, and SPA serving.
app.use(legacyApp);

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => console.log(`EthioLiveScores API online on port ${port}`));
}

module.exports = app;
