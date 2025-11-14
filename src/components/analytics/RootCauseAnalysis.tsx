import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Bug, BookOpen, Lightbulb, CreditCard, Plug, Settings, Zap, Database, HelpCircle, TrendingUp, RefreshCw } from "lucide-react";
import { getAccessToken } from "@/integrations/ghl/oauth";

const CATEGORY_ICONS = {
  "Product Bugs": Bug,
  "User Education": BookOpen,
  "Feature Requests": Lightbulb,
  "Billing Issues": CreditCard,
  "Integration Problems": Plug,
  "Configuration Help": Settings,
  "Performance Issues": Zap,
  "Data Issues": Database,
  "Other": HelpCircle
};

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6b7280'];

interface TopIssue {
  issue: string;
  count: number;
}

interface Category {
  name: string;
  count: number;
  percentage: number;
  topIssues: TopIssue[];
}

interface RootCauseData {
  success: boolean;
  days: number;
  totalTickets: number;
  analyzedTickets: number;
  categories: Category[];
  insights: string[];
  fetchedAt: string;
  cached?: boolean;
  cacheAge?: string;
  newTicketsSinceCache?: number;
  nextAnalysisAt?: string;
}

export default function RootCauseAnalysis() {
  const [timeRange, setTimeRange] = useState<string>("30");
  const [forceRefresh, setForceRefresh] = useState<boolean>(false);

  const { data, isLoading, error, refetch } = useQuery<RootCauseData>({
    queryKey: ['root-cause', timeRange, forceRefresh],
    queryFn: async () => {
      const token = await getAccessToken();
      const forceParam = forceRefresh ? '&force=true' : '';
      const response = await fetch(`/api/analytics?type=root-cause&days=${timeRange}${forceParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch root cause analysis');
      const result = await response.json();
      
      // Reset force refresh flag after successful fetch
      if (forceRefresh) {
        setForceRefresh(false);
      }
      
      return result;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const handleForceRefresh = () => {
    setForceRefresh(true);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">
          {forceRefresh ? "Re-analyzing with AI..." : "Analyzing root causes with AI..."}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-red-600">Error loading analysis: {error.message}</div>
      </div>
    );
  }

  if (!data || !data.categories || data.categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Root Cause Analysis</h2>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceRefresh}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Refresh
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>No tickets with AI summaries found in the selected time range.</p>
              <p className="mt-2">Total tickets: {data?.totalTickets || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pieData = data.categories.map((cat, index) => ({
    name: cat.name,
    value: cat.count,
    percentage: cat.percentage,
    fill: COLORS[index % COLORS.length]
  }));

  const barData = data.categories
    .sort((a, b) => b.count - a.count)
    .map((cat, index) => ({
      name: cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name,
      fullName: cat.name,
      count: cat.count,
      fill: COLORS[index % COLORS.length]
    }));

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector and Force Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Root Cause Analysis</h2>
            {data.cached && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                📦 Cached
              </Badge>
            )}
            {!data.cached && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✨ Fresh
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered analysis of {data.analyzedTickets} tickets (out of {data.totalTickets} total)
            {data.cached && data.cacheAge && (
              <span className="ml-2 text-blue-600">
                • {data.cacheAge} old
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Force Refresh
          </Button>
        </div>
      </div>

      {/* Cache Info Banner */}
      {data.cached && data.newTicketsSinceCache !== undefined && (
        <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                📊 Using cached analysis • {data.newTicketsSinceCache} new tickets since cache • 
                Next auto-refresh: {data.nextAnalysisAt}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleForceRefresh}
                className="text-blue-600 hover:text-blue-700"
              >
                Refresh Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Banner */}
      {data.insights && data.insights.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <TrendingUp className="h-5 w-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.insights.map((insight, index) => (
                <li key={index} className="text-blue-800 dark:text-blue-200 flex items-start gap-2">
                  <span className="font-bold">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pain Point Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => {
                    const shortName = name.length > 18 ? name.substring(0, 15) + '...' : name;
                    return `${shortName}: ${(percent * 100).toFixed(1)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${value} tickets (${props.payload.percentage}%)`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border rounded shadow-lg">
                          <p className="font-semibold">{payload[0].payload.fullName}</p>
                          <p className="text-sm">{payload[0].value} tickets</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.categories.map((category, index) => {
          const Icon = CATEGORY_ICONS[category.name as keyof typeof CATEGORY_ICONS] || HelpCircle;
          return (
            <Card key={category.name} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" style={{ color: COLORS[index % COLORS.length] }} />
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                    {category.percentage}%
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{category.count} tickets</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Top Issues:</p>
                  <ul className="space-y-1">
                    {category.topIssues.slice(0, 3).map((issue, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="font-medium text-foreground">{issue.count}×</span>
                        <span>{issue.issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}