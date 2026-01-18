import { motion } from 'framer-motion';

interface TimeDisplayProps {
  time: string;
  className?: string;
}

// Component for displaying times in LTR format
export function TimeDisplay({ time, className = '' }: TimeDisplayProps) {
  return (
    <span 
      dir="ltr" 
      className={`inline-block font-bold tabular-nums ${className}`}
      style={{ unicodeBidi: 'embed' }}
    >
      {time}
    </span>
  );
}

interface PrayerRowProps {
  name: string;
  time: string;
  highlight?: boolean;
}

export function PrayerRow({ name, time, highlight = false }: PrayerRowProps) {
  return (
    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${
      highlight ? 'bg-amber-100/50' : ''
    }`}>
      <TimeDisplay time={time} className="text-xl text-foreground" />
      <span className="font-semibold text-lg">{name}</span>
    </div>
  );
}

interface ZmanRowProps {
  name: string;
  time: string;
  compact?: boolean;
}

export function ZmanRow({ name, time, compact = false }: ZmanRowProps) {
  return (
    <div className={`flex justify-between items-center ${compact ? 'py-1' : 'py-2'}`}>
      <TimeDisplay 
        time={time} 
        className={`${compact ? 'text-base' : 'text-lg'} text-muted-foreground`} 
      />
      <span className={`${compact ? 'text-sm' : 'text-base'} text-foreground`}>{name}</span>
    </div>
  );
}
