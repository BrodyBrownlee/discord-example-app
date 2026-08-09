import 'dotenv/config';
import { InstallGlobalCommands } from '../utils/utils.js';

/**
 * The /test command definition.
 *
 * Available in all installation and usage contexts so it works everywhere:
 *   integration_types [0, 1] — can be added to a guild (0) or a user's account (1).
 *   contexts [0, 1, 2]       — usable in guilds (0), bot DMs (1), and user-DMs (2).
 */
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

/**
 * The /leaderboard command definition.
 *
 * Restricted to guild channels only so the leaderboard stays in server context:
 *   integration_types [0] — guild installs only.
 *   contexts [0]          — guild channels only (no DMs).
 */
const LEADERBOARD_COMMAND = {
  name: 'leaderboard',
  description: 'View the leaderboard',
  type: 1,
  integration_types: [0],
  contexts: [0],
};

const ALL_COMMANDS = [TEST_COMMAND, LEADERBOARD_COMMAND];

// Bulk-registers all commands. Safe to re-run — Discord's PUT endpoint
// atomically replaces the entire command list, so there are no duplicates.
InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
