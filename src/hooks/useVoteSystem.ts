import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateFingerprint } from '@/lib/fingerprint';
import { useToast } from '@/hooks/use-toast';
import { voteSitesApi, VoteSite, VoteSiteStatus } from '@/lib/voteSitesApi';

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
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);

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
        toast({
          title: "Vote Successful!",
          description: `You earned ${result.coins_earned || site.coins_reward} coins and ${result.vip_points_earned || site.vip_reward} VIP points!`
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
      } else {
        toast({
          title: "Vote Failed",
          description: result.message || "You can only vote once per cooldown period.",
          variant: "destructive"
        });
      }
    } catch {
      // Demo mode: simulate successful vote
      toast({
        title: "Vote Successful! (Demo)",
        description: `You earned ${site.coins_reward} coins and ${site.vip_reward} VIP points!`
      });

      setVoteData(prev => ({
        coins: prev.coins + site.coins_reward,
        vipPoints: prev.vipPoints + site.vip_reward,
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
    } finally {
      setLoading(false);
    }
  };

  // Count how many sites can be voted on
  const availableVotes = voteSites.filter(s => s.canVote).length;
  const totalSites = voteSites.length;

  useEffect(() => {
    fetchVoteSitesStatus();
  }, [fetchVoteSitesStatus]);

  return {
    voteData,
    voteSites,
    loading,
    sitesLoading,
    submitVote,
    refreshVoteStatus: fetchVoteSitesStatus,
    availableVotes,
    totalSites
  };
};
