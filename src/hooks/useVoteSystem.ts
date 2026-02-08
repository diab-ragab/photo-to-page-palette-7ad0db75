import { useState, useEffect, useCallback } from 'react';
import { hapticSuccess } from '@/hooks/useHapticFeedback';
import { API_BASE, getAuthHeaders } from '@/lib/apiFetch';
import { useAuth } from '@/contexts/AuthContext';
import { generateFingerprint } from '@/lib/fingerprint';
import { useToast } from '@/hooks/use-toast';
import { voteSitesApi, VoteSite, VoteSiteStatus } from '@/lib/voteSitesApi';

interface VoteData {
  coins: number;
  vipPoints: number;
  totalVotes: number;
}

interface StreakTier {
  tier: string;
  name: string;
  multiplier: number;
  color: string;
}

interface NextTier {
  days_needed: number;
  tier: string;
  multiplier: number;
}

export interface StreakData {
  current: number;
  longest: number;
  lastVoteDate: string | null;
  expiresAt: string | null;
  tier: StreakTier;
  nextTier: NextTier | null;
  multiplier: number;
}

// Server time offset (server_time - local_time) in seconds
let serverTimeOffset = 0;

// API_BASE imported from apiFetch

/**
 * Make a POST request to the vote API with FormData
 * Uses native fetch to avoid issues with Content-Type headers
 */
async function voteApiFetch(formData: FormData): Promise<any> {
  const sessionToken = localStorage.getItem('woi_session_token') || '';
  
  const response = await fetch(`${API_BASE}/vote.php?rid=${Date.now()}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'X-Session-Token': sessionToken,
      'Authorization': `Bearer ${sessionToken}`,
    },
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json();
}

export function getServerTimeOffset(): number {
  return serverTimeOffset;
}

export function setServerTimeOffset(serverTimestamp: number): void {
  const localNow = Math.floor(Date.now() / 1000);
  serverTimeOffset = serverTimestamp - localNow;
}

export const useVoteSystem = () => {
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [voteData, setVoteData] = useState<VoteData>({
    coins: 0,
    vipPoints: 0,
    totalVotes: 0
  });
  const [voteSites, setVoteSites] = useState<VoteSiteStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [streakData, setStreakData] = useState<StreakData>({
    current: 0,
    longest: 0,
    lastVoteDate: null,
    expiresAt: null,
    tier: { tier: 'starter', name: 'Starter', multiplier: 1.0, color: '#6B7280' },
    nextTier: { days_needed: 3, tier: 'rising', multiplier: 1.25 },
    multiplier: 1.0
  });

  // Fetch vote sites and their status
  const fetchVoteSitesStatus = useCallback(async () => {
    if (!isLoggedIn || !user?.username) {
      // For non-logged-in users, show sites but require login to vote
      const sites = await voteSitesApi.getActiveSites();
      // Defensive: ensure sites is always an array
      const safeSites = Array.isArray(sites) ? sites : [];
      setVoteSites(safeSites.map(site => ({
        ...site,
        canVote: false, // Can't vote without login
        lastVoteTime: null,
        nextVoteTime: null,
        timeRemaining: null,
        secondsRemaining: null
      })));
      setSitesLoading(false);
      return;
    }

    try {
      const fingerprint = await generateFingerprint();
      const formData = new FormData();
      formData.append('action', 'get_vote_status');
      formData.append('username', user.username);
      formData.append('fingerprint', fingerprint);

      const result = await voteApiFetch(formData);

      if (result.success) {
        // Sync server time offset for accurate countdown
        if (result.server_time) {
          setServerTimeOffset(result.server_time);
        }

        setVoteData({
          coins: result.coins || 0,
          vipPoints: result.vip_points || 0,
          totalVotes: result.total_votes || 0
        });

        // Update streak data
        if (result.streak) {
          setStreakData({
            current: result.streak.current || 0,
            longest: result.streak.longest || 0,
            lastVoteDate: result.streak.last_vote_date || null,
            expiresAt: result.streak.expires_at || null,
            tier: result.streak.tier || { tier: 'starter', name: 'Starter', multiplier: 1.0, color: '#6B7280' },
            nextTier: result.streak.next_tier || null,
            multiplier: result.streak.multiplier || 1.0
          });
        }

        // Merge vote status with site data
        const sites = await voteSitesApi.getActiveSites();
        // Defensive: ensure sites is always an array
        const safeSites = Array.isArray(sites) ? sites : [];
        const siteStatuses = result.site_statuses || {};

        const mergedSites: VoteSiteStatus[] = safeSites.map((site) => {
          const status = siteStatuses[site.id] || null;

          // Important: treat "no last_vote_time" as "never voted" (vote should be available)
          const lastVoteTime = status?.last_vote_time || null;
          const hasVotedBefore = !!lastVoteTime;

          // Use server-calculated seconds_remaining for accurate countdown
          const secondsRemaining = status?.seconds_remaining ?? null;

          return {
            ...site,
            canVote: hasVotedBefore ? status?.can_vote === true : true,
            lastVoteTime,
            nextVoteTime: status?.next_vote_time || null,
            timeRemaining: status?.time_remaining || null,
            secondsRemaining,
          };
        });

        setVoteSites(mergedSites);
      } else {
        // API failed - still show sites as available (optimistic) for logged-in users
        const fallbackSites = await voteSitesApi.getActiveSites();
        const safeFallback = Array.isArray(fallbackSites) ? fallbackSites : [];
        setVoteSites(safeFallback.map(site => ({
          ...site,
          canVote: true, // Allow voting, server will validate
          lastVoteTime: null,
          nextVoteTime: null,
          timeRemaining: null,
          secondsRemaining: null
        })));
      }
    } catch (err) {
      console.error('[Vote] get_vote_status failed', err);
      // On error - still show sites as available for logged-in users
      try {
        const errSites = await voteSitesApi.getActiveSites();
        const safeErr = Array.isArray(errSites) ? errSites : [];
        setVoteSites(safeErr.map(site => ({
          ...site,
          canVote: true, // Allow voting, server will validate
          lastVoteTime: null,
          nextVoteTime: null,
          timeRemaining: null,
          secondsRemaining: null
        })));
      } catch {
        setVoteSites([]);
      }
    } finally {
      setSitesLoading(false);
    }
  }, [isLoggedIn, user?.username]);

  const submitVote = async (siteId: number) => {
    if (!isLoggedIn || !user?.username) return;

    const site = voteSites.find(s => s.id === siteId);
    if (!site || !site.canVote) return;

    setLoading(true);
    try {
      const fingerprint = await generateFingerprint();
      const formData = new FormData();
      formData.append('action', 'submit_vote');
      formData.append('username', user.username);
      formData.append('fingerprint', fingerprint);
      formData.append('site_id', siteId.toString());

      const result = await voteApiFetch(formData);

      if (result.success) {
        const bonusText = result.bonus_coins > 0 
          ? ` (+${result.bonus_coins} bonus from ${result.streak?.tier?.name || 'streak'}!)` 
          : '';
        
        toast({
          title: "Vote Successful! 🎉",
          description: `You earned ${result.coins_earned} coins${bonusText} and ${result.vip_points_earned} VIP points!`
        });
        hapticSuccess();

        // Update vote data
        setVoteData(prev => ({
          coins: result.new_coins_total ?? prev.coins + (result.coins_earned || site.coins_reward),
          vipPoints: result.new_vip_total ?? prev.vipPoints + (result.vip_points_earned || site.vip_reward),
          totalVotes: prev.totalVotes + 1
        }));

        // Update streak data
        if (result.streak) {
          setStreakData({
            current: result.streak.current || 0,
            longest: result.streak.longest || 0,
            lastVoteDate: new Date().toISOString().split('T')[0],
            expiresAt: result.streak.expires_at || null,
            tier: result.streak.tier || streakData.tier,
            nextTier: result.streak.next_tier || null,
            multiplier: result.streak.multiplier || 1.0
          });

          // Show streak increase notification
          if (result.streak.increased) {
            setTimeout(() => {
              toast({
                title: `🔥 Streak: ${result.streak.current} days!`,
                description: result.streak.next_tier 
                  ? `${result.streak.next_tier.days_needed} more days to ${result.streak.next_tier.tier} tier (${result.streak.next_tier.multiplier}x bonus)!`
                  : `You're at max tier! Enjoy ${result.streak.multiplier}x bonus!`
              });
            }, 1500);
          }
        }

        // Update site status
        setVoteSites(prev => prev.map(s =>
          s.id === siteId
            ? {
                ...s,
                canVote: false,
                lastVoteTime: new Date().toISOString(),
                nextVoteTime: result.next_vote_time || null
              }
            : s
        ));
      } else {
        toast({
          title: "Vote Failed",
          description: result.message || "You can only vote once per cooldown period.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('[Vote] submit_vote failed', err);
      toast({
        title: "Vote Failed",
        description: "Could not connect to vote server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Count how many sites can be voted on
  const availableVotes = voteSites.filter(s => s.canVote).length;
  const totalSites = voteSites.length;

  // Initial fetch
  useEffect(() => {
    fetchVoteSitesStatus();
  }, [fetchVoteSitesStatus]);

  // Auto-refresh when browser tab becomes visible again
  useEffect(() => {
    let isMounted = true;
    
    const handleVisibilityChange = () => {
      if (isMounted && document.visibilityState === 'visible' && isLoggedIn) {
        fetchVoteSitesStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchVoteSitesStatus, isLoggedIn]);

  return {
    voteData,
    voteSites,
    loading,
    sitesLoading,
    submitVote,
    refreshVoteStatus: fetchVoteSitesStatus,
    availableVotes,
    totalSites,
    streakData
  };
};
