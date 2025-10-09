// src/components/analytics/AgentMetricsTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Shield } from "lucide-react";
import type { AgentMetrics } from "@/lib/agentMetrics";
import { getTopPerformers } from "@/lib/agentMetrics";

interface AgentMetricsTableProps {
  metrics: AgentMetrics[];
}

export function AgentMetricsTable({ metrics }: AgentMetricsTableProps) {
  const topPerformers = getTopPerformers(metrics);
  
  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          No agent data available
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Top Performers Section */}
      {topPerformers && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-600" />
                Highest Close Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topPerformers.highestCloseRate.agent}</div>
              <p className="text-sm text-muted-foreground">
                {topPerformers.highestCloseRate.closePercentage}% close rate
              </p>
            </CardContent>
          </Card>
          
          {topPerformers.fastestAvgTime && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Fastest Avg Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{topPerformers.fastestAvgTime.agent}</div>
                <p className="text-sm text-muted-foreground">
                  {topPerformers.fastestAvgTime.avgCloseTime} average
                </p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Lowest Escalation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topPerformers.lowestEscalation.agent}</div>
              <p className="text-sm text-muted-foreground">
                {topPerformers.lowestEscalation.escalationPercentage}% escalation rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Open</TableHead>
                <TableHead className="text-center">In Progress</TableHead>
                <TableHead className="text-center">Closed</TableHead>
                <TableHead className="text-center">Close %</TableHead>
                <TableHead className="text-center">Avg Close Time</TableHead>
                <TableHead className="text-center">Avg Time in Stage</TableHead>
                <TableHead className="text-center">Escalated</TableHead>
                <TableHead className="text-center">Esc %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => (
                <TableRow key={metric.agent}>
                  <TableCell className="font-medium">{metric.agent}</TableCell>
                  <TableCell className="text-center">{metric.total}</TableCell>
                  <TableCell className="text-center">{metric.open}</TableCell>
                  <TableCell className="text-center">{metric.inProgress}</TableCell>
                  <TableCell className="text-center">{metric.closed}</TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={metric.closePercentage >= 80 ? "default" : "secondary"}
                      className={metric.closePercentage >= 80 ? "bg-green-600" : ""}
                    >
                      {metric.closePercentage}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{metric.avgCloseTime}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      {metric.avgTimeInCurrentStage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{metric.escalated}</TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={metric.escalationPercentage <= 15 ? "default" : "destructive"}
                      className={metric.escalationPercentage <= 15 ? "bg-blue-600" : ""}
                    >
                      {metric.escalationPercentage}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}