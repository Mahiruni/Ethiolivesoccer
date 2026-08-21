const express = require('express');
const liveRouter = require('./live-router');
const legacyApp = require('./server');

const app = express();

// Public read-only football and newsroom routes are intentionally mounted
// before the legacy application so they work without PostgreSQL and can use
// the multi-competition provider pipeline. Auth/community/push/static routes
// continue to be served by the existing application unchanged.
app.use('/api', liveRouter);
app.use(legacyApp);

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => console.log(`EthioLiveScores API online on port ${port}`));
}

module.exports = app;
