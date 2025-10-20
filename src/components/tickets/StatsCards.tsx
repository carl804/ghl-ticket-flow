import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import type { Stats } from "@/lib/types";

interface StatsCardsProps {
  stats: Stats;
  isLoading: boolean;
}

const statConfigs = [
  {
    key: "open",
    label: "Open",
    gradient: "from-blue-500 via-blue-600 to-indigo-600",
    glowColor: "shadow-blue-500/50",
    icon: "🎯",
  },
  {
    key: "inProgress",
    label: "In Progress",
    gradient: "from-amber-400 via-orange-500 to-amber-600",
    glowColor: "shadow-amber-500/50",
    icon: "⚡",
  },
  {
    key: "escalated",
    label: "Escalated",
    gradient: "from-red-500 via-rose-600 to-pink-600",
    glowColor: "shadow-red-500/50",
    icon: "🚨",
  },
  {
    key: "resolved",
    label: "Resolved",
    gradient: "from-emerald-500 via-green-600 to-teal-600",
    glowColor: "shadow-emerald-500/50",
    icon: "✅",
  },
  {
    key: "closed",
    label: "Closed",
    gradient: "from-slate-500 via-gray-600 to-slate-700",
    glowColor: "shadow-slate-500/50",
    icon: "🔒",
  },
  {
    key: "deleted",
    label: "Deleted",
    gradient: "from-gray-400 via-gray-500 to-gray-600",
    glowColor: "shadow-gray-500/50",
    icon: "🗑️",
  },
];

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statConfigs.map((config) => {
        const value = stats[config.key as keyof Stats] || 0;
        const trend = stats[`${config.key}Trend` as keyof Stats];
        
        return (
          <Card
            key={config.key}
            className={`relative overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl ${config.glowColor} backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-0`}
          >
            {/* Animated gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
            
            {/* Glow effect on hover */}
            <div className={`absolute -inset-1 bg-gradient-to-r ${config.gradient} rounded-lg blur opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
            
            <div className="relative p-6">
              {/* Icon with gradient */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${config.gradient} shadow-lg mb-4 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                <span className="text-2xl">{config.icon}</span>
              </div>
              
              {/* Label */}
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {config.label}
              </p>
              
              {/* Value with animated counter effect */}
              <div className="flex items-baseline gap-2">
                <p className={`text-4xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                  {value}
                </p>
                
                {/* Trend indicator */}
                {trend !== undefined && trend !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {trend > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(trend)}%</span>
                  </div>
                )}
              </div>
              
              {/* Animated shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}