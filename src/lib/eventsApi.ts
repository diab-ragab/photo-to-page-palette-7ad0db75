import { fetchJsonOrThrow } from './apiFetch';

const API_BASE = 'https://woiendgame.online/api';

export type EventType = 'double_xp' | 'double_drops' | 'bonus_vote' | 'sale' | 'maintenance' | 'update' | 'pvp' | 'boss' | 'custom';

export interface GameEvent {
  id: number;
  title: string;
  description: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  all_day: number;
  color: string;
  banner_url: string | null;
  is_active?: number;
  is_featured: number;
  created_at?: string;
  updated_at?: string;
}

export interface EventStats {
  total_events: number;
  active_events: number;
  upcoming_events: number;
  past_events: number;
  by_type: Record<string, number>;
}

// Public endpoints
export async function fetchMonthEvents(year: number, month: number): Promise<GameEvent[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; events: GameEvent[] }>(
    `${API_BASE}/events.php?action=list&year=${year}&month=${month}`
  );
  return data.events;
}

export async function fetchUpcomingEvents(limit = 5): Promise<GameEvent[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; events: GameEvent[] }>(
    `${API_BASE}/events.php?action=upcoming&limit=${limit}`
  );
  return data.events;
}

export async function fetchCurrentEvents(): Promise<GameEvent[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; events: GameEvent[] }>(
    `${API_BASE}/events.php?action=current`
  );
  return data.events;
}

// Admin endpoints
export async function fetchAdminEvents(): Promise<GameEvent[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; events: GameEvent[] }>(
    `${API_BASE}/events.php?action=admin_list`
  );
  return data.events;
}

export async function createEvent(event: Omit<GameEvent, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const data = await fetchJsonOrThrow<{ success: boolean; id: number }>(
    `${API_BASE}/events.php?action=admin_create`,
    {
      method: 'POST',
      body: JSON.stringify(event)
    }
  );
  return data.id;
}

export async function updateEvent(event: GameEvent): Promise<void> {
  await fetchJsonOrThrow(`${API_BASE}/events.php?action=admin_update`, {
    method: 'POST',
    body: JSON.stringify(event)
  });
}

export async function deleteEvent(id: number): Promise<void> {
  await fetchJsonOrThrow(`${API_BASE}/events.php?action=admin_delete`, {
    method: 'POST',
    body: JSON.stringify({ id })
  });
}

export async function fetchEventStats(): Promise<EventStats> {
  const data = await fetchJsonOrThrow<{ success: boolean; stats: EventStats }>(
    `${API_BASE}/events.php?action=admin_stats`
  );
  return data.stats;
}

// Helper functions
export const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: string; defaultColor: string }> = {
  double_xp: { label: 'Double XP', icon: 'zap', defaultColor: '#22c55e' },
  double_drops: { label: 'Double Drops', icon: 'gift', defaultColor: '#8b5cf6' },
  bonus_vote: { label: 'Bonus Votes', icon: 'vote', defaultColor: '#3b82f6' },
  sale: { label: 'Sale', icon: 'percent', defaultColor: '#f59e0b' },
  maintenance: { label: 'Maintenance', icon: 'wrench', defaultColor: '#64748b' },
  update: { label: 'Update', icon: 'download', defaultColor: '#06b6d4' },
  pvp: { label: 'PvP Event', icon: 'swords', defaultColor: '#ef4444' },
  boss: { label: 'Boss Event', icon: 'skull', defaultColor: '#dc2626' },
  custom: { label: 'Custom', icon: 'calendar', defaultColor: '#3b82f6' }
};

export function getEventStatus(event: GameEvent): 'upcoming' | 'active' | 'ended' {
  const now = new Date();
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

export function formatEventTime(event: GameEvent): string {
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  
  if (event.all_day) {
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
