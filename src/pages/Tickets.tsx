import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatsCards } from "@/components/tickets/StatsCards";
import { KanbanView } from "@/components/tickets/KanbanView";
import { TableView } from "@/components/tickets/TableView";
import { CompactView } from "@/components/tickets/CompactView";
import { FilterBar, type Filters } from "@/components/tickets/FilterBar";
import {
  fetchTickets,
  fetchStats,
  updateTicketStatus,
  updatePriority,
  bulkUpdateStatus,
  bulkUpdatePriority,
  initializeFieldMap,
  USE_MOCK_DATA,
} from "@/lib/api";
import type { Ticket, ViewMode, TicketStatus, TicketPriority } from "@/lib/types";
import { toast } from "sonner";
import { Loader2, LayoutGrid, Table as TableIcon, List, MoreHorizontal } from "lucide-react";

export default function Tickets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    priority: "all",
    category: "all",
    assignedTo: "all",
  });

  // Initialize field map on mount
  useEffect(() => {
    initializeFieldMap();
  }, []);

  // Queries
  const {
    data: tickets = [],
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
    refetchInterval: 30000, // Refetch every 30s
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  // Mutations
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
    onSuccess: () => {
      toast.success("Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error, _, context) => {
      toast.error("Failed to update status");
      if (context?.previousTickets) {
        queryClient.setQueryData(["tickets"], context.previousTickets);
      }
    },
  });

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
    onSuccess: () => {
      toast.success("Priority updated successfully");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (error, _, context) => {
      toast.error("Failed to update priority");
      if (context?.previousTickets) {
        queryClient.setQueryData(["tickets"], context.previousTickets);
      }
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      bulkUpdateStatus(ids, status),
    onSuccess: () => {
      toast.success(`${selectedTickets.length} tickets updated`);
      setSelectedTickets([]);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => {
      toast.error("Failed to update tickets");
    },
  });

  const bulkPriorityMutation = useMutation({
    mutationFn: ({ ids, priority }: { ids: string[]; priority: string }) =>
      bulkUpdatePriority(ids, priority),
    onSuccess: () => {
      toast.success(`${selectedTickets.length} tickets updated`);
      setSelectedTickets([]);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => {
      toast.error("Failed to update tickets");
    },
  });

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          ticket.name.toLowerCase().includes(search) ||
          ticket.contact.name.toLowerCase().includes(search) ||
          ticket.contact.email?.toLowerCase().includes(search) ||
          ticket.contact.phone?.includes(search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== "all" && ticket.status !== filters.status) return false;

      // Priority filter
      if (filters.priority !== "all" && ticket.priority !== filters.priority) return false;

      // Category filter
      if (filters.category !== "all" && ticket.category !== filters.category) return false;

      // Assigned to filter
      if (filters.assignedTo !== "all" && ticket.assignedTo !== filters.assignedTo) return false;

      return true;
    });
  }, [tickets, filters]);

  // Extract unique values for filters
  const agencies = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.agencyName).filter(Boolean) as string[])),
    [tickets]
  );
  const assignees = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.assignedTo).filter(Boolean) as string[])),
    [tickets]
  );

  // Handlers
  const handleTicketClick = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTickets.length === filteredTickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(filteredTickets.map((t) => t.id));
    }
  };

  if (ticketsError) {
    return (
      <div className="min-h-screen bg-dashboard-bg p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load tickets. Please try again.
            <Button variant="link" onClick={() => queryClient.invalidateQueries({ queryKey: ["tickets"] })}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <div className="sticky top-0 z-10 bg-dashboard-bg border-b pb-4 pt-6 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Tickets Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all support tickets
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Actions */}
            {selectedTickets.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {selectedTickets.length} selected
                    <MoreHorizontal className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      bulkStatusMutation.mutate({ ids: selectedTickets, status: "Resolved" })
                    }
                  >
                    Mark as Resolved
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      bulkPriorityMutation.mutate({ ids: selectedTickets, priority: "Urgent" })
                    }
                  >
                    Set Priority: Urgent
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* View Switcher */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="kanban">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="table">
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </TabsTrigger>
                <TabsTrigger value="compact">
                  <List className="h-4 w-4 mr-2" />
                  Compact
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Mock Data Banner */}
        {USE_MOCK_DATA && (
          <Alert className="mb-4">
            <AlertDescription>
              <strong>Mock data active.</strong> Set VITE_GHL_API_TOKEN to connect to live data.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="mb-6">
          <StatsCards stats={stats!} isLoading={statsLoading} />
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          agencies={agencies}
          assignees={assignees}
        />
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {ticketsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanView
            tickets={filteredTickets}
            onStatusChange={(id, status) => statusMutation.mutate({ ticketId: id, status })}
            onTicketClick={handleTicketClick}
          />
        ) : viewMode === "table" ? (
          <TableView
            tickets={filteredTickets}
            onTicketClick={handleTicketClick}
            onStatusChange={(id, status) => statusMutation.mutate({ ticketId: id, status })}
            onPriorityChange={(id, priority) => priorityMutation.mutate({ ticketId: id, priority })}
            selectedTickets={selectedTickets}
            onSelectTicket={handleSelectTicket}
            onSelectAll={handleSelectAll}
          />
        ) : (
          <CompactView tickets={filteredTickets} onTicketClick={handleTicketClick} />
        )}
      </div>
    </div>
  );
}
