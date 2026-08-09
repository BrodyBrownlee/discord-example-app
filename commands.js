import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const LEADERBOARD_COMMAND = {
  name: 'leaderboard',
  description: 'View the leaderboard',
  type: 1,
  integration_types: [0],
  contexts: [0],
}
const ALL_COMMANDS = [TEST_COMMAND, LEADERBOARD_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
