/**
 * Daily Zen Reward API Client
 * 
 * Handles device fingerprinting and secure API communication
 * for the daily Zen reward system.
 */

import { generateFingerprint } from './fingerprint';

const API_BASE = 'https://woiendgame.online/api';

interface DailyZenStatus {
  success: boolean;
  can_claim: boolean;
  has_claimed: boolean;
  reward_amount: number;
  seconds_until_reset: number;
  reset_time: string;
  error?: string;
}

interface ClaimResult {
  success: boolean;
  message?: string;
  reward_amount?: number;
  seconds_until_reset?: number;
  error?: string;
}

/**
 * Get authentication headers for API requests
 */
function getAuthHeaders(): Record<string, string> {
  const sessionToken = localStorage.getItem('woi_session_token') || '';
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Session-Token': sessionToken,
    'Authorization': `Bearer ${sessionToken}`,
  };
}

/**
 * Check daily Zen claim status
 */
export async function checkDailyZenStatus(): Promise<DailyZenStatus> {
  try {
    const response = await fetch(`${API_BASE}/daily_zen.php`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[DailyZen] Status check failed:', error);
    return {
      success: false,
      can_claim: false,
      has_claimed: false,
      reward_amount: 0,
      seconds_until_reset: 0,
      reset_time: '',
      error: 'Failed to check status',
    };
  }
}

/**
 * Claim daily Zen reward
 * Generates browser fingerprint and sends to API
 */
export async function claimDailyZen(): Promise<ClaimResult> {
  try {
    // Generate browser fingerprint
    const fingerprint = await generateFingerprint();
    
    const response = await fetch(`${API_BASE}/daily_zen.php`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        fingerprint,
      }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[DailyZen] Claim failed:', error);
    return {
      success: false,
      error: 'Failed to claim reward. Please try again.',
    };
  }
}

/**
 * Format seconds into human-readable countdown
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
