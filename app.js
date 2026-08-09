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

import { addScore, getTopScores, getRank, formatTime } from './db.js';
import { getRandomEmoji, DiscordRequest } from './utils.js';

const app = express();
const PORT = process.env.PORT || 3000;

const scoreLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function verifyScoreSignature(player, timeMs, timestamp, signature) {
  const expected = createHmac('sha256', process.env.SCORE_SECRET)
    .update(`${player}:${timeMs}:${timestamp}`)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, data, token } = req.body;

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
      // Acknowledge immediately so Discord doesn't time out, then follow up
      res.send({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });

      const topScores = await getTopScores(10);
      const lines = topScores.length
        ? topScores.map((s, i) => `**${i + 1}** ${s.player} - ${formatTime(s.time)}`).join('\n')
        : 'No scores yet!';

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

async function postNewScore(player, timeMs) {
  const rank = await getRank(timeMs);
  await DiscordRequest(`channels/${process.env.CHANNEL_ID}/messages`, {
    method: 'POST',
    body: {
      content: `**Player ${player}** just survived for **${formatTime(timeMs)}** and is now ranked **#${rank}** on the leaderboard!`,
    },
  });
}

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
    console.error('Failed to post score announcement:', err);
  }
  return res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
