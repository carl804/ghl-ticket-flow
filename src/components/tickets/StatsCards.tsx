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

  const stages = [
    { name: 'Open', count: stats.open ?? 0, color: 'text-blue-600' },
    { name: 'In Progress', count: stats.inProgress ?? 0, color: 'text-yellow-600' },
    { name: 'Resolved', count: stats.resolved ?? 0, color: 'text-green-600' },
    { name: 'Closed', count: stats.closed ?? 0, color: 'text-gray-600' },
    { name: 'Deleted', count: stats.deleted ?? 0, color: 'text-red-600' }
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {stages.map(stage => (
            <div key={stage.name} className="text-center">
              <h3 className="text-xs font-medium text-muted-foreground uppercase mb-1">
                {stage.name}
              </h3>
              <div className={`text-3xl font-bold ${stage.color}`}>
                {stage.count}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}