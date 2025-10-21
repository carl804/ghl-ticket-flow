import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import type { Stats } from "@/lib/types";

interface StatsCardsProps {
  stats: Stats;
  isLoading: boolean;
}

const statConfigs = [
  {
    key: "open",
    label: "Open",
    icon: "🎯",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-900",
  },
  {
    key: "inProgress",
    label: "In Progress",
    icon: "⚡",
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-900",
  },
  {
    key: "escalated",
    label: "Escalated",
    icon: "🚨",
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-900",
  },
  {
    key: "resolved",
    label: "Resolved",
    icon: "✅",
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-900",
  },
  {
    key: "closed",
    label: "Closed",
    icon: "🔒",
    color: "text-gray-600",
    bg: "bg-gray-50 dark:bg-gray-800/20",
    border: "border-gray-200 dark:border-gray-700",
  },
  {
    key: "deleted",
    label: "Deleted",
    icon: "🗑️",
    color: "text-gray-500",
    bg: "bg-gray-50 dark:bg-gray-800/20",
    border: "border-gray-200 dark:border-gray-700",
  },
];

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 px-5 py-3">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10" />
      
      <div className="relative flex items-center justify-between gap-6">
        {statConfigs.map((config, index) => {
          const value = stats[config.key as keyof Stats] || 0;
          const trend = stats[`${config.key}Trend` as keyof Stats];
          
          return (
            <div 
              key={config.key} 
              className="flex items-center gap-2.5 group cursor-pointer hover:scale-105 transition-transform duration-200"
            >
              {/* Icon with background */}
              <div className={`w-9 h-9 rounded-lg ${config.bg} ${config.border} border flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm`}>
                <span className="text-base">{config.icon}</span>
              </div>
              
              {/* Label + Value */}
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">
                  {config.label}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className={`text-2xl font-bold ${config.color} dark:${config.color.replace('600', '400')} group-hover:scale-110 transition-transform duration-200 inline-block`}>
                    {value}
                  </span>
                  {trend !== undefined && typeof trend === 'number' && trend !== 0 && (
                    <div className={`flex items-center gap-0.5 text-[9px] font-bold ${
                      trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {trend > 0 ? (
                        <TrendingUp className="h-2.5 w-2.5" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5" />
                      )}
                      <span>{Math.abs(trend)}%</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Separator */}
              {index < statConfigs.length - 1 && (
                <div className="w-px h-10 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent ml-4" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}