// EthioLiveScores Backend Server
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || 'ethio_secret_key';

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Access denied.' });
    try {
        const cleanToken = token.split(" ")[1];
        req.user = jwt.verify(cleanToken, JWT_SECRET);
        next();
    } catch (err) { res.status(400).json({ error: 'Invalid token.' }); }
};

app.get('/api/matches', async (req, res) => {
    const { rows } = await pool.query('SELECT m.*, t1.name_en AS home_en, t2.name_en AS away_en FROM matches m JOIN teams t1 ON m.home_team_id = t1.id JOIN teams t2 ON m.away_team_id = t2.id');
    res.json(rows);
});

app.get('/api/standings', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM league_standings');
    res.json(rows);
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const seed = username.toLowerCase().replace(/\s+/g, '-');
    const { rows } = await pool.query('INSERT INTO users (username, email, password_hash, avatar_seed) VALUES ($1, $2, $3, $4) RETURNING id, username', [username, email, hash, seed]);
    res.status(201).json(rows);
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if(rows.length === 0 || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(400).json({error: 'Invalid credentials'});
    const token = jwt.sign({ userId: rows[0].id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { username: rows[0].username, seed: rows[0].avatar_seed } });
});

app.get('/api/chat/:matchId', async (req, res) => {
    const { rows } = await pool.query('SELECT m.*, u.username FROM live_chat_messages m JOIN users u ON m.user_id = u.id WHERE m.match_id = $1 ORDER BY m.created_at DESC LIMIT 30', [req.params.matchId]);
    res.json(rows.reverse());
});

app.post('/api/chat/:matchId', verifyToken, async (req, res) => {
    await pool.query('INSERT INTO live_chat_messages (match_id, user_id, message_text) VALUES ($1, $2, $3)', [req.params.matchId, req.user.userId, req.body.message_text]);
    res.sendStatus(201);
});

app.listen(5000, () => console.log('Server online on port 5000'));
