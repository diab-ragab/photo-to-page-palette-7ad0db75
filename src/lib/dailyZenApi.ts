/**
 * Daily Zen Reward API Client
 * 
 * Handles device fingerprinting and secure API communication
 * for the daily Zen reward system with enhanced anti-abuse.
 * 
 * Uses server time synchronization to ensure accurate countdown display.
 */

import { getDetailedFingerprint } from './fingerprint';

const API_BASE = 'https://woiendgame.online/api';

interface DailyZenStatus {
  success: boolean;
  can_claim: boolean;
  has_claimed: boolean;
  reward_amount: number;
  seconds_until_next_claim: number;
  server_time?: number;
  csrf_token?: string;
  is_banned?: boolean;
  perm_ban?: boolean;
  ban_seconds_remaining?: number;
  strike_count?: number;
  error?: string;
}

interface ClaimResult {
  success: boolean;
  message?: string;
  reward_amount?: number;
  seconds_until_next_claim?: number;
  server_time?: number;
  is_banned?: boolean;
  perm_ban?: boolean;
  ban_seconds_remaining?: number;
  strike_count?: number;
  error?: string;
}

// Store CSRF token from status check
let csrfToken = '';

// Server time offset (server_time - local_time) in seconds
let serverTimeOffset = 0;

export function setCsrfToken(token: string) {
  csrfToken = token;
}

/**
 * Calculate the corrected remaining seconds based on server time offset
 */
export function getCorrectedRemainingSeconds(
  serverSecondsRemaining: number,
  serverTimestamp: number
): number {
  if (!serverTimestamp || serverSecondsRemaining <= 0) {
    return serverSecondsRemaining;
  }
  
  const localNow = Math.floor(Date.now() / 1000);
  serverTimeOffset = serverTimestamp - localNow;
  
  const readyAt = serverTimestamp + serverSecondsRemaining;
  const correctedLocalNow = localNow + serverTimeOffset;
  const remaining = readyAt - correctedLocalNow;
  
  return Math.max(0, remaining);
}

/**
 * Get the current server-adjusted remaining time
 */
export function getServerAdjustedTime(): number {
  return Math.floor(Date.now() / 1000) + serverTimeOffset;
}

/**
 * Get authentication headers for API requests
 */
function getAuthHeaders(includeCsrf = false): Record<string, string> {
  const sessionToken = localStorage.getItem('woi_session_token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Session-Token': sessionToken,
    'Authorization': `Bearer ${sessionToken}`,
  };
  
  if (includeCsrf && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  return headers;
}

/**
 * Check daily Zen claim status
 */
export async function checkDailyZenStatus(): Promise<DailyZenStatus> {
  const sessionToken = localStorage.getItem('woi_session_token');
  
  if (!sessionToken) {
    return {
      success: false,
      can_claim: false,
      has_claimed: false,
      reward_amount: 0,
      seconds_until_next_claim: 0,
      error: 'Not logged in',
    };
  }
  
  try {
    const rid = Date.now();
    const response = await fetch(`${API_BASE}/daily_zen.php?rid=${rid}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    if (data.csrf_token) {
      setCsrfToken(data.csrf_token);
    }
    
    if (data.success && data.server_time && data.seconds_until_next_claim > 0) {
      data.seconds_until_next_claim = getCorrectedRemainingSeconds(
        data.seconds_until_next_claim,
        data.server_time
      );
    }
    
    return data;
  } catch (error) {
    console.error('[DailyZen] Status check failed:', error);
    return {
      success: false,
      can_claim: false,
      has_claimed: false,
      reward_amount: 0,
      seconds_until_next_claim: 0,
      error: 'Failed to check status',
    };
  }
}

/**
 * Claim daily Zen reward
 */
export async function claimDailyZen(): Promise<ClaimResult> {
  try {
    const fingerprintData = await getDetailedFingerprint();
    
    const response = await fetch(`${API_BASE}/daily_zen.php`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      credentials: 'include',
      body: JSON.stringify({
        fingerprint: fingerprintData.hash,
        signals: {
          vm: fingerprintData.signals.isVM,
          headless: fingerprintData.signals.isHeadless,
          inconsistent: fingerprintData.signals.hasInconsistencies,
          risk: fingerprintData.signals.riskScore,
          indicators: fingerprintData.signals.vmIndicators,
        },
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        languages: navigator.languages?.join(',') || navigator.language,
      }),
    });
    
    const data = await response.json();
    
    if (data.success && data.server_time && data.seconds_until_next_claim) {
      data.seconds_until_next_claim = getCorrectedRemainingSeconds(
        data.seconds_until_next_claim,
        data.server_time
      );
    }
    
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
  
  const clampedSeconds = Math.min(seconds, 86400);
  
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const secs = Math.floor(clampedSeconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
