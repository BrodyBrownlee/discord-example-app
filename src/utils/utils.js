import 'dotenv/config';

/**
 * Makes an authenticated HTTP request to the Discord REST API.
 *
 * Automatically prepends the Discord API base URL and injects the bot token
 * into the Authorization header. JSON bodies are stringified before sending.
 *
 * @param {string} endpoint - The API path after the base URL (e.g. "channels/123/messages").
 * @param {object} options - Standard fetch options (method, body, etc.).
 * @returns {Promise<Response>} The raw fetch Response on success.
 * @throws {Error} If the response status is not 2xx; the error message contains the API error body.
 */
export async function DiscordRequest(endpoint, options) {
  const url = 'https://discord.com/api/v10/' + endpoint;

  if (options.body) options.body = JSON.stringify(options.body);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options,
  });

  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }

  return res;
}

/**
 * Registers (or replaces) all global slash commands for the app via Discord's
 * bulk overwrite endpoint. Safe to call repeatedly — it atomically replaces the
 * entire global command list with the provided array.
 *
 * @param {string} appId - The Discord application ID (from the Developer Portal).
 * @param {object[]} commands - Array of Discord application command definition objects.
 * @returns {Promise<void>}
 */
export async function InstallGlobalCommands(appId, commands) {
  // PUT to this endpoint replaces ALL existing global commands in one atomic operation
  const endpoint = `applications/${appId}/commands`;
  try {
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

/**
 * Returns a random emoji from a curated list.
 *
 * @returns {string} A single emoji character.
 */
export function getRandomEmoji() {
  const emojiList = ['😭', '😄', '😌', '🤓', '😎', '😤', '🤖', '😶‍🌫️', '🌏', '📸', '💿', '👋', '🌊', '✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

/**
 * Capitalizes the first character of a string.
 *
 * @param {string} str - The input string.
 * @returns {string} The string with the first letter uppercased.
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
