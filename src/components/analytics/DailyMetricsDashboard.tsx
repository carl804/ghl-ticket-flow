import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, Calendar } from "lucide-react";

interface DailyMetric {
  Date: string;
  "Tickets Created": string;
  "Tickets Closed": string;
  "Tickets Resolved": string;
  "Net Change": string;
  "Total Open": string;
  "Total Backlog": string;
}

export default function DailyMetricsDashboard() {
  const [data, setData] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("https://hp-ticket-flow.vercel.app/api/get-daily-metrics");
      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error("Error fetching daily metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const last30Days = data.slice(0, 30).reverse();

  const trendData = last30Days.map((d) => ({
    date: new Date(d.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    created: parseInt(d["Tickets Created"] || "0"),
    closed: parseInt(d["Tickets Closed"] || "0"),
    resolved: parseInt(d["Tickets Resolved"] || "0"),
  }));

  const backlogData = last30Days.map((d) => ({
    date: new Date(d.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    backlog: parseInt(d["Total Backlog"] || "0"),
    open: parseInt(d["Total Open"] || "0"),
  }));

  const last7Days = data.slice(0, 7);
  const totalCreated = last7Days.reduce((sum, d) => sum + parseInt(d["Tickets Created"] || "0"), 0);
  const totalClosed = last7Days.reduce((sum, d) => sum + parseInt(d["Tickets Closed"] || "0"), 0);
  const avgCreatedPerDay = (totalCreated / 7).toFixed(1);
  const avgClosedPerDay = (totalClosed / 7).toFixed(1);
  const netChange = totalCreated - totalClosed;
  const currentBacklog = data.length > 0 ? parseInt(data[0]["Total Backlog"] || "0") : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading daily metrics...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-muted-foreground">No daily metrics data available yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Created/Day (7d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCreatedPerDay}</div>
            <p className="text-xs text-muted-foreground">{totalCreated} total this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Closed/Day (7d)</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgClosedPerDay}</div>
            <p className="text-xs text-muted-foreground">{totalClosed} total this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Change (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {netChange > 0 ? '+' : ''}{netChange}
            </div>
            <p className="text-xs text-muted-foreground">
              {netChange > 0 ? 'Backlog growing' : 'Backlog shrinking'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Backlog</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentBacklog}</div>
            <p className="text-xs text-muted-foreground">Total open tickets</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tickets Created vs Closed (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#ff7c7c" name="Created" strokeWidth={2} />
                <Line type="monotone" dataKey="closed" stroke="#82ca9d" name="Closed" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke="#8884d8" name="Resolved" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backlog Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={backlogData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="backlog" fill="#ffc658" name="Total Backlog" />
                <Bar dataKey="open" fill="#8884d8" name="Open Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last 14 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Created</th>
                  <th className="text-right p-2">Closed</th>
                  <th className="text-right p-2">Resolved</th>
                  <th className="text-right p-2">Net Change</th>
                  <th className="text-right p-2">Total Open</th>
                  <th className="text-right p-2">Backlog</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 14).map((day, index) => {
                  const netChange = parseInt(day["Net Change"] || "0");
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{new Date(day.Date).toLocaleDateString()}</td>
                      <td className="text-right p-2">{day["Tickets Created"]}</td>
                      <td className="text-right p-2">{day["Tickets Closed"]}</td>
                      <td className="text-right p-2">{day["Tickets Resolved"]}</td>
                      <td className={`text-right p-2 font-medium ${netChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {netChange > 0 ? '+' : ''}{netChange}
                      </td>
                      <td className="text-right p-2">{day["Total Open"]}</td>
                      <td className="text-right p-2 font-medium">{day["Total Backlog"]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
