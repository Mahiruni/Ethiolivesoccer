'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// Exercise the production-safe behavior with deliberately missing credentials.
// No network calls to external football providers or databases are made.
for (const key of ['JWT_SECRET', 'DATABASE_URL', 'GEMINI_API_KEY', 'API_FOOTBALL_KEY']) delete process.env[key];
process.env.NODE_ENV = 'production';

const app = require('../bootstrap');

test('production configuration and degraded-provider smoke checks', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())));
  const origin = `http://127.0.0.1:${server.address().port}`;

  await t.test('health is not falsely marked ready without DB and secure JWT', async () => {
    const response = await fetch(origin + '/api/health');
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.ok, false);
    assert.equal(result.database, 'not-configured');
    assert.equal(result.authentication, 'not-configured');
  });

  await t.test('registration fails closed when the production signing secret is missing', async () => {
    const response = await fetch(origin + '/api/auth/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'fan', email: 'fan@example.com', password: 'strongpassword123' })
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /authentication/i);
  });

  await t.test('login fails closed when the production signing secret is missing', async () => {
    const response = await fetch(origin + '/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'fan@example.com', password: 'strongpassword123' })
    });
    assert.equal(response.status, 503);
  });

  await t.test('missing Gemini credentials do not return invented football results', async () => {
    const response = await fetch(origin + '/api/matches?date=2026-10-31');
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.configured, false);
    assert.equal(result.live, false);
  });

  await t.test('provider health is explicitly unknown until a successful fetch', async () => {
    const response = await fetch(origin + '/api/provider/status');
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.configured, false);
    assert.equal(result.healthy, null);
    assert.equal(result.authoritativeSportsFeed, false);
  });
});
