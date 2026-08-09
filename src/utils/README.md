# Utils — `src/utils/utils.js`

Shared helper functions used across the application.

## Functions

### `DiscordRequest(endpoint, options)`
A thin wrapper around `fetch` for the Discord REST API (`https://discord.com/api/v10/`).

- Automatically adds the `Authorization: Bot <token>` header
- Stringifies JSON bodies before sending
- Throws an `Error` containing the API error body on any non-2xx response

```js
await DiscordRequest('channels/123/messages', {
  method: 'POST',
  body: { content: 'Hello!' },
});
```

### `InstallGlobalCommands(appId, commands)`
Registers slash commands globally using Discord's bulk overwrite endpoint.
Called by `src/commands/commands.js` at registration time.

### `getRandomEmoji()`
Returns a random emoji from a fixed list of 14 options. Used by the `/test` command response.

### `capitalize(str)`
Capitalizes the first letter of a string.

```js
capitalize('rock') // → 'Rock'
```
