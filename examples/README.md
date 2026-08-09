# Examples

Standalone, single-file demonstrations of individual Discord interaction features.
Each file is an independent Express app — run any one of them directly with `node examples/<file>.js`.

These are **not** part of the production application. They exist as reference code for common patterns.

## Files

### `app.js` — Complete Rock-Paper-Scissors game
A fully playable multiplayer RPS game using slash commands, buttons, and select menus.
Imports `game.js` (root) for game logic and choice data.

**Flow:**
1. Player 1 runs `/challenge` — bot posts a challenge message with an **Accept** button
2. Player 2 clicks **Accept** — bot sends an ephemeral select menu (private, only visible to P2)
3. Player 2 picks a choice — bot computes the result and posts the outcome publicly

### `button.js` — Button interaction
Shows how to send a message with a button and handle the click event.

### `command.js` — Slash command registration
Shows how to register a single guild-scoped command manually (alternative to the bulk `PUT` approach used in `src/commands/commands.js`).

### `modal.js` — Modal form
Shows how to respond to a slash command with a modal (pop-up form), and how to read the submitted values.

### `selectMenu.js` — String select menu
Shows how to send a message with a dropdown select menu and handle the selection event.

## Differences from the production app

| Feature | Production (`src/api/app.js`) | Examples |
|---|---|---|
| Database | Supabase (persistent) | None (in-memory or none) |
| Security | Signature + rate limiting | Middleware only |
| Game | Leaderboard scoring | RPS (examples/app.js) |
| Scope | All endpoints | Single feature each |
