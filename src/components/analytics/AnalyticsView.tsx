import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AgentMetricsTable } from "./AgentMetricsTable";
import AgentPerformanceDashboard from "./AgentPerformanceDashboard";
import type { AgentMetric } from "@/lib/agentMetrics";

interface AnalyticsViewProps {
  metrics: AgentMetric[];
}

export default function AnalyticsView({ metrics }: AnalyticsViewProps) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="charts" className="w-full">
        <TabsList>
          <TabsTrigger value="charts">Dashboard</TabsTrigger>
          <TabsTrigger value="table">Data Table</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="mt-6">
          <AgentPerformanceDashboard />
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <AgentMetricsTable metrics={metrics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}