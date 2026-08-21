const express = require('express');
const liveRouter = require('./live-router');
const legacyApp = require('./legacy-server');

const app = express();

// Public read-only football and newsroom routes are mounted first. They work
// without PostgreSQL and use the multi-competition live data pipeline.
app.use('/api', liveRouter);

// Existing authentication, community, push and static-site behavior remains
// unchanged behind the public data layer.
app.use(legacyApp);

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => console.log(`EthioLiveScores API online on port ${port}`));
}

module.exports = app;
