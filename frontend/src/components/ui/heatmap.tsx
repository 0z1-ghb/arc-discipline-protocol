'use client';

import { motion } from 'framer-motion';

interface HeatmapProps {
  score: number;
}

export function Heatmap({ score }: HeatmapProps) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date;
  });

  const getActivityLevel = (index: number) => {
    if (score === 0) return 0;
    const hash = (score * (index + 1) * 7) % 10;
    if (hash > 7) return 2;
    if (hash > 4) return 1;
    return 0;
  };

  return (
    <div className="glass rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Activity Heatmap</h3>
          <p className="text-xs text-white/50">Your coding consistency over the last 30 days</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
            <div className="w-3 h-3 rounded-sm bg-arc-teal/30" />
            <div className="w-3 h-3 rounded-sm bg-arc-teal" />
          </div>
          <span>More</span>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const level = getActivityLevel(i);
          const isToday = i === 29;
          
          return (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`
                aspect-square rounded-md cursor-pointer relative group flex items-center justify-center
                ${level === 0 ? 'bg-white/5 border border-white/5' : ''}
                ${level === 1 ? 'bg-arc-teal/30 border border-arc-teal/20' : ''}
                ${level === 2 ? 'bg-arc-teal border border-arc-teal shadow-[0_0_10px_rgba(0,229,153,0.3)]' : ''}
                ${isToday ? 'ring-2 ring-white/20' : ''}
                hover:scale-110 transition-all duration-200
              `}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-white/10 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {level > 0 ? ` • ${level} task${level > 1 ? 's' : ''}` : ' • No tasks'}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
