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
    color: "blue",
    bgLight: "bg-blue-50",
    bgDark: "dark:bg-blue-950/30",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: "🎯",
  },
  {
    key: "inProgress",
    label: "In Progress",
    color: "orange",
    bgLight: "bg-orange-50",
    bgDark: "dark:bg-orange-950/30",
    textColor: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: "⚡",
  },
  {
    key: "escalated",
    label: "Escalated",
    color: "red",
    bgLight: "bg-red-50",
    bgDark: "dark:bg-red-950/30",
    textColor: "text-red-600 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
    icon: "🚨",
  },
  {
    key: "resolved",
    label: "Resolved",
    color: "green",
    bgLight: "bg-green-50",
    bgDark: "dark:bg-green-950/30",
    textColor: "text-green-600 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
    icon: "✅",
  },
  {
    key: "closed",
    label: "Closed",
    color: "gray",
    bgLight: "bg-gray-50",
    bgDark: "dark:bg-gray-800/30",
    textColor: "text-gray-600 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-700",
    icon: "🔒",
  },
  {
    key: "deleted",
    label: "Deleted",
    color: "gray",
    bgLight: "bg-gray-50",
    bgDark: "dark:bg-gray-800/30",
    textColor: "text-gray-600 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-700",
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
              relative overflow-hidden
              bg-card hover:bg-accent/5
              border border-border
              transition-all duration-200
              hover:shadow-lg hover:scale-[1.02]
              cursor-pointer
            `}
          >
            <div className="p-6 space-y-3">
              {/* Icon */}
              <div className={`
                inline-flex items-center justify-center 
                w-12 h-12 rounded-xl
                ${config.bgLight} ${config.bgDark}
                ${config.textColor}
                transition-transform duration-200
                hover:scale-110
              `}>
                <span className="text-2xl">{config.icon}</span>
              </div>
              
              {/* Label */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {config.label}
              </p>
              
              {/* Value */}
              <div className="flex items-baseline gap-2">
                <p className={`text-4xl font-bold ${config.textColor}`}>
                  {value}
                </p>
                
                {/* Trend indicator */}
                {trend !== undefined && typeof trend === 'number' && trend !== 0 && (
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
            </div>
            
            {/* Top accent border */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${config.bgLight} ${config.bgDark}`} />
          </Card>
        );
      })}
    </div>
  );
}