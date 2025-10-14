import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AgentPerformanceDashboard from "./AgentPerformanceDashboard";
import DailyMetricsDashboard from "./DailyMetricsDashboard";
import type { AgentMetric } from "@/lib/agentMetrics";

interface AnalyticsViewProps {
  metrics: AgentMetric[];
}

export default function AnalyticsView({ metrics }: AnalyticsViewProps) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="agent" className="w-full">
        <TabsList>
          <TabsTrigger value="agent">Agent Performance</TabsTrigger>
          <TabsTrigger value="daily">Daily Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="agent" className="mt-6">
          <AgentPerformanceDashboard />
        </TabsContent>

        <TabsContent value="daily" className="mt-6">
          <DailyMetricsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}