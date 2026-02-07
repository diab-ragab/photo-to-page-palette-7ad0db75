import { fetchJsonOrThrow, API_BASE } from './apiFetch';

export interface TopUpPackage {
  id: number;
  currency_type: 'zen' | 'coins';
  amount: number;
  bonus_amount: number;
  price: number;
  is_popular: boolean;
  is_best_value: boolean;
  is_active?: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface TopUpPackageFormData {
  currency_type: 'zen' | 'coins';
  amount: number;
  bonus_amount: number;
  price: number;
  is_popular: boolean;
  is_best_value: boolean;
  is_active: boolean;
  sort_order: number;
}

export async function fetchActivePackages(type?: 'zen' | 'coins'): Promise<TopUpPackage[]> {
  const url = type 
    ? `${API_BASE}/currency_topup.php?action=list&type=${type}`
    : `${API_BASE}/currency_topup.php?action=list`;
  const data = await fetchJsonOrThrow<{ success: boolean; packages: TopUpPackage[] }>(url);
  return data.packages || [];
}

export async function fetchAdminPackages(): Promise<TopUpPackage[]> {
  const data = await fetchJsonOrThrow<{ success: boolean; packages: TopUpPackage[] }>(
    `${API_BASE}/currency_topup.php?action=admin_list`
  );
  return data.packages || [];
}

export async function createPackage(pkg: TopUpPackageFormData): Promise<number> {
  const data = await fetchJsonOrThrow<{ success: boolean; id: number }>(
    `${API_BASE}/currency_topup.php?action=create`,
    { method: 'POST', body: JSON.stringify(pkg) }
  );
  return data.id;
}

export async function updatePackage(id: number, pkg: TopUpPackageFormData): Promise<void> {
  await fetchJsonOrThrow(
    `${API_BASE}/currency_topup.php?action=update&id=${id}`,
    { method: 'POST', body: JSON.stringify(pkg) }
  );
}

export async function deletePackage(id: number): Promise<void> {
  await fetchJsonOrThrow(
    `${API_BASE}/currency_topup.php?action=delete&id=${id}`,
    { method: 'POST' }
  );
}

export async function togglePackage(id: number, isActive: boolean): Promise<void> {
  await fetchJsonOrThrow(
    `${API_BASE}/currency_topup.php?action=toggle&id=${id}`,
    { method: 'POST', body: JSON.stringify({ is_active: isActive }) }
  );
}
