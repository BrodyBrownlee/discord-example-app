# Discord Leaderboard Bot

A Discord bot with a live leaderboard scoring system. Players submit scores from an external game client; the bot tracks rankings in Supabase and announces results in a Discord channel. Includes slash commands for viewing the leaderboard directly in Discord, plus a hosted web leaderboard page.

Also includes a full set of standalone example files covering common Discord interaction patterns (buttons, modals, select menus, and a complete Rock-Paper-Scissors game).

## Project structure

```
discord-example-app/
│
├── src/                        Production source code
│   ├── api/
│   │   ├── app.js              Main Express server — all HTTP endpoints
│   │   └── README.md           API endpoint documentation
│   │
│   ├── commands/
│   │   ├── commands.js         Slash command definitions + Discord registration script
│   │   └── README.md           How to add and register commands
│   │
│   ├── database/
│   │   ├── db.js               Supabase client + score CRUD operations
│   │   └── README.md           Schema, functions, and setup notes
│   │
│   └── utils/
│       ├── utils.js            Discord API client + shared helpers
│       └── README.md           Function reference
│
├── examples/                   Standalone feature demonstrations (not production)
│   ├── app.js                  Complete Rock-Paper-Scissors game
│   ├── button.js               Button interaction example
│   ├── command.js              Slash command registration example
│   ├── modal.js                Modal form example
│   ├── selectMenu.js           String select menu example
│   └── README.md               Guide to the examples
│
├── game.js                     RPS game logic (used by examples/app.js)
├── assets/                     Images for documentation
├── .env.sample                 Required environment variable template
├── package.json
└── README.md                   ← You are here
```

## Quick start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A [Discord application](https://discord.com/developers/applications) with:
  - `applications.commands` scope
  - `bot` scope with **Send Messages** permission
- A [Supabase](https://supabase.com) project with a `scores` table (see [Database setup](#database-setup))

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.sample` to `.env` and fill in your values:

```
APP_ID                   Discord application ID
DISCORD_TOKEN            Bot token (keep secret)
PUBLIC_KEY               Discord public key (for request verification)
CHANNEL_ID               Channel where score announcements are posted
SCORE_SECRET             Random hex string used to sign score submissions
SUPABASE_URL             Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY  Supabase service role key (server-side only)
```

### 4. Register slash commands

```bash
npm run register
```

Global commands can take up to an hour to appear in Discord.

### 5. Start the server

```bash
npm start          # production
npm run dev        # development (auto-restarts on file changes)
```

The server listens on port `3000` by default (override with `PORT` env var).

### 6. Expose your local server

Discord needs a public HTTPS URL to deliver interactions. Use [ngrok](https://ngrok.com/) during development:

```bash
ngrok http 3000
```

Copy the `https://...ngrok.io` URL, then in your Discord app settings set:

**Interactions Endpoint URL** → `https://your-ngrok-url.ngrok.io/interactions`

## Database setup

Create a `scores` table in your Supabase project:

```sql
CREATE TABLE scores (
  id         serial  PRIMARY KEY,
  player     text    NOT NULL,
  time       integer NOT NULL,
  created_at bigint  NOT NULL
);
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/interactions` | Discord webhook — handles slash commands |
| `GET` | `/leaderboard` | Rendered HTML leaderboard page |
| `POST` | `/score` | Score submission from game client |

## Slash commands

| Command | Description | Availability |
|---|---|---|
| `/test` | Returns a random emoji | Everywhere |
| `/leaderboard` | Shows the top 10 scores | Guild channels only |

## Score submission

The game client must `POST /score` with a valid HMAC-SHA256 signature to submit a score. The signature covers `"player:timeMs:timestamp"` using `SCORE_SECRET`.

```json
{
  "player": "PlayerName",
  "timeMs": 65321,
  "timestamp": 1700000000000,
  "signature": "<hmac-sha256-hex>"
}
```

Security measures: rate limiting (10/min/IP), timestamp replay prevention (±30s window), and HMAC signature verification.

## Further reading

- [Discord Developer Documentation](https://discord.com/developers/docs/intro)
- [Discord Developers server](https://discord.gg/discord-developers)
- [`examples/`](./examples/README.md) — feature-specific code samples
- [`src/api/`](./src/api/README.md) — endpoint details
- [`src/database/`](./src/database/README.md) — database schema and functions
