import { useCallback, useRef, useEffect } from 'react';

// Jackpot celebration sound using Web Audio API
export function useJackpotSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playJackpotSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Create a celebratory sound with multiple tones
      const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + startTime);
        
        gainNode.gain.setValueAtTime(0, now + startTime);
        gainNode.gain.linearRampToValueAtTime(volume, now + startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + startTime + duration);
        
        oscillator.start(now + startTime);
        oscillator.stop(now + startTime + duration);
      };

      // Celebratory fanfare melody
      const notes = [
        { freq: 523.25, time: 0, dur: 0.15, vol: 0.3 },      // C5
        { freq: 659.25, time: 0.1, dur: 0.15, vol: 0.3 },    // E5
        { freq: 783.99, time: 0.2, dur: 0.15, vol: 0.35 },   // G5
        { freq: 1046.50, time: 0.3, dur: 0.4, vol: 0.4 },    // C6 (held)
        { freq: 987.77, time: 0.5, dur: 0.15, vol: 0.3 },    // B5
        { freq: 1046.50, time: 0.65, dur: 0.5, vol: 0.45 },  // C6 (finale)
      ];

      notes.forEach(note => {
        playTone(note.freq, note.time, note.dur, note.vol);
      });

      // Add shimmer effect
      for (let i = 0; i < 8; i++) {
        const shimmerFreq = 2000 + Math.random() * 2000;
        playTone(shimmerFreq, 0.3 + i * 0.1, 0.1, 0.05);
      }

    } catch (e) {
      console.warn('Could not play jackpot sound:', e);
    }
  }, [getAudioContext]);

  const playRegularWinSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.linearRampToValueAtTime(800, now + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (e) {
      console.warn('Could not play win sound:', e);
    }
  }, [getAudioContext]);

  const playSpinSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Create a clicking/spinning sound
      for (let i = 0; i < 20; i++) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(100 + i * 5, now + i * 0.15);
        
        gainNode.gain.setValueAtTime(0.05, now + i * 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.05);
        
        oscillator.start(now + i * 0.15);
        oscillator.stop(now + i * 0.15 + 0.05);
      }
    } catch (e) {
      console.warn('Could not play spin sound:', e);
    }
  }, [getAudioContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playJackpotSound, playRegularWinSound, playSpinSound };
}
