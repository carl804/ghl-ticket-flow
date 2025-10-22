import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, TrendingUp, Clock, Target } from "lucide-react";
import { getAccessToken } from "@/integrations/ghl/oauth";

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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function AgentPerformanceDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching agent data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-muted-foreground">No analytics data available</div>
      </div>
    );
  }

  const barChartData = analytics.agentMetrics.map((agent) => ({
    name: agent.agent,
    "Total Tickets": agent.total,
    Open: agent.open,
    "In Progress": agent.inProgress,
    Escalated: agent.escalated,
    Resolved: agent.resolved,
    Closed: agent.closed,
  }));

  const pieChartData = analytics.agentMetrics.map((agent) => ({
    name: agent.agent,
    value: agent.total,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Agent & Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Open" fill="#8884d8" />
                <Bar dataKey="In Progress" fill="#82ca9d" />
                <Bar dataKey="Escalated" fill="#ffc658" />
                <Bar dataKey="Resolved" fill="#ff7c7c" />
                <Bar dataKey="Closed" fill="#8dd1e1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Total Tickets Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Agent Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                {analytics.agentMetrics.map((agent) => (
                  <tr key={agent.agent} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2 font-medium">{agent.agent}</td>
                    <td className="text-right p-2">{agent.total}</td>
                    <td className="text-right p-2">{agent.open}</td>
                    <td className="text-right p-2">{agent.inProgress}</td>
                    <td className="text-right p-2">{agent.escalated}</td>
                    <td className="text-right p-2">{agent.resolved}</td>
                    <td className="text-right p-2">{agent.closed}</td>
                    <td className="text-right p-2">{agent.closeRate}%</td>
                    <td className="text-right p-2">{agent.avgCloseTime}</td>
                    <td className="text-right p-2">{agent.active}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}