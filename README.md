# EthioLiveScores - Community Football Platform

EthioLiveScores is a dual-language Ethiopian football live-score community application using PostgreSQL, Express, JWT authentication, live chat, standings, and PWA installation support.

## Vercel deployment fix

This version is Vercel-compatible:

- `package.json` declares all Node.js dependencies so Vercel can install them.
- `server.js` exports the Express app instead of starting a permanent server in Vercel.
- The frontend uses same-origin `/api` requests instead of `http://localhost:5000/api`.
- Database failures return API errors instead of crashing the whole deployment.
- `vercel.json` includes frontend/PWA files in the Express function bundle.
- `sw.js` enables basic PWA caching without caching live API responses.

## Required Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=use-a-long-random-production-secret
```

Apply them to **Production** and redeploy.

## Database setup

Run:

```bash
psql -U your_user -d your_db -f schema.sql
```

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5000`.

## Health check

After deployment, visit:

```text
https://YOUR-DOMAIN.vercel.app/api/health
```

A working database returns `database: "connected"`. If `DATABASE_URL` has not been configured, the endpoint returns a controlled 503 response while the frontend remains online.
