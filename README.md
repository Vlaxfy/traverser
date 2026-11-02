# Traverser

Online 3D obby races. Zero dependencies: Node 18+, one `server.js`, one `public/index.html`. The 3D engine is built into the page, so nothing downloads from other sites.

## Run locally
```
node server.js
```
Open http://localhost:3000

## Deploy on Render (same as High Flip)
1. Put these files in a **new GitHub repo** (`server.js`, `package.json`, `README.md`, `public/index.html`).
2. Render → New → Web Service → pick the repo.
3. Runtime: Node · Build command: `npm install` (or blank) · Start command: `node server.js`
4. Environment variables:
   - `ADMIN_KEY`: your admin password (for chat commands)
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: so players and coins survive restarts. You can reuse the same Upstash database as High Flip; Traverser saves under its own key (`traverser:db`), so the two never clash.

## How it works
- Live rounds: lobby island (12s), countdown (4s), race, results (6s), then back to the lobby.
- Join any time. If a race is running with players in it you spectate until the next round; if nobody is playing you go straight in.
- 24 courses built from 13 obstacle types. Edit `TVNAMES`, `TVPOOL` and `TVREW` in server.js to add maps or change coin rewards.
- Ocean around every course; falling in sends you back to the start.
- Push with 1 (must be touching; server double-checks distance). Speed/teleport cheats and impossibly fast finishes earn nothing.
- Coins for finishing (1st 3x, 2nd 2x, 3rd 1.5x), saved per player. Ready for a shop later.
- In-game chat with a bad-word filter and auto timeouts.

## Admin (type in the in-game chat)
- `/login YOURKEY` first (uses ADMIN_KEY)
- `/ann message` · `/kick name` · `/mute name 10` · `/unmute name` · `/give name 50` · `/skip` (end the race or skip the lobby wait)
