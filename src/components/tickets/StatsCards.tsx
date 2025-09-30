import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Stats } from "@/lib/types";

interface StatsCardsProps {
  stats: Stats;
  isLoading?: boolean;
}

const StatCard = ({ 
  title, 
  value, 
  trend, 
  trendValue 
}: { 
  title: string; 
  value: string | number; 
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) => {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-status-resolved" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          {trendValue && (
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard 
        title="Total Tickets" 
        value={stats.total}
        trend="neutral"
      />
      <StatCard 
        title="Open" 
        value={stats.open}
        trend={stats.open > 5 ? "up" : "down"}
        trendValue={`${stats.open}`}
      />
      <StatCard 
        title="Pending Customer" 
        value={stats.pendingCustomer}
        trend="neutral"
      />
      <StatCard 
        title="Resolved Today" 
        value={stats.resolvedToday}
        trend="up"
        trendValue={`+${stats.resolvedToday}`}
      />
      <StatCard 
        title="Avg Resolution" 
        value={stats.avgResolutionTime}
        trend="down"
        trendValue="12%"
      />
    </div>
  );
}
