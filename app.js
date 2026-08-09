import 'dotenv/config';
import express from 'express';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';

import { addScore,getTopScores,getRank,formatTime } from './db.js';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `hello world ${getRandomEmoji()}`
            }
          ]
        },
      });
    }

    if (name === 'leaderboard') {
      const topScores = getTopScores(10);
      const lines = topScores.length ? 
        topScores.map((rank, index) => `**${index + 1}** ${rank.player} - ${formatTime(rank.time)}`).join('\n')
        : 'No scores yet!'
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `**Leaderboard**\n${lines}` },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

async function postNewScore(player, timeMs) {
  const channelID = process.env.CHANNEL_ID;
  const rank = getRank(timeMs);
  await DiscordRequest(`channels/${channelID}/messages`, {
    method: 'POST',
    body: {
      content: `**Player ${player}** just survived for **${formatTime(timeMs)}** and is now ranked **#${rank}** on the leaderboard!`,
    },
  });
}

app.post('/score', express.json(), async (req, res) => {
  const { player, timeMs, secret } = req.body;

  if (secret !== process.env.SCORE_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (typeof player !== 'string' || player.length > 100 || typeof timeMs !== 'number') {
    return res.status(400).json({ error: 'invalid request body' });
  }

  addScore(player, timeMs);
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
