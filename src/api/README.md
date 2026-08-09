# API — `src/api/app.js`

The main Express server. This is the entry point for the application (`npm start`).

## Endpoints

### `POST /interactions`
Discord's webhook endpoint. All slash command events are delivered here.

Discord requires a response within **3 seconds**. For the `/leaderboard` command, the handler sends an immediate `DEFERRED` response (shows a loading spinner in Discord) and then edits the message once the database query finishes.

**Security:** `verifyKeyMiddleware` validates Discord's Ed25519 request signature on every incoming request — unsigned or tampered requests are rejected before the handler runs.

| Command | Behaviour |
|---|---|
| `/test` | Replies with a random emoji message |
| `/leaderboard` | Defers, fetches top 10 from DB, edits reply |

### `GET /leaderboard`
Serves a static HTML page showing the top 10 scores in a Discord-themed dark UI. Player names are HTML-escaped before insertion to prevent XSS.

### `POST /score`
Accepts game score submissions from the game client. Protected by four security layers applied in order:

1. **Rate limit** — max 10 requests per IP per minute
2. **Body validation** — rejects malformed or missing fields
3. **Timestamp check** — rejects payloads older than ±30 seconds (replay attack prevention)
4. **HMAC-SHA256 signature** — verifies the client knows `SCORE_SECRET` and that no fields were tampered with

Expected body:
```json
{ "player": "string", "timeMs": 12345, "timestamp": 1700000000000, "signature": "hex" }
```

## Key functions

| Function | Purpose |
|---|---|
| `escapeHtml(str)` | Sanitizes strings for safe HTML output |
| `verifyScoreSignature(...)` | HMAC-SHA256 signature validation |
| `postNewScore(player, timeMs)` | Posts a score announcement to Discord channel |
