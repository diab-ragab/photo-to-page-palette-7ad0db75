import { fetchJsonOrThrow } from './apiFetch';

export interface PlayerStats {
  success: boolean;
  username: string;
  total_votes: number;
  vote_streak: number;
  best_streak: number;
  vip_level: number;
  vip_points: number;
  coins: number;
  total_purchases: number;
  total_spent: number;
  character_count: number;
  highest_level: number;
  total_zen: number;
  account_created: string | null;
  last_login: string | null;
  achievements_unlocked: number;
  achievements_total: number;
}

const API_BASE = 'https://woiendgame.online/api';

export async function fetchPlayerStats(): Promise<PlayerStats> {
  return fetchJsonOrThrow<PlayerStats>(`${API_BASE}/player_stats.php`);
}
