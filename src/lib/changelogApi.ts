import { fetchJsonOrThrow } from './apiFetch';

const API_BASE = 'https://woiendgame.online/api';

export type ChangeType = 'add' | 'fix' | 'remove' | 'change' | 'security';
export type VersionType = 'major' | 'minor' | 'patch' | 'hotfix';

export interface ChangelogItem {
  id?: number;
  change_type: ChangeType;
  description: string;
  sort_order?: number;
}

export interface Changelog {
  id: number;
  version: string;
  version_type: VersionType;
  release_date: string;
  is_published?: number;
  changes: ChangelogItem[];
  created_at?: string;
  updated_at?: string;
}

// Public endpoints
export async function fetchChangelogs(limit = 5): Promise<Changelog[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; changelogs: Changelog[] }>(
    `${API_BASE}/changelog.php?action=list&limit=${limit}`
  );
  return data.changelogs;
}

// Admin endpoints
export async function fetchAdminChangelogs(): Promise<Changelog[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; changelogs: Changelog[] }>(
    `${API_BASE}/changelog.php?action=admin_list`
  );
  return data.changelogs;
}

export async function createChangelog(changelog: Omit<Changelog, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const data = await fetchJsonOrThrow<{ success: boolean; id: number }>(
    `${API_BASE}/changelog.php?action=admin_create`,
    {
      method: 'POST',
      body: JSON.stringify(changelog)
    }
  );
  return data.id;
}

export async function updateChangelog(changelog: Changelog): Promise<void> {
  await fetchJsonOrThrow(`${API_BASE}/changelog.php?action=admin_update`, {
    method: 'POST',
    body: JSON.stringify(changelog)
  });
}

export async function deleteChangelog(id: number): Promise<void> {
  await fetchJsonOrThrow(`${API_BASE}/changelog.php?action=admin_delete`, {
    method: 'POST',
    body: JSON.stringify({ id })
  });
}

// Helper to format date
export function formatChangelogDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
