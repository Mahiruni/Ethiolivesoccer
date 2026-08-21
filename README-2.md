# EthioLiveScores - Complete Community Football Platform

This repository contains the complete production-ready source code for **EthioLiveScores**, an optimized live score portal, interactive poll system, and real-time chat room platform tailored specifically for the Ethiopian football community.

## ðŸ“ System Architecture & Components
1. **`schema.sql`**: Comprehensive PostgreSQL relational database layout with native support for dual English/Amharic data columns and automated view computation triggers for league standings.
2. **`server.js`**: Robust Node.js backend layer running Express API routing, bcrypt password encryption, secure token-based user authentication (JWT), and analytics event triggers.
3. **`index.html`**: Premium multi-threaded responsive web viewport utility packed with Tailwind CSS design paradigms, custom local ad integration networks, live polling utilities, and real-time interval messaging updates.
4. **`manifest.json`**: Standard PWA parameters configuration enabling smooth progressive smartphone desktop icon extraction installations.

## ðŸš€ Local Deployment Lifecycle Setup
1. **Database Layer Initialization**: Run `psql -U your_user -d your_db -f schema.sql` inside your target database instance.
2. **Backend Spin-Up**: Run `npm install express pg cors bcryptjs jsonwebtoken dotenv` and configure your cloud connection variables inside an explicit environmental `.env` context block. Execute the process runner using `node server.js`.
3. **App Exposure Launch**: Host your dynamic static frontend file (`index.html`) on lightweight CDNs like Netlify or Vercel and map resource endpoints securely to your backend API cluster.
