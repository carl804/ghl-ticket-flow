import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Stats } from "@/lib/types";

interface StatsCardsProps {
  stats: Stats;
  isLoading?: boolean;
}

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading stats...</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total ?? 0}</div>
          {stats.totalTrend !== undefined && (
            <p className="text-xs text-muted-foreground">
              Trend: {stats.totalTrend >= 0 ? "▲" : "▼"} {stats.totalTrend}%
            </p>
          )}
        </CardContent>
      </Card>

      {/* Open Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Open</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.open ?? 0}</div>
          {stats.openTrend !== undefined && (
            <p className="text-xs text-muted-foreground">
              Trend: {stats.openTrend >= 0 ? "▲" : "▼"} {stats.openTrend}%
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Customer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pending Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.pendingCustomer ?? stats.pending ?? 0}
          </div>
          {stats.pendingTrend !== undefined && (
            <p className="text-xs text-muted-foreground">
              Trend: {stats.pendingTrend >= 0 ? "▲" : "▼"} {stats.pendingTrend}%
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resolved Today */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.resolvedToday ?? 0}</div>
          <p className="text-xs text-muted-foreground">
            Avg Resolution Time: {stats.avgResolutionTime || "N/A"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
