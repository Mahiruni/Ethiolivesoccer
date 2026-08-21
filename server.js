// EthioLiveScores Backend Server — Vercel + local compatible
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '64kb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'ethio_secret_key';
let pool;

function getPool() {
    if (!process.env.DATABASE_URL) return null;
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : undefined,
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });
    }
    return pool;
}

function requireDatabase(req, res, next) {
    const db = getPool();
    if (!db) {
        return res.status(503).json({
            error: 'Database is not configured.',
            action: 'Add DATABASE_URL in Vercel Project Settings → Environment Variables.'
        });
    }
    req.db = db;
    next();
}

function asyncRoute(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

const verifyToken = (req, res, next) => {
    const auth = req.header('Authorization') || '';
    const [scheme, token] = auth.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Access denied.' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

// Health endpoint never crashes the whole deployment when the DB is missing.
app.get('/api/health', asyncRoute(async (req, res) => {
    const db = getPool();
    if (!db) {
        return res.status(503).json({
            ok: false,
            service: 'EthioLiveScores API',
            database: 'not-configured'
        });
    }

    await db.query('SELECT 1');
    res.json({ ok: true, service: 'EthioLiveScores API', database: 'connected' });
}));

app.get('/api/matches', requireDatabase, asyncRoute(async (req, res) => {
    const { rows } = await req.db.query(`
        SELECT m.*,
               t1.name_en AS home_en,
               t1.name_am AS home_am,
               t2.name_en AS away_en,
               t2.name_am AS away_am
        FROM matches m
        JOIN teams t1 ON m.home_team_id = t1.id
        JOIN teams t2 ON m.away_team_id = t2.id
        ORDER BY m.match_date ASC
    `);
    res.json(rows);
}));

app.get('/api/standings', requireDatabase, asyncRoute(async (req, res) => {
    const { rows } = await req.db.query('SELECT * FROM league_standings');
    res.json(rows);
}));

app.post('/api/auth/register', requireDatabase, asyncRoute(async (req, res) => {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email and password are required.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const seed = username.toLowerCase().trim().replace(/\s+/g, '-');
    const { rows } = await req.db.query(
        'INSERT INTO users (username, email, password_hash, avatar_seed) VALUES ($1, $2, $3, $4) RETURNING id, username, avatar_seed',
        [username.trim(), email.trim().toLowerCase(), hash, seed]
    );
    res.status(201).json(rows[0]);
}));

app.post('/api/auth/login', requireDatabase, asyncRoute(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required.' });
    }

    const { rows } = await req.db.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password_hash))) {
        return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: rows[0].id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
        token,
        user: { username: rows[0].username, seed: rows[0].avatar_seed }
    });
}));

app.get('/api/chat/:matchId', requireDatabase, asyncRoute(async (req, res) => {
    const { rows } = await req.db.query(
        `SELECT m.*, u.username, u.avatar_seed
         FROM live_chat_messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.match_id = $1
         ORDER BY m.created_at DESC
         LIMIT 30`,
        [req.params.matchId]
    );
    res.json(rows.reverse());
}));

app.post('/api/chat/:matchId', verifyToken, requireDatabase, asyncRoute(async (req, res) => {
    const message = String(req.body?.message_text || '').trim();
    if (!message) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (message.length > 280) return res.status(400).json({ error: 'Message is limited to 280 characters.' });

    const banned = await req.db.query(
        'SELECT 1 FROM banned_users WHERE banned_user_id = $1 LIMIT 1',
        [req.user.userId]
    );
    if (banned.rowCount) return res.status(403).json({ error: 'This account is banned from chat.' });

    await req.db.query(
        'INSERT INTO live_chat_messages (match_id, user_id, message_text) VALUES ($1, $2, $3)',
        [req.params.matchId, req.user.userId, message]
    );
    res.sendStatus(201);
}));

// Serve the frontend through the same Express deployment so Vercel has one stable entrypoint.
app.get('/manifest.json', (req, res) => {
    res.type('application/manifest+json').sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.type('application/javascript').sendFile(path.join(__dirname, 'sw.js'));
});

app.get('/', (req, res) => {
    res.type('html').sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found.' });
    }
    return res.type('html').sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('EthioLiveScores request error:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({
        error: 'Internal server error.',
        detail: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
});

// Local development only. Vercel imports the exported Express app instead.
if (require.main === module) {
    const port = Number(process.env.PORT || 5000);
    app.listen(port, () => console.log(`EthioLiveScores online on port ${port}`));
}

module.exports = app;
