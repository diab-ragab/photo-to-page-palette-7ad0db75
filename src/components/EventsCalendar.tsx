import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Gift,
  Vote,
  Percent,
  Wrench,
  Download,
  Swords,
  Skull,
  Clock,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchMonthEvents, 
  fetchUpcomingEvents,
  type GameEvent,
  EVENT_TYPE_CONFIG,
  getEventStatus,
  formatEventTime
} from '@/lib/eventsApi';

const ICON_MAP: Record<string, React.ReactNode> = {
  zap: <Zap className="h-4 w-4" />,
  gift: <Gift className="h-4 w-4" />,
  vote: <Vote className="h-4 w-4" />,
  percent: <Percent className="h-4 w-4" />,
  wrench: <Wrench className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  swords: <Swords className="h-4 w-4" />,
  skull: <Skull className="h-4 w-4" />,
  calendar: <CalendarIcon className="h-4 w-4" />,
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface EventCardProps {
  event: GameEvent;
  compact?: boolean;
}

function EventCard({ event, compact = false }: EventCardProps) {
  const status = getEventStatus(event);
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.custom;
  
  const statusColors = {
    upcoming: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    active: 'bg-green-500/10 text-green-500 border-green-500/30',
    ended: 'bg-muted text-muted-foreground border-muted',
  };

  if (compact) {
    return (
      <div 
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
        style={{ borderLeft: `3px solid ${event.color}` }}
      >
        <div className="flex-shrink-0" style={{ color: event.color }}>
          {ICON_MAP[config.icon]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{event.title}</p>
          <p className="text-xs text-muted-foreground">{formatEventTime(event)}</p>
        </div>
        {event.is_featured === 1 && (
          <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-xl border bg-card hover:shadow-md transition-shadow"
      style={{ borderColor: event.color + '40' }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="p-2 rounded-lg flex-shrink-0"
          style={{ backgroundColor: event.color + '20', color: event.color }}
        >
          {ICON_MAP[config.icon]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{event.title}</h4>
            {event.is_featured === 1 && (
              <Star className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 fill-amber-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {event.description}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${statusColors[status]}`}>
              {status === 'active' ? '🔴 Live' : status === 'upcoming' ? '⏳ Upcoming' : 'Ended'}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatEventTime(event)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await fetchUpcomingEvents(5);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load upcoming events:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-primary/20">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="bg-card border-primary/20">
        <CardContent className="py-8 text-center text-muted-foreground">
          <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No upcoming events</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.map(event => (
          <EventCard key={event.id} event={event} compact />
        ))}
      </CardContent>
    </Card>
  );
}

export function EventsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    loadEvents();
  }, [year, month]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchMonthEvents(year, month);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const days: (number | null)[] = [];
    
    // Add padding for days before the 1st
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    
    return days;
  }, [year, month]);

  const getEventsForDay = (day: number): GameEvent[] => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => {
      const start = event.start_date.split(' ')[0];
      const end = event.end_date.split(' ')[0];
      return dateStr >= start && dateStr <= end;
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const selectedDayEvents = selectedDate 
    ? getEventsForDay(selectedDate.getDate())
    : [];

  const today = new Date();
  const isToday = (day: number) => 
    today.getDate() === day && 
    today.getMonth() === month - 1 && 
    today.getFullYear() === year;

  return (
    <Card className="bg-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Events Calendar
          </CardTitle>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-3">
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold">
            {MONTHS[month - 1]} {year}
          </h3>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday Headers */}
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {loading ? (
            Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))
          ) : (
            calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={index} className="aspect-square" />;
              }
              
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;
              const isSelected = selectedDate?.getDate() === day && 
                                selectedDate?.getMonth() === month - 1 &&
                                selectedDate?.getFullYear() === year;
              
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(new Date(year, month - 1, day))}
                  className={`
                    aspect-square rounded-lg text-sm font-medium relative
                    flex flex-col items-center justify-center gap-0.5
                    transition-colors
                    ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}
                    ${isSelected && !isToday(day) ? 'bg-primary/20 ring-2 ring-primary' : ''}
                    ${!isToday(day) && !isSelected ? 'hover:bg-muted' : ''}
                  `}
                >
                  <span>{day}</span>
                  {hasEvents && (
                    <div className="flex gap-0.5">
                      {dayEvents.slice(0, 3).map((evt, i) => (
                        <div 
                          key={i}
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: evt.color }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Selected Day Events */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border pt-4"
            >
              <h4 className="text-sm font-medium mb-3">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h4>
              
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events on this day
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
