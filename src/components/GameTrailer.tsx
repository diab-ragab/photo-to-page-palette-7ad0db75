import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { getSiteSettings } from '@/lib/siteSettingsApi';

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

  useEffect(() => {
    getSiteSettings().then((s) => setVideoUrl(s.game_trailer_url || ''));
  }, []);

  const videoId = useMemo(() => extractYouTubeId(videoUrl), [videoUrl]);

  if (!videoId) return null;

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold font-orbitron text-foreground mb-3">
            Game Trailer
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Watch the action unfold — see what awaits you in WOI Endgame.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl shadow-primary/10 aspect-video bg-muted">
            {!playing ? (
              <button
                onClick={() => setPlaying(true)}
                className="group absolute inset-0 flex items-center justify-center cursor-pointer"
                aria-label="Play trailer"
              >
                {/* Thumbnail */}
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  alt="Game trailer thumbnail"
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                <div className="relative z-10 w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/40">
                  <Play className="h-9 w-9 text-primary-foreground ml-1" />
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
    </section>
  );
};
