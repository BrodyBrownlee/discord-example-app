import 'dotenv/config';
import { createHmac, timingSafeEqual } from 'crypto';
import express from 'express';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import rateLimit from 'express-rate-limit';

import { addScore, getTopScores, getRank, formatTime } from '../database/db.js';
import { getRandomEmoji, DiscordRequest } from '../utils/utils.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiter applied to POST /score: max 10 submissions per IP per minute.
// Prevents flooding the leaderboard and reduces the blast radius of a leaked SCORE_SECRET.
const scoreLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,  // Send rate-limit state in RateLimit-* response headers
  legacyHeaders: false,   // Suppress deprecated X-RateLimit-* headers
});

/**
 * Sanitizes a string for safe HTML output by escaping special characters.
 *
 * Applied to player names before inserting them into the leaderboard HTML page
 * to prevent stored XSS attacks — a player could otherwise set their name to
 * a <script> tag and have it execute in visitors' browsers.
 *
 * @param {string} str - Raw user-supplied string.
 * @returns {string} HTML-safe version with &, <, >, " replaced by entities.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Verifies that a score submission was signed with the shared SCORE_SECRET.
 *
 * The HMAC covers "player:timeMs:timestamp", binding all three fields together —
 * tampering with any one of them invalidates the signature.
 *
 * timingSafeEqual prevents timing side-channel attacks: a naive string comparison
 * would return early on the first mismatched byte, leaking information about how
 * close the attacker's guess is. timingSafeEqual always takes the same time.
 *
 * @param {string} player - Player name as included in the payload.
 * @param {number} timeMs - Score time as included in the payload.
 * @param {number} timestamp - Unix timestamp as included in the payload.
 * @param {string} signature - Hex-encoded HMAC-SHA256 provided by the game client.
 * @returns {boolean} True if the signature matches; false if invalid or malformed.
 */
function verifyScoreSignature(player, timeMs, timestamp, signature) {
  const expected = createHmac('sha256', process.env.SCORE_SECRET)
    .update(`${player}:${timeMs}:${timestamp}`)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    // Buffer.from throws if signature is not valid hex or has an unexpected length
    return false;
  }
}

/**
 * POST /interactions — Discord interaction webhook endpoint.
 *
 * Discord delivers all slash command events here via HTTP POST.
 * verifyKeyMiddleware validates Discord's Ed25519 request signature before
 * the handler runs — any request that isn't from Discord is rejected with 401.
 *
 * Supported commands:
 *   /test        — Replies with a random emoji message.
 *   /leaderboard — Defers the response (shows loading state), fetches scores,
 *                  then edits the deferred reply with the formatted leaderboard.
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, data, token } = req.body;

  // Discord sends a PING during app setup to confirm the endpoint is reachable
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'test') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: `hello world ${getRandomEmoji()}`,
            },
          ],
        },
      });
    }

    if (name === 'leaderboard') {
      // Acknowledge immediately — Discord times out interactions with no response after 3 seconds.
      // DEFERRED shows a loading state; we then edit it once the DB query finishes.
      res.send({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });

      const topScores = await getTopScores(10);
      const lines = topScores.length
        ? topScores.map((s, i) => `**${i + 1}** ${s.player} - ${formatTime(s.time)}`).join('\n')
        : 'No scores yet!';

      // PATCH @original edits the deferred placeholder created above
      await DiscordRequest(`webhooks/${process.env.APP_ID}/${token}/messages/@original`, {
        method: 'PATCH',
        body: { content: `**Leaderboard**\n${lines}` },
      });
      return;
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

/**
 * Posts a score announcement message to the configured Discord channel.
 * Called after a score is validated and persisted. Fires and doesn't block the
 * HTTP response — a failure here is logged but doesn't fail the /score request.
 *
 * @param {string} player - The player's display name.
 * @param {number} timeMs - The player's survival time in milliseconds.
 * @returns {Promise<void>}
 */
async function postNewScore(player, timeMs) {
  const rank = await getRank(timeMs);
  await DiscordRequest(`channels/${process.env.CHANNEL_ID}/messages`, {
    method: 'POST',
    body: {
      content: `**Player ${player}** just survived for **${formatTime(timeMs)}** and is now ranked **#${rank}** on the leaderboard!`,
    },
  });
}

/**
 * GET /leaderboard — Renders an HTML leaderboard page.
 *
 * Returns a static, Discord-themed dark-mode table of the top 10 scores.
 * Player names are HTML-escaped before insertion to prevent XSS.
 * The top-ranked row is highlighted gold.
 */
app.get('/leaderboard', async (_req, res) => {
  const topScores = await getTopScores(10);
  const rows = topScores.length
    ? topScores
        .map(
          (s, i) => `
        <tr class="${i === 0 ? 'gold' : ''}">
          <td class="rank">#${i + 1}</td>
          <td>${escapeHtml(s.player)}</td>
          <td class="time">${formatTime(s.time)}</td>
        </tr>`
        )
        .join('')
    : '<tr><td colspan="3" class="empty">No scores yet!</td></tr>';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leaderboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #e0e0e0; display: flex; justify-content: center; padding: 40px 16px; margin: 0; min-height: 100vh; }
    .card { background: #16213e; border-radius: 12px; padding: 32px; width: 100%; max-width: 520px; height: fit-content; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    h1 { margin: 0 0 24px; font-size: 1.4rem; color: #7289da; letter-spacing: 0.05em; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; color: #72767d; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; padding: 0 8px 10px; border-bottom: 1px solid #2d3561; }
    th:last-child { text-align: right; }
    td { padding: 13px 8px; border-bottom: 1px solid #1e2a4a; font-size: 0.95rem; }
    tr:last-child td { border-bottom: none; }
    .rank { color: #72767d; width: 44px; font-variant-numeric: tabular-nums; }
    .time { color: #7289da; text-align: right; font-variant-numeric: tabular-nums; font-family: monospace; font-size: 0.9rem; }
    tr.gold td { color: #faa61a; }
    tr.gold .rank { color: #faa61a; }
    .empty { text-align: center; color: #72767d; padding: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Leaderboard</h1>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</body>
</html>`);
});

/**
 * POST /score — Accepts and validates an externally submitted game score.
 *
 * Security layers (applied in order):
 *   1. Rate limiting (10 req/min/IP)       — throttles flooding and brute-force attempts.
 *   2. Body validation                      — rejects malformed or missing fields early.
 *   3. Timestamp window check (±30 seconds) — prevents replay attacks where a captured
 *                                             valid request is resent to submit duplicate scores.
 *   4. HMAC-SHA256 signature verification   — proves the client knows SCORE_SECRET and that
 *                                             the player/timeMs/timestamp values weren't altered.
 *
 * Expected JSON body:
 *   { player: string, timeMs: number, timestamp: number (unix ms), signature: string (hex) }
 */
app.post('/score', scoreLimiter, express.json(), async (req, res) => {
  const { player, timeMs, timestamp, signature } = req.body;

  if (
    typeof player !== 'string' ||
    player.length > 100 ||
    typeof timeMs !== 'number' ||
    typeof timestamp !== 'number' ||
    typeof signature !== 'string'
  ) {
    return res.status(400).json({ error: 'invalid request body' });
  }

  // Reject if the timestamp is more than 30 seconds old or in the future.
  // 30s is long enough to tolerate network latency but short enough to block replays.
  if (Math.abs(Date.now() - timestamp) > 30_000) {
    return res.status(401).json({ error: 'timestamp expired' });
  }

  if (!verifyScoreSignature(player, timeMs, timestamp, signature)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  await addScore(player, timeMs);
  try {
    await postNewScore(player, timeMs);
  } catch (err) {
    // Score is already saved — don't fail the whole request if the announcement fails
    console.error('Failed to post score announcement:', err);
  }
  return res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
