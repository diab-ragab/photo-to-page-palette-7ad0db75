import { API_BASE, getAuthHeaders, apiGet, apiPost } from './apiFetch';
import { getDetailedFingerprint } from './fingerprint';

// ── Types ─────────────────────────────────────────────────────────────

export interface LotteryStatus {
  success: boolean;
  enabled: boolean;
  draw_id: number;
  draw_date: string;
  draw_status: 'open' | 'drawing' | 'completed';
  total_pool: number;
  total_entries: number;
  min_entry_zen: number;
  max_entries_per_day: number;
  reward_multiplier: number;
  seconds_until_draw: number;
  draw_time: string;
  server_time: number;
  user?: {
    entries_today: number;
    zen_entered: number;
    free_entries_remaining: number;
    bonus_entries: number;
    max_entries: number;
    can_enter: boolean;
    is_banned: boolean;
    win_chance: number;
  };
}

export interface LotteryWinner {
  id: number;
  draw_id: number;
  entry_id: number;
  user_id: number;
  username: string;
  zen_entered: number;
  zen_won: number;
  rank_position: number;
  delivered: number;
  draw_date: string;
  created_at: string;
}

export interface LotteryEntry {
  id: number;
  zen_amount: number;
  entry_type: 'free' | 'zen' | 'bonus';
  is_flagged: number;
  created_at: string;
}

export interface EntryResult {
  success: boolean;
  message?: string;
  entry_type?: string;
  zen_amount?: number;
  entries_today?: number;
  total_pool?: number;
  win_chance?: number;
}

// ── API Calls ─────────────────────────────────────────────────────────

export async function getLotteryStatus(): Promise<LotteryStatus> {
  return apiGet<LotteryStatus>(
    `/lottery.php?action=status&rid=${Date.now()}`,
    true,
    { showErrorToast: false, silentStatuses: [401, 403] }
  );
}

export async function getRecentWinners(limit = 10): Promise<{ success: boolean; winners: LotteryWinner[] }> {
  return apiGet(`/lottery.php?action=winners&limit=${limit}&rid=${Date.now()}`, false, { showErrorToast: false });
}

export async function enterLottery(zenAmount: number, entryType: 'free' | 'zen' | 'bonus' = 'zen'): Promise<EntryResult> {
  const fp = await getDetailedFingerprint();
  return apiPost<EntryResult>('/lottery.php?action=enter', {
    zen_amount: zenAmount,
    entry_type: entryType,
    fingerprint: fp.hash,
    device_hash: fp.hash,
  });
}

export async function getMyEntries(): Promise<{ success: boolean; entries: LotteryEntry[] }> {
  return apiGet(`/lottery.php?action=my_entries&rid=${Date.now()}`);
}

export async function getMyWins(): Promise<{ success: boolean; wins: LotteryWinner[] }> {
  return apiGet(`/lottery.php?action=my_wins&rid=${Date.now()}`);
}

// ── Admin API ─────────────────────────────────────────────────────────

export async function getAdminLotteryStatus() {
  return apiGet<any>(`/lottery.php?action=admin_status&rid=${Date.now()}`);
}

export async function getAdminEntries(date?: string) {
  const d = date || new Date().toISOString().slice(0, 10);
  return apiGet<any>(`/lottery.php?action=admin_entries&date=${d}&rid=${Date.now()}`);
}

export async function getAdminWinnersHistory(limit = 30) {
  return apiGet<any>(`/lottery.php?action=admin_winners_history&limit=${limit}&rid=${Date.now()}`);
}

export async function triggerDraw() {
  return apiPost<any>('/lottery.php?action=draw', {});
}

export async function rerollDraw(drawId: number) {
  return apiPost<any>('/lottery.php?action=reroll', { draw_id: drawId });
}

export async function banLotteryUser(userId: number, reason: string) {
  return apiPost<any>('/lottery.php?action=ban_user', { user_id: userId, reason });
}

export async function unbanLotteryUser(userId: number) {
  return apiPost<any>('/lottery.php?action=unban_user', { user_id: userId });
}

export async function updateLotterySettings(settings: Record<string, string | number>) {
  return apiPost<any>('/lottery.php?action=update_settings', settings);
}

export async function getAdminBans() {
  return apiGet<any>(`/lottery.php?action=admin_bans&rid=${Date.now()}`);
}

export async function getAdminLogs(limit = 50) {
  return apiGet<any>(`/lottery.php?action=admin_logs&limit=${limit}&rid=${Date.now()}`);
}
