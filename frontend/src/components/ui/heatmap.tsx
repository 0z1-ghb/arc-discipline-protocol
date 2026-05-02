'use client';

import { motion } from 'framer-motion';

interface HeatmapProps {
  score: number;
}

export function Heatmap({ score }: HeatmapProps) {
  // Generate last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date;
  });

  // Mock activity based on score (for visual demo)
  // In production, this would come from contract events
  const getActivityLevel = (index: number) => {
    if (score === 0) return 0;
    // Simple hash to make it look consistent but random-ish
    const hash = (score * (index + 1)) % 10;
    if (hash > 7) return 2; // High activity
    if (hash > 4) return 1; // Low activity
    return 0; // No activity
  };

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/80">Activity Heatmap</h3>
        <span className="text-xs text-white/40">Last 30 Days</span>
      </div>
      
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const level = getActivityLevel(i);
          const isToday = i === 29;
          
          return (
            <motion.div
              key={day.toISOString()}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.01 }}
              className={`
                aspect-square rounded-sm cursor-pointer relative group
                ${level === 0 ? 'bg-white/5' : ''}
                ${level === 1 ? 'bg-arc-teal/30' : ''}
                ${level === 2 ? 'bg-arc-teal' : ''}
                ${isToday ? 'ring-1 ring-arc-teal/50' : ''}
                hover:scale-110 transition-transform
              `}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {level > 0 ? ` • ${level} task${level > 1 ? 's' : ''}` : ' • No tasks'}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-3 text-xs text-white/40">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-white/5" />
        <div className="w-3 h-3 rounded-sm bg-arc-teal/30" />
        <div className="w-3 h-3 rounded-sm bg-arc-teal" />
        <span>More</span>
      </div>
    </div>
  );
}
