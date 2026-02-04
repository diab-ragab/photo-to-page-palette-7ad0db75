import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchCurrentEvents, GameEvent, EVENT_TYPE_CONFIG, getEventStatus } from '@/lib/eventsApi';
import { 
  Zap, 
  Gift, 
  Vote, 
  Percent, 
  Wrench, 
  Download, 
  Swords, 
  Skull, 
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  zap: Zap,
  gift: Gift,
  vote: Vote,
  percent: Percent,
  wrench: Wrench,
  download: Download,
  swords: Swords,
  skull: Skull,
  calendar: Calendar,
};

function getTimeRemaining(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Ended';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  
  return `${hours}h ${minutes}m left`;
}

export const FeaturedEventsBanner = () => {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Fetch current/live events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const currentEvents = await fetchCurrentEvents();
        // Filter to only active and featured events
        const liveEvents = currentEvents.filter(e => 
          getEventStatus(e) === 'active' && e.is_featured
        );
        setEvents(liveEvents);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };
    
    loadEvents();
    // Refresh every 5 minutes
    const interval = setInterval(loadEvents, 300000);
    return () => clearInterval(interval);
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (events.length === 0) return;
    
    const updateTime = () => {
      const event = events[currentIndex];
      if (event) {
        setTimeLeft(getTimeRemaining(event.end_date));
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [events, currentIndex]);

  // Auto-rotate events
  useEffect(() => {
    if (events.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [events.length]);

  if (loading || events.length === 0) return null;

  const currentEvent = events[currentIndex];
  const config = EVENT_TYPE_CONFIG[currentEvent.event_type];
  const IconComponent = ICON_MAP[config.icon] || Calendar;

  const nextEvent = () => setCurrentIndex((prev) => (prev + 1) % events.length);
  const prevEvent = () => setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);

  return (
    <section className="relative py-3 overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 opacity-90"
        style={{
          background: `linear-gradient(135deg, ${currentEvent.color}20 0%, transparent 50%, ${currentEvent.color}10 100%)`
        }}
      />
      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-2 h-2 rounded-full opacity-60"
          style={{ backgroundColor: currentEvent.color }}
          animate={{
            x: [0, 100, 200],
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute right-20 top-1/2 w-1.5 h-1.5 rounded-full opacity-40"
          style={{ backgroundColor: currentEvent.color }}
          animate={{
            x: [0, -80, -160],
            y: [0, 20, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
      </div>

      <div className="container mx-auto px-4 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEvent.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between gap-4"
          >
            {/* Left: Event Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Icon with pulse */}
              <motion.div 
                className="p-2 md:p-2.5 rounded-xl shrink-0"
                style={{ 
                  backgroundColor: `${currentEvent.color}30`,
                  borderColor: `${currentEvent.color}50`,
                  borderWidth: '1px'
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <IconComponent 
                  className="h-5 w-5 md:h-6 md:w-6" 
                  style={{ color: currentEvent.color }} 
                />
              </motion.div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    className="text-[10px] md:text-xs px-1.5 py-0 animate-pulse"
                    style={{ 
                      backgroundColor: `${currentEvent.color}30`,
                      color: currentEvent.color,
                      borderColor: currentEvent.color
                    }}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    LIVE
                  </Badge>
                  <span className="text-sm md:text-base font-bold truncate">
                    {currentEvent.title}
                  </span>
                </div>
                
                {currentEvent.description && (
                  <p className="text-xs md:text-sm text-muted-foreground truncate hidden sm:block">
                    {currentEvent.description}
                  </p>
                )}
              </div>
            </div>

            {/* Center: Timer */}
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono font-medium">{timeLeft}</span>
            </div>

            {/* Right: Navigation & CTA */}
            <div className="flex items-center gap-2 shrink-0">
              {events.length > 1 && (
                <div className="hidden sm:flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={prevEvent}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                    {currentIndex + 1} / {events.length}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={nextEvent}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <Link to="/dashboard">
                <Button 
                  size="sm" 
                  className="gap-1.5 text-xs md:text-sm"
                  style={{ 
                    backgroundColor: currentEvent.color,
                    color: '#fff'
                  }}
                >
                  <span className="hidden sm:inline">Join Now</span>
                  <span className="sm:hidden">Join</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Mobile: Timer below */}
        <div className="md:hidden flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="font-mono">{timeLeft}</span>
          {events.length > 1 && (
            <span className="ml-2">• {currentIndex + 1}/{events.length} events</span>
          )}
        </div>
      </div>
    </section>
  );
};
