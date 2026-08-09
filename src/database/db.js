import { createClient } from '@supabase/supabase-js';

// Supabase client initialized with the service role key for full database access.
// The service role key bypasses Row Level Security — only use it server-side.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Inserts a new score record for a player into the `scores` table.
 *
 * @param {string} player - The player's display name (max 100 chars).
 * @param {number} timeMs - The player's survival time in milliseconds.
 * @returns {Promise<void>}
 * @throws {Error} If the Supabase insert fails (e.g. constraint violation, network error).
 */
export async function addScore(player, timeMs) {
  const { error } = await supabase
    .from('scores')
    .insert({ player, time: timeMs, created_at: Date.now() });
  if (error) throw error;
}

/**
 * Fetches the top scores from the `scores` table, sorted by time descending
 * (highest survival time = best score = first place).
 *
 * @param {number} [limit=10] - Maximum number of scores to return.
 * @returns {Promise<Array<{player: string, time: number}>>} Sorted score records.
 * @throws {Error} If the Supabase query fails.
 */
export async function getTopScores(limit = 10) {
  const { data, error } = await supabase
    .from('scores')
    .select('player, time')
    .order('time', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/**
 * Calculates the 1-indexed leaderboard rank for a given time by counting how
 * many existing scores are strictly greater. Two players with the same time
 * will receive the same rank.
 *
 * @param {number} timeMs - The time to rank (in milliseconds).
 * @returns {Promise<number>} The rank position (1 = first place).
 * @throws {Error} If the Supabase query fails.
 */
export async function getRank(timeMs) {
  // head: true returns only the count metadata — avoids fetching all matching rows
  const { count, error } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .gt('time', timeMs);
  if (error) throw error;
  return (count ?? 0) + 1;
}

/**
 * Formats a millisecond duration as a M:SS.mmm display string.
 *
 * @param {number} ms - Duration in milliseconds (e.g. 65321).
 * @returns {string} Formatted time string (e.g. "1:05.321").
 */
export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
