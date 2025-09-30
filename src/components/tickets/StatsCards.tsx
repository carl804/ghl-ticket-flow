import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Ticket, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Stats } from "@/lib/types";

interface StatsCardsProps {
  stats: Stats;
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Tickets",
      value: stats.total,
      trend: stats.totalTrend ?? 12,
      icon: Ticket,
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Open Tickets",
      value: stats.open,
      trend: stats.openTrend ?? -5,
      icon: Clock,
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Pending Customer",
      value: stats.pending ?? stats.pendingCustomer,
      trend: stats.pendingTrend,
      icon: AlertCircle,
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Resolved Today",
      value: stats.resolvedToday,
      trend: stats.resolvedTodayTrend ?? 8,
      icon: CheckCircle2,
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-3">{card.label}</p>
                  <h3 className="text-4xl font-bold mb-2">{card.value}</h3>
                  {card.trend !== undefined && (
                    <div className="flex items-center text-sm font-medium">
                      {card.trend > 0 ? (
                        <span className="text-green-600 dark:text-green-400">+{card.trend}% vs last week</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">{card.trend}% vs last week</span>
                      )}
                    </div>
                  )}
                </div>
                <div className={`${card.iconBg} p-3 rounded-full`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
