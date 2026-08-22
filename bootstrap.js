const express = require('express');
const geminiRouter = require('./gemini-router');
const legacyApp = require('./legacy-server');

const app = express();

// Gemini is the sole upstream source for public football scores, fixtures,
// standings and football news. Search grounding is performed server-side.
app.use('/api', geminiRouter);

// Authentication, community, push and static-site behavior remains unchanged.
app.use(legacyApp);

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => console.log(`EthioLiveScores API online on port ${port}`));
}

module.exports = app;
