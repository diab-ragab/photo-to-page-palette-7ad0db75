import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateFingerprint } from '@/lib/fingerprint';
import { useToast } from '@/hooks/use-toast';
import { voteSitesApi, VoteSite, VoteSiteStatus } from '@/lib/voteSitesApi';
import { voteStreakApi, VoteStreakData } from '@/lib/voteStreakApi';

interface VoteData {
  coins: number;
  vipPoints: number;
  totalVotes: number;
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
  const [streakData, setStreakData] = useState<VoteStreakData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [streakLoading, setStreakLoading] = useState(true);

  // Fetch streak data
  const fetchStreakData = useCallback(async () => {
    if (!isLoggedIn || !user?.username) {
      setStreakData(null);
      setStreakLoading(false);
      return;
    }

    try {
      const data = await voteStreakApi.getStreakData(user.username);
      setStreakData(data);
    } catch {
      setStreakData(null);
    } finally {
      setStreakLoading(false);
    }
  }, [isLoggedIn, user?.username]);

  // Fetch vote sites and their status
  const fetchVoteSitesStatus = useCallback(async () => {
    if (!isLoggedIn || !user?.username) {
      // Still load sites for display, but without vote status
      const sites = await voteSitesApi.getActiveSites();
      setVoteSites(sites.map(site => ({
        ...site,
        canVote: false,
        lastVoteTime: null,
        nextVoteTime: null,
        timeRemaining: null
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

      const response = await fetch('https://woiendgame.online/api/vote.php', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setVoteData({
          coins: result.coins || 0,
          vipPoints: result.vip_points || 0,
          totalVotes: result.total_votes || 0
        });

        // Merge vote status with site data
        const sites = await voteSitesApi.getActiveSites();
        const siteStatuses = result.site_statuses || {};
        
        const mergedSites: VoteSiteStatus[] = sites.map(site => {
          const status = siteStatuses[site.id] || {};
          return {
            ...site,
            canVote: status.can_vote ?? true,
            lastVoteTime: status.last_vote_time || null,
            nextVoteTime: status.next_vote_time || null,
            timeRemaining: status.time_remaining || null
          };
        });

        setVoteSites(mergedSites);
      } else {
        // API failed, use demo data
        const sites = await voteSitesApi.getActiveSites();
        setVoteSites(sites.map(site => ({
          ...site,
          canVote: true,
          lastVoteTime: null,
          nextVoteTime: null,
          timeRemaining: null
        })));
      }
    } catch {
      // Use demo data on error
      const sites = await voteSitesApi.getActiveSites();
      setVoteSites(sites.map(site => ({
        ...site,
        canVote: true,
        lastVoteTime: null,
        nextVoteTime: null,
        timeRemaining: null
      })));
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

      const response = await fetch('https://woiendgame.online/api/vote.php', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Build enhanced toast message with streak info
        let description = `You earned ${result.coins_earned || site.coins_reward} coins and ${result.vip_points_earned || site.vip_reward} VIP points!`;
        
        if (result.streak_bonus) {
          description += ` (${result.streak_multiplier}x streak bonus!)`;
        }

        toast({
          title: result.new_streak ? `🔥 Streak: ${result.new_streak} days!` : "Vote Successful!",
          description
        });

        // Update vote data
        setVoteData(prev => ({
          coins: result.new_coins_total ?? prev.coins + site.coins_reward,
          vipPoints: result.new_vip_total ?? prev.vipPoints + site.vip_reward,
          totalVotes: prev.totalVotes + 1
        }));

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

        // Refresh streak data after successful vote
        fetchStreakData();
      } else {
        toast({
          title: "Vote Failed",
          description: result.message || "You can only vote once per cooldown period.",
          variant: "destructive"
        });
      }
    } catch {
      // Demo mode: simulate successful vote with streak
      const currentStreak = (streakData?.currentStreak || 0) + 1;
      const multiplier = streakData?.currentMultiplier || 1;

      toast({
        title: `🔥 Streak: ${currentStreak} day${currentStreak !== 1 ? 's' : ''}!`,
        description: `You earned ${Math.round(site.coins_reward * multiplier)} coins and ${Math.round(site.vip_reward * multiplier)} VIP points! (${multiplier}x bonus)`
      });

      setVoteData(prev => ({
        coins: prev.coins + Math.round(site.coins_reward * multiplier),
        vipPoints: prev.vipPoints + Math.round(site.vip_reward * multiplier),
        totalVotes: prev.totalVotes + 1
      }));

      setVoteSites(prev => prev.map(s =>
        s.id === siteId
          ? {
              ...s,
              canVote: false,
              lastVoteTime: new Date().toISOString()
            }
          : s
      ));

      // Update demo streak
      if (streakData) {
        setStreakData({
          ...streakData,
          currentStreak: currentStreak,
          longestStreak: Math.max(streakData.longestStreak, currentStreak),
          lastStreakVote: new Date().toISOString(),
          streakExpiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Count how many sites can be voted on
  const availableVotes = voteSites.filter(s => s.canVote).length;
  const totalSites = voteSites.length;

  useEffect(() => {
    fetchVoteSitesStatus();
    fetchStreakData();
  }, [fetchVoteSitesStatus, fetchStreakData]);

  return {
    voteData,
    voteSites,
    streakData,
    loading,
    sitesLoading,
    streakLoading,
    submitVote,
    refreshVoteStatus: fetchVoteSitesStatus,
    refreshStreak: fetchStreakData,
    availableVotes,
    totalSites
  };
};
