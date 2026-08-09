import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function addScore(player, timeMs) {
  const { error } = await supabase
    .from('scores')
    .insert({ player, time: timeMs, created_at: Date.now() });
  if (error) throw error;
}

export async function getTopScores(limit = 10) {
  const { data, error } = await supabase
    .from('scores')
    .select('player, time')
    .order('time', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getRank(timeMs) {
  const { count, error } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .gt('time', timeMs);
  if (error) throw error;
  return (count ?? 0) + 1;
}

export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
