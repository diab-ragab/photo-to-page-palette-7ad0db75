import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateFingerprint } from '@/lib/fingerprint';
import { useToast } from '@/hooks/use-toast';

interface VoteData {
  coins: number;
  vipPoints: number;
  lastVoteTime: string | null;
  canVote: boolean;
  nextVoteTime: string | null;
  totalVotes: number;
}

const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

export const useVoteSystem = () => {
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [voteData, setVoteData] = useState<VoteData>({
    coins: 0,
    vipPoints: 0,
    lastVoteTime: null,
    canVote: true,
    nextVoteTime: null,
    totalVotes: 0
  });
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const fetchVoteStatus = useCallback(async () => {
    if (!isLoggedIn || !user?.username) return;

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
          lastVoteTime: result.last_vote_time,
          canVote: result.can_vote,
          nextVoteTime: result.next_vote_time,
          totalVotes: result.total_votes || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch vote status:', error);
    }
  }, [isLoggedIn, user?.username]);

  const submitVote = async () => {
    if (!isLoggedIn || !user?.username || !voteData.canVote) return;

    setLoading(true);
    try {
      const fingerprint = await generateFingerprint();
      const formData = new FormData();
      formData.append('action', 'submit_vote');
      formData.append('username', user.username);
      formData.append('fingerprint', fingerprint);

      const response = await fetch('https://woiendgame.online/api/vote.php', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Vote Successful!",
          description: `You earned ${result.coins_earned} coins and ${result.vip_points_earned} VIP points!`
        });
        
        setVoteData(prev => ({
          ...prev,
          coins: result.new_coins_total,
          vipPoints: result.new_vip_total,
          canVote: false,
          lastVoteTime: new Date().toISOString(),
          nextVoteTime: result.next_vote_time,
          totalVotes: prev.totalVotes + 1
        }));
      } else {
        toast({
          title: "Vote Failed",
          description: result.message || "You can only vote once every 12 hours.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Connection error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate time remaining
  useEffect(() => {
    if (!voteData.lastVoteTime || voteData.canVote) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const lastVote = new Date(voteData.lastVoteTime!).getTime();
      const nextVote = lastVote + VOTE_COOLDOWN_MS;
      const now = Date.now();
      const diff = nextVote - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        setVoteData(prev => ({ ...prev, canVote: true }));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [voteData.lastVoteTime, voteData.canVote]);

  useEffect(() => {
    fetchVoteStatus();
  }, [fetchVoteStatus]);

  return {
    voteData,
    loading,
    timeRemaining,
    submitVote,
    refreshVoteStatus: fetchVoteStatus
  };
};
