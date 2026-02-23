import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import { getSiteSettings } from '@/lib/siteSettingsApi';

const FALLBACK_VIDEO_ID = '8ewIKLCq0nA';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export const GameTrailer = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSiteSettings()
      .then((s) => {
        setVideoUrl(s.game_trailer_url || '');
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const videoId = useMemo(() => extractYouTubeId(videoUrl) || (loaded ? FALLBACK_VIDEO_ID : null), [videoUrl, loaded]);

  if (!videoId) return null;

  return (
    <section className="relative w-full overflow-hidden">
      {/* Cinematic gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60 z-10 pointer-events-none" />
      
      {/* HDR glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-primary/10 blur-[100px] z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-24 bg-accent/10 blur-[80px] z-0 pointer-events-none" />

      <div className="relative z-20 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 md:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-widest font-display">
                Official Trailer
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-3">
              <span className="text-gradient">See It In Action</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              Watch the action unfold — see what awaits you in WOI Endgame.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-2xl shadow-primary/15 aspect-video bg-muted group">
              {/* Animated border glow */}
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm" />

              {!playing ? (
                <button
                  onClick={() => setPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer z-20"
                  aria-label="Play trailer"
                >
                  {/* Thumbnail */}
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="Game trailer thumbnail"
                    className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  {/* Dark cinematic overlay */}
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-300" />
                  {/* Scanline effect */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px)',
                    }}
                  />
                  {/* Play button */}
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg glow-effect-strong"
                    >
                      <Play className="h-9 w-9 md:h-11 md:w-11 text-primary-foreground ml-1" />
                    </motion.div>
                    <span className="text-xs font-display uppercase tracking-widest text-foreground/70">
                      Watch Trailer
                    </span>
                  </div>
                </button>
              ) : (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="Game Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
