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
  error?: string;
}

interface ClaimResult {
  success: boolean;
  message?: string;
  reward_amount?: number;
  seconds_until_next_claim?: number;
  server_time?: number;
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
 * This ensures the countdown is accurate regardless of client clock
 */
export function getCorrectedRemainingSeconds(
  serverSecondsRemaining: number,
  serverTimestamp: number
): number {
  if (!serverTimestamp || serverSecondsRemaining <= 0) {
    return serverSecondsRemaining;
  }
  
  // Calculate server time offset
  const localNow = Math.floor(Date.now() / 1000);
  serverTimeOffset = serverTimestamp - localNow;
  
  // The server told us X seconds remaining at server_time
  // Calculate when it will be ready: server_time + seconds_remaining
  const readyAt = serverTimestamp + serverSecondsRemaining;
  
  // Calculate remaining from current local time adjusted for offset
  const correctedLocalNow = localNow + serverTimeOffset;
  const remaining = readyAt - correctedLocalNow;
  
  return Math.max(0, remaining);
}

/**
 * Get the current server-adjusted remaining time
 * Used for countdown updates
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
  
  // Don't make API call if not logged in
  if (!sessionToken) {
    console.log('[DailyZen] No session token found, skipping API call');
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
    // Cache-bust to avoid CDN/browser serving stale cooldown values
    const rid = Date.now();
    const response = await fetch(`${API_BASE}/daily_zen.php?rid=${rid}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
      cache: 'no-store',
    });
    
    const data = await response.json();
    
    // Store CSRF token for subsequent POST requests
    if (data.csrf_token) {
      setCsrfToken(data.csrf_token);
    }
    
    // Calculate corrected remaining time based on server time
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
 * Generates enhanced browser fingerprint with risk signals
 */
export async function claimDailyZen(): Promise<ClaimResult> {
  try {
    // Get detailed fingerprint with risk assessment
    const fingerprintData = await getDetailedFingerprint();
    
    const response = await fetch(`${API_BASE}/daily_zen.php`, {
      method: 'POST',
      headers: getAuthHeaders(true), // Include CSRF token
      credentials: 'include',
      body: JSON.stringify({
        fingerprint: fingerprintData.hash,
        // Send risk signals for server-side validation
        signals: {
          vm: fingerprintData.signals.isVM,
          headless: fingerprintData.signals.isHeadless,
          inconsistent: fingerprintData.signals.hasInconsistencies,
          risk: fingerprintData.signals.riskScore,
          indicators: fingerprintData.signals.vmIndicators,
        },
        // Additional browser data for validation
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        languages: navigator.languages?.join(',') || navigator.language,
      }),
    });
    
    const data = await response.json();
    
    // Calculate corrected remaining time based on server time
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
  
  // Clamp to max 24 hours to prevent display errors
  const clampedSeconds = Math.min(seconds, 86400);
  
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const secs = Math.floor(clampedSeconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
