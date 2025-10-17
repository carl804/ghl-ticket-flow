import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/integrations/ghl/oauth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, Clock, Target } from "lucide-react";

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];

interface AgentMetrics {
  agent: string;
  total: number;
  open: number;
  inProgress: number;
  escalated: number;
  resolved: number;
  closed: number;
  closeRate: number;
  avgCloseTime: string;
  active: number;
}

interface AnalyticsData {
  totalTickets: number;
  totalAgents: number;
  avgCloseRate: number;
  avgEscalationRate: number;
  agentMetrics: AgentMetrics[];
}

export default function AnalyticsView() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch('/api/analytics/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  // Prepare data for charts
  const ticketsByAgent = analytics.agentMetrics.map(m => ({
    agent: m.agent,
    Open: m.open,
    'In Progress': m.inProgress,
    Escalated: m.escalated,
    Resolved: m.resolved,
    Closed: m.closed,
  }));

  const ticketDistribution = analytics.agentMetrics.map(m => ({
    name: m.agent,
    value: m.total,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <Tabs defaultValue="agent" className="w-auto">
          <TabsList>
            <TabsTrigger value="agent">Agent Performance</TabsTrigger>
            <TabsTrigger value="daily">Daily Metrics</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs defaultValue="agent" className="space-y-6">
        <TabsContent value="agent" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalTickets}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalAgents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Close Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgCloseRate.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Escalation Rate</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgEscalationRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Agent & Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ticketsByAgent}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="agent" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Open" fill="#3b82f6" />
                    <Bar dataKey="In Progress" fill="#10b981" />
                    <Bar dataKey="Escalated" fill="#f59e0b" />
                    <Bar dataKey="Resolved" fill="#ec4899" />
                    <Bar dataKey="Closed" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Tickets Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ticketDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {ticketDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Agent Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Agent Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Agent</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Open</th>
                      <th className="text-right p-2">In Progress</th>
                      <th className="text-right p-2">Escalated</th>
                      <th className="text-right p-2">Resolved</th>
                      <th className="text-right p-2">Closed</th>
                      <th className="text-right p-2">Close %</th>
                      <th className="text-right p-2">Avg Close Time</th>
                      <th className="text-right p-2">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.agentMetrics.map((metric) => (
                      <tr key={metric.agent} className="border-b">
                        <td className="p-2 font-medium">{metric.agent}</td>
                        <td className="text-right p-2">{metric.total}</td>
                        <td className="text-right p-2">{metric.open}</td>
                        <td className="text-right p-2">{metric.inProgress}</td>
                        <td className="text-right p-2">{metric.escalated}</td>
                        <td className="text-right p-2">{metric.resolved}</td>
                        <td className="text-right p-2">{metric.closed}</td>
                        <td className="text-right p-2">{metric.closeRate}%</td>
                        <td className="text-right p-2">{metric.avgCloseTime}</td>
                        <td className="text-right p-2">{metric.active}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Daily metrics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}