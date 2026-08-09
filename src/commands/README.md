# Commands — `src/commands/commands.js`

Defines and registers the bot's slash commands with Discord.

## Running

```bash
npm run register
```

This script runs once and exits. It calls Discord's **bulk overwrite** endpoint (`PUT /applications/{id}/commands`), which atomically replaces the entire global command list. It is safe to re-run — there are no duplicates.

> Note: Global commands can take up to an hour to propagate to all Discord servers. Use guild-scoped commands during development if you need instant updates.

## Commands

### `/test`
A minimal ping-style command for verifying the bot is online.

- `integration_types: [0, 1]` — Can be installed in a guild (0) or a user account (1)
- `contexts: [0, 1, 2]` — Works in guilds, bot DMs, and user DMs

### `/leaderboard`
Displays the top 10 scores from the database.

- `integration_types: [0]` — Guild installs only
- `contexts: [0]` — Guild channels only (not available in DMs)

## Adding a new command

1. Define the command object with `name`, `description`, `type: 1`, and the appropriate `integration_types` / `contexts`.
2. Add it to the `ALL_COMMANDS` array.
3. Run `npm run register` to push the updated list to Discord.
4. Add a matching `if (name === 'your-command')` handler in `src/api/app.js`.
