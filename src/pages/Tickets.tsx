import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Sparkles, RefreshCw, Search, Filter, X, LayoutList, Columns3, LayoutGrid } from "lucide-react";
import { fetchTickets, updateTicketStatus, updatePriority } from "@/lib/api-fixed";
import type { Ticket, TicketStatus, TicketPriority, Stats } from "@/lib/types";
import TableView from "@/components/tickets/TableView";
import { KanbanView } from "@/components/tickets/KanbanView";
import CompactView from "@/components/tickets/CompactView";
import TicketDetailSheet from "@/components/tickets/TicketDetailSheet";
import StatsCards from "@/components/tickets/StatsCards";
import { toast } from "sonner";

type ViewMode = "table" | "kanban" | "compact";

interface Filters {
  search: string;
  status: string;
  priority: string;
  category: string;
  assignedTo: string;
  source: string;
}

export default function Tickets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    priority: "all",
    category: "all",
    assignedTo: "all",
    source: "all",
  });

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: TicketStatus }) =>
      updateTicketStatus(ticketId, status),
    onMutate: async ({ ticketId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tickets"] });
      const previousTickets = queryClient.getQueryData<Ticket[]>(["tickets"]);
      queryClient.setQueryData<Ticket[]>(["tickets"], (old = []) =>
        old.map((t) => (t.id === ticketId ? { ...t, status } : t))
      );
      return { previousTickets };
    },
    onError: (err, variables, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(["tickets"], context.previousTickets);
      }
      toast.error("Failed to update ticket status");
    },
    onSuccess: () => {
      toast.success("Ticket status updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  // Priority change mutation
  const priorityMutation = useMutation({
    mutationFn: ({ ticketId, priority }: { ticketId: string; priority: TicketPriority }) =>
      updatePriority(ticketId, priority),
    onMutate: async ({ ticketId, priority }) => {
      await queryClient.cancelQueries({ queryKey: ["tickets"] });
      const previousTickets = queryClient.getQueryData<Ticket[]>(["tickets"]);
      queryClient.setQueryData<Ticket[]>(["tickets"], (old = []) =>
        old.map((t) => (t.id === ticketId ? { ...t, priority } : t))
      );
      return { previousTickets };
    },
    onError: (err, variables, context) => {
      if (context?.previousTickets) {
        queryClient.setQueryData(["tickets"], context.previousTickets);
      }
      toast.error("Failed to update ticket priority");
    },
    onSuccess: () => {
      toast.success("Ticket priority updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  // Calculate stats from tickets
  const stats: Stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const resolved = tickets.filter((t) => t.status === "Resolved");
    const avgMs = resolved.length > 0
      ? resolved.reduce(
          (acc, t) => acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()),
          0
        ) / resolved.length
      : 0;
    const avgHours = Math.round(avgMs / (1000 * 60 * 60));
    const avgResolutionTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`;
    
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "Open").length,
      inProgress: tickets.filter((t) => t.status === "In Progress").length,
      escalated: tickets.filter((t) => t.status === "Escalated to Dev").length,
      resolved: resolved.length,
      closed: tickets.filter((t) => t.status === "Closed").length,
      deleted: tickets.filter((t) => t.status === "Deleted").length,
      pendingCustomer: tickets.filter((t) => t.status === "Pending Customer").length,
      resolvedToday: tickets.filter(
        (t) => t.status === "Resolved" && new Date(t.updatedAt) >= todayStart
      ).length,
      avgResolutionTime,
    };
  }, [tickets]);
  
  // Filter tickets based on filters
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        !filters.search ||
        ticket.name.toLowerCase().includes(searchLower) ||
        ticket.contact.name?.toLowerCase().includes(searchLower) ||
        ticket.contact.email?.toLowerCase().includes(searchLower) ||
        ticket.contact.phone?.toLowerCase().includes(searchLower) ||
        ticket.agencyName?.toLowerCase().includes(searchLower);

      const matchesStatus = filters.status === "all" || ticket.status === filters.status;
      const matchesPriority = filters.priority === "all" || ticket.priority === filters.priority;
      const matchesCategory = filters.category === "all" || ticket.category === filters.category;
      const matchesAssignedTo = filters.assignedTo === "all" || ticket.assignedTo === filters.assignedTo;
      const matchesSource = filters.source === "all" || ticket.ticketSource === filters.source;

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignedTo && matchesSource;
    });
  }, [tickets, filters]);

  // Get unique values for filters
  const assignees = useMemo(() => {
    const unique = new Set(tickets.map((t) => t.assignedTo).filter(Boolean));
    return Array.from(unique) as string[];
  }, [tickets]);

  const handleTicketClick = (ticket: Ticket) => {
    const isIntercomTicket = ticket.ticketSource === 'Intercom' || ticket.name?.includes('[Intercom]');
    
    if (isIntercomTicket && ticket.intercomConversationId) {
      navigate(`/tickets/${ticket.id}`);
    } else {
      setSelectedTicket(ticket);
      setSheetOpen(true);
    }
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    statusMutation.mutate({ ticketId, status });
  };

  const handlePriorityChange = (ticketId: string, priority: TicketPriority) => {
    priorityMutation.mutate({ ticketId, priority });
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketId)
        ? prev.filter((id) => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTickets.length === filteredTickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(filteredTickets.map((t) => t.id));
    }
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.category !== "all" ||
    filters.assignedTo !== "all" ||
    filters.source !== "all";

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      priority: "all",
      category: "all",
      assignedTo: "all",
      source: "all",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/10 dark:to-purple-950/10">
      {/* Premium Header - Sticky */}
      <div className="sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Branding + Views */}
            <div className="flex items-center gap-6">
              {/* Title with Icon */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4890F8] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Support Tickets
                </h1>
              </div>
              
              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-full p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                    viewMode === "table"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <LayoutList className="h-3 w-3" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                    viewMode === "kanban"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <Columns3 className="h-3 w-3" />
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                    viewMode === "compact"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <LayoutGrid className="h-3 w-3" />
                  Compact
                </button>
              </div>
            </div>

            {/* Right: Refresh Button */}
            <button 
              onClick={() => refetch()}
              className="px-3 py-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-sm transition-all flex items-center gap-1.5 group"
            >
              <RefreshCw className="h-3 w-3 text-gray-700 dark:text-gray-300 group-hover:rotate-180 transition-transform duration-500" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-4 space-y-3">
        {/* Stats Bar - Single Row */}
        <StatsCards stats={stats} isLoading={isLoading} />

        {/* Filter Bar */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-md border border-gray-200/50 dark:border-gray-700/50 p-3">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-[#4890F8]" />
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
              </div>
              <input
                type="text"
                placeholder="Search by ticket, contact, phone, or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-12 pr-3 py-2 text-sm bg-gray-50/80 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#4890F8] focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium pr-2 border-r border-gray-300 dark:border-gray-600">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
              </div>
              
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-[#4890F8] hover:text-white hover:border-[#4890F8] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <option value="all">Source</option>
                <option value="Intercom">Intercom</option>
                <option value="Email">Email</option>
                <option value="Manual">Manual</option>
                <option value="Phone">Phone</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-[#4890F8] hover:text-white hover:border-[#4890F8] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <option value="all">Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Escalated to Dev">Escalated</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-[#4890F8] hover:text-white hover:border-[#4890F8] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <option value="all">Priority</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>

              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-[#4890F8] hover:text-white hover:border-[#4890F8] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <option value="all">Category</option>
                <option value="Billing">Billing</option>
                <option value="Tech">Tech</option>
                <option value="Sales">Sales</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Outage">Outage</option>
                <option value="General Questions">General</option>
              </select>

              <select
                value={filters.assignedTo}
                onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-[#4890F8] hover:text-white hover:border-[#4890F8] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <option value="all">Assignee</option>
                {assignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all"
                  title="Clear all filters"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Views */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {viewMode === "kanban" && (
              <KanbanView
                tickets={filteredTickets}
                onTicketClick={handleTicketClick}
                onStatusChange={handleStatusChange}
              />
            )}
            {viewMode === "table" && (
              <TableView
                tickets={filteredTickets}
                onTicketClick={handleTicketClick}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                selectedTickets={selectedTickets}
                onSelectTicket={handleSelectTicket}
                onSelectAll={handleSelectAll}
              />
            )}
            {viewMode === "compact" && (
              <CompactView
                tickets={filteredTickets}
                onTicketClick={handleTicketClick}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
              />
            )}
          </>
        )}
      </div>

      <TicketDetailSheet
        ticket={selectedTicket}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}