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

interface AgentData {
  Timestamp: string;
  Agent: string;
  "Total Tickets": string;
  Open: string;
  "In Progress": string;
  Escalated: string;
  Resolved: string;
  Closed: string;
  "Close %": string;
  "Avg Close Time": string;
  "Avg Time in Stage": string;
  "Escalation %": string;
  "Active Tickets": string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function AgentPerformanceDashboard() {
  const [latestData, setLatestData] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("https://hp-ticket-flow.vercel.app/api/analytics?type=agent-performance");
      const result = await response.json();
      setLatestData(result.data || []);
    } catch (error) {
      console.error("Error fetching agent data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalTickets = latestData.reduce(
    (sum, agent) => sum + parseInt(agent["Total Tickets"] || "0"),
    0
  );
  const totalAgents = latestData.length;
  const avgCloseRate =
    latestData.reduce(
      (sum, agent) => sum + parseFloat(agent["Close %"].replace("%", "") || "0"),
      0
    ) / (totalAgents || 1);
  const avgEscalationRate =
    latestData.reduce(
      (sum, agent) => sum + parseFloat(agent["Escalation %"].replace("%", "") || "0"),
      0
    ) / (totalAgents || 1);

  const barChartData = latestData.map((agent) => ({
    name: agent.Agent,
    "Total Tickets": parseInt(agent["Total Tickets"] || "0"),
    Open: parseInt(agent.Open || "0"),
    "In Progress": parseInt(agent["In Progress"] || "0"),
    Escalated: parseInt(agent.Escalated || "0"),
    Resolved: parseInt(agent.Resolved || "0"),
    Closed: parseInt(agent.Closed || "0"),
  }));

  const pieChartData = latestData.map((agent) => ({
    name: agent.Agent,
    value: parseInt(agent["Total Tickets"] || "0"),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

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
            <div className="text-2xl font-bold">{totalTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Close Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCloseRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Escalation Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEscalationRate.toFixed(1)}%</div>
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
                {latestData.map((agent, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{agent.Agent}</td>
                    <td className="text-right p-2">{agent["Total Tickets"]}</td>
                    <td className="text-right p-2">{agent.Open}</td>
                    <td className="text-right p-2">{agent["In Progress"]}</td>
                    <td className="text-right p-2">{agent.Escalated}</td>
                    <td className="text-right p-2">{agent.Resolved}</td>
                    <td className="text-right p-2">{agent.Closed}</td>
                    <td className="text-right p-2">{agent["Close %"]}</td>
                    <td className="text-right p-2">{agent["Avg Close Time"]}</td>
                    <td className="text-right p-2">{agent["Active Tickets"]}</td>
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