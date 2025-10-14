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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DailyMetric {
  Date: string;
  "Total Tickets": string;
  "New Today": string;
  "Closed Today": string;
  "Resolved Today": string;
  "Escalated Today": string;
  "Avg Resolution Time": string;
  "Open Tickets EOD": string;
  "In Progress EOD": string;
  "Escalated EOD": string;
  "Total Active": string;
}

export default function DailyMetricsDashboard() {
  const [data, setData] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("https://hp-ticket-flow.vercel.app/api/get-daily-metrics");
      const result = await response.json();
      
      // Group by date only (YYYY-MM-DD), keep the latest entry per date
      const grouped: { [key: string]: DailyMetric } = {};
      
      (result.data || []).forEach((entry: DailyMetric) => {
        const dateOnly = entry.Date.split('T')[0];
        const timestamp = new Date(entry.Date).getTime();
        
        if (!grouped[dateOnly] || new Date(grouped[dateOnly].Date).getTime() < timestamp) {
          grouped[dateOnly] = { ...entry };
        }
      });
      
      const uniqueData = Object.values(grouped).sort((a, b) => 
        new Date(b.Date).getTime() - new Date(a.Date).getTime()
      );
      
      setData(uniqueData);
    } catch (error) {
      console.error("Error fetching daily metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on selected date
  const filteredData = selectedDate === "all" 
    ? data 
    : data.filter(d => d.Date.split('T')[0] === selectedDate);

  const displayData = selectedDate === "all" ? data.slice(0, 30) : filteredData;
  const last30Days = displayData.slice(0, 30).reverse();

  const trendData = last30Days.map((d) => ({
    date: new Date(d.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    created: parseInt(d["New Today"] || "0"),
    closed: parseInt(d["Closed Today"] || "0"),
    resolved: parseInt(d["Resolved Today"] || "0"),
  }));

  const backlogData = last30Days.map((d) => ({
    date: new Date(d.Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    backlog: parseInt(d["Total Active"] || "0"),
    open: parseInt(d["Open Tickets EOD"] || "0"),
  }));

  // Calculate metrics from filtered data
  const metricsData = selectedDate === "all" ? data.slice(0, 7) : filteredData;
  const totalCreated = metricsData.reduce((sum, d) => sum + parseInt(d["New Today"] || "0"), 0);
  const totalClosed = metricsData.reduce((sum, d) => sum + parseInt(d["Closed Today"] || "0"), 0);
  const avgCreatedPerDay = selectedDate === "all" ? (totalCreated / 7).toFixed(1) : totalCreated.toString();
  const avgClosedPerDay = selectedDate === "all" ? (totalClosed / 7).toFixed(1) : totalClosed.toString();
  const netChange = totalCreated - totalClosed;
  const currentBacklog = displayData.length > 0 ? parseInt(displayData[0]["Total Active"] || "0") : 0;

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
      {/* Date Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Date:</label>
        <Select value={selectedDate} onValueChange={setSelectedDate}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates (Last 30 days)</SelectItem>
            {data.slice(0, 30).map((day) => (
              <SelectItem key={day.Date} value={day.Date.split('T')[0]}>
                {new Date(day.Date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedDate === "all" ? "Avg Created/Day (7d)" : "Created on Date"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCreatedPerDay}</div>
            <p className="text-xs text-muted-foreground">
              {selectedDate === "all" ? `${totalCreated} total this week` : "Tickets created"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedDate === "all" ? "Avg Closed/Day (7d)" : "Closed on Date"}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgClosedPerDay}</div>
            <p className="text-xs text-muted-foreground">
              {selectedDate === "all" ? `${totalClosed} total this week` : "Tickets closed"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Change</CardTitle>
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
            <p className="text-xs text-muted-foreground">Total active tickets</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate === "all" ? "Tickets Created vs Closed (30 days)" : "Tickets on Selected Date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#ff7c7c" name="New Today" strokeWidth={2} />
                <Line type="monotone" dataKey="closed" stroke="#82ca9d" name="Closed Today" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke="#8884d8" name="Resolved Today" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate === "all" ? "Backlog Trend (30 days)" : "Backlog on Selected Date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={backlogData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="backlog" fill="#ffc658" name="Total Active" />
                <Bar dataKey="open" fill="#8884d8" name="Open Tickets EOD" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate === "all" ? "Last 14 Days" : `Details for ${new Date(selectedDate).toLocaleDateString()}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Total Tickets</th>
                  <th className="text-right p-2">New Today</th>
                  <th className="text-right p-2">Closed Today</th>
                  <th className="text-right p-2">Resolved Today</th>
                  <th className="text-right p-2">Escalated Today</th>
                  <th className="text-right p-2">Avg Resolution Time</th>
                  <th className="text-right p-2">Open EOD</th>
                  <th className="text-right p-2">In Progress EOD</th>
                  <th className="text-right p-2">Escalated EOD</th>
                  <th className="text-right p-2">Total Active</th>
                </tr>
              </thead>
              <tbody>
                {(selectedDate === "all" ? data.slice(0, 14) : filteredData).map((day, index) => {
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">{new Date(day.Date).toLocaleDateString()}</td>
                      <td className="text-right p-2">{day["Total Tickets"]}</td>
                      <td className="text-right p-2">{day["New Today"]}</td>
                      <td className="text-right p-2">{day["Closed Today"]}</td>
                      <td className="text-right p-2">{day["Resolved Today"]}</td>
                      <td className="text-right p-2">{day["Escalated Today"]}</td>
                      <td className="text-right p-2">{day["Avg Resolution Time"]}</td>
                      <td className="text-right p-2">{day["Open Tickets EOD"]}</td>
                      <td className="text-right p-2">{day["In Progress EOD"]}</td>
                      <td className="text-right p-2">{day["Escalated EOD"]}</td>
                      <td className="text-right p-2 font-medium">{day["Total Active"]}</td>
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