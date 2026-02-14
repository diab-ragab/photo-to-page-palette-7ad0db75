import { fetchJsonOrThrow, API_BASE } from './apiFetch';

export interface WheelSegment {
  id: number;
  label: string;
  reward_type: 'coins' | 'vip' | 'zen' | 'nothing';
  reward_value: number;
  probability?: number;
  color: string;
  icon: string;
  is_active?: number;
  sort_order: number;
}

export interface SpinCharacter {
  RoleID: number;
  Name: string;
  Level: number;
}

export interface SpinStatus {
  success: boolean;
  can_spin: boolean;
  spins_used: number;
  spins_per_day: number;
  spins_remaining: number;
  daily_remaining?: number;
  bonus_spins?: number;
  zen_per_spin?: number;
  cooldown_hours: number;
  last_spin: string | null;
  next_spin_at: string | null;
  enabled: boolean;
}

export interface RewardMail {
  success: boolean;
  insert_id?: number;
  role_id?: number;
  message?: string;
}

export interface SpinResult {
  success: boolean;
  winner: WheelSegment;
  winner_index: number;
  segment_count: number;
  reward_given: boolean;
  reward_mail?: RewardMail | null;
  spins_remaining: number;
}

export interface SpinHistory {
  id: number;
  user_id: number;
  segment_id: number;
  reward_type: string;
  reward_value: number;
  spun_at: string;
  label: string;
  color: string;
  icon: string;
}

export interface SpinSettings {
  spins_per_day: string;
  cooldown_hours: string;
  enabled: string;
}

export interface SpinStats {
  total_spins: number;
  spins_today: number;
  unique_spinners: number;
  rewards_given: Record<string, number>;
}

// User endpoints
export async function fetchWheelSegments(): Promise<WheelSegment[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; segments: WheelSegment[] }>(
    `${API_BASE}/spin_wheel.php?action=segments`
  );
  return data.segments;
}

export async function fetchSpinStatus(): Promise<SpinStatus> {
  return fetchJsonOrThrow<SpinStatus>(`${API_BASE}/spin_wheel.php?action=status`);
}

export async function fetchSpinCharacters(): Promise<SpinCharacter[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; characters: SpinCharacter[] }>(
    `${API_BASE}/spin_wheel.php?action=characters`
  );
  return data.characters || [];
}

export async function performSpin(roleId: number): Promise<SpinResult> {
  return fetchJsonOrThrow<SpinResult>(
    `${API_BASE}/spin_wheel.php?action=spin`,
    {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId })
    },
    true,
    { showErrorToast: false }
  );
}

export async function fetchSpinHistory(limit = 10): Promise<SpinHistory[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; history: SpinHistory[] }>(
    `${API_BASE}/spin_wheel.php?action=history&limit=${limit}`
  );
  return data.history;
}

export interface BuySpinResult {
  success: boolean;
  message: string;
  spins_purchased: number;
  zen_spent: number;
  user_zen: number;
  bonus_spins: number;
}

export async function buyExtraSpins(count: number = 1): Promise<BuySpinResult> {
  return fetchJsonOrThrow<BuySpinResult>(
    `${API_BASE}/spin_wheel.php?action=buy_spin`,
    {
      method: 'POST',
      body: JSON.stringify({ count })
    },
    true,
    { showErrorToast: false }
  );
}

// Top Spinners (daily spin count leaderboard)
export interface TopSpinnerEntry {
  user_id: number;
  role_id: number;
  char_name: string;
  spin_count: number;
}

export interface TopSpinnerRewardSettings {
  enabled: string;
  reward_type: string;
  reward_value: string;
}

export async function fetchTopSpinners(limit = 10): Promise<{ top_spinners: TopSpinnerEntry[]; reward: TopSpinnerRewardSettings }> {
  return fetchJsonOrThrow<{ success: boolean; top_spinners: TopSpinnerEntry[]; reward: TopSpinnerRewardSettings }>(
    `${API_BASE}/spin_wheel.php?action=top_spinners&limit=${limit}`
  );
}

// Admin endpoints
export async function fetchAdminSegments(): Promise<WheelSegment[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; segments: WheelSegment[] }>(
    `${API_BASE}/spin_wheel.php?action=admin_segments`
  );
  return data.segments;
}

export async function createSegment(segment: Omit<WheelSegment, 'id'>): Promise<number> {
  const data = await fetchJsonOrThrow<{ success: boolean; id: number }>(
    `${API_BASE}/spin_wheel.php?action=admin_segments`,
    {
      method: 'POST',
      body: JSON.stringify({ ...segment, operation: 'create' })
    }
  );
  return data.id;
}

export async function updateSegment(segment: WheelSegment): Promise<void> {
  await fetchJsonOrThrow(`${API_BASE}/spin_wheel.php?action=admin_segments`, {
    method: 'POST',
    body: JSON.stringify({ ...segment, operation: 'update' })
  });
}

export async function deleteSegment(id: number): Promise<void> {
  await fetchJsonOrThrow(`${API_BASE}/spin_wheel.php?action=admin_segments`, {
    method: 'POST',
    body: JSON.stringify({ id, operation: 'delete' })
  });
}

export async function fetchSpinSettings(): Promise<SpinSettings> {
  const data = await fetchJsonOrThrow<{ success: boolean; settings: SpinSettings }>(
    `${API_BASE}/spin_wheel.php?action=admin_settings`
  );
  return data.settings;
}

export async function updateSpinSettings(settings: Partial<SpinSettings>): Promise<void> {
  await fetchJsonOrThrow(`${API_BASE}/spin_wheel.php?action=admin_settings`, {
    method: 'POST',
    body: JSON.stringify(settings)
  });
}

export async function fetchSpinStats(): Promise<SpinStats> {
  const data = await fetchJsonOrThrow<{ success: boolean; stats: SpinStats }>(
    `${API_BASE}/spin_wheel.php?action=admin_stats`
  );
  return data.stats;
}

export async function seedRewards(): Promise<{ inserted: number; message: string }> {
  return fetchJsonOrThrow<{ success: boolean; inserted: number; message: string }>(
    `${API_BASE}/spin_wheel.php?action=admin_segments`,
    {
      method: 'POST',
      body: JSON.stringify({ operation: 'seed_rewards' })
    }
  );
}

// Admin: Top Spinner Reward Settings
export async function fetchTopSpinnerSettings(): Promise<TopSpinnerRewardSettings> {
  const data = await fetchJsonOrThrow<{ success: boolean; settings: TopSpinnerRewardSettings }>(
    `${API_BASE}/spin_wheel.php?action=admin_top_spinner`
  );
  return data.settings;
}

export async function updateTopSpinnerSettings(settings: Partial<TopSpinnerRewardSettings>): Promise<void> {
  await fetchJsonOrThrow(`${API_BASE}/spin_wheel.php?action=admin_top_spinner`, {
    method: 'POST',
    body: JSON.stringify(settings)
  });
}
