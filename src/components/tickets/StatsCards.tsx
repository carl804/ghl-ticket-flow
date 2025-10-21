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
    gradient: "from-blue-500 to-blue-600",
    bgGlow: "bg-blue-500/10",
    borderGlow: "border-blue-500/20",
    shadowGlow: "shadow-blue-500/20",
    icon: "🎯",
  },
  {
    key: "inProgress",
    label: "In Progress",
    gradient: "from-orange-500 to-orange-600",
    bgGlow: "bg-orange-500/10",
    borderGlow: "border-orange-500/20",
    shadowGlow: "shadow-orange-500/20",
    icon: "⚡",
  },
  {
    key: "escalated",
    label: "Escalated",
    gradient: "from-red-500 to-red-600",
    bgGlow: "bg-red-500/10",
    borderGlow: "border-red-500/20",
    shadowGlow: "shadow-red-500/20",
    icon: "🚨",
  },
  {
    key: "resolved",
    label: "Resolved",
    gradient: "from-green-500 to-green-600",
    bgGlow: "bg-green-500/10",
    borderGlow: "border-green-500/20",
    shadowGlow: "shadow-green-500/20",
    icon: "✅",
  },
  {
    key: "closed",
    label: "Closed",
    gradient: "from-gray-500 to-gray-600",
    bgGlow: "bg-gray-500/10",
    borderGlow: "border-gray-500/20",
    shadowGlow: "shadow-gray-500/20",
    icon: "🔒",
  },
  {
    key: "deleted",
    label: "Deleted",
    gradient: "from-gray-400 to-gray-500",
    bgGlow: "bg-gray-400/10",
    borderGlow: "border-gray-400/20",
    shadowGlow: "shadow-gray-400/20",
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
            className={`
              relative overflow-hidden group cursor-pointer
              bg-[hsl(var(--card))] border border-[hsl(var(--border))]
              hover:bg-[hsl(var(--elevated))]
              transition-all duration-300 hover:scale-105
              shadow-lg hover:shadow-xl
            `}
          >
            {/* Subtle gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            
            {/* Colored top border accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`} />
            
            <div className="relative p-5">
              {/* Icon with gradient background */}
              <div className={`
                inline-flex items-center justify-center 
                w-12 h-12 rounded-xl mb-4
                bg-gradient-to-br ${config.gradient}
                shadow-lg ${config.shadowGlow}
                transform group-hover:scale-110 group-hover:rotate-6 
                transition-all duration-300
              `}>
                <span className="text-2xl">{config.icon}</span>
              </div>
              
              {/* Label */}
              <p className="text-xs font-semibold text-[hsl(var(--text-secondary))] uppercase tracking-wider mb-2">
                {config.label}
              </p>
              
              {/* Value with trend */}
              <div className="flex items-baseline gap-2">
                <p className={`text-4xl font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                  {value}
                </p>
                
                {/* Trend indicator */}
                {trend !== undefined && typeof trend === 'number' && trend !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    trend > 0 ? 'text-green-500' : 'text-red-500'
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
            </div>
            
            {/* Animated shine effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
          </Card>
        );
      })}
    </div>
  );
}