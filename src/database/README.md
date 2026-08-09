# Database — `src/database/db.js`

All database interactions go through this module. The backend is **Supabase** (PostgreSQL).

## Setup

The Supabase client is initialized once at module load using environment variables:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses Row Level Security) |

> The service role key has full database access. Never expose it client-side.

## Schema

```sql
CREATE TABLE scores (
  id         serial PRIMARY KEY,
  player     text    NOT NULL,
  time       integer NOT NULL,  -- survival time in milliseconds
  created_at bigint  NOT NULL   -- unix timestamp (ms) of submission
);
```

## Functions

### `addScore(player, timeMs)`
Inserts a new score record. Throws if the insert fails.

### `getTopScores(limit = 10)`
Returns the top scores ordered by `time` descending. Higher time = better rank.

### `getRank(timeMs)`
Counts how many existing scores are strictly greater than `timeMs`, then adds 1.
- Returns `1` if this is the highest score.
- Two players with the same time receive the same rank.
- Uses `head: true` (count-only query) to avoid fetching full rows.

### `formatTime(ms)`
Converts a millisecond integer to a `M:SS.mmm` display string.

```
65321 ms → "1:05.321"
```
