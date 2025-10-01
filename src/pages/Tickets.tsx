import { useState, useEffect, useMemo } from "react";
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
import StatsCards from "@/components/tickets/StatsCards";
import KanbanView from "@/components/tickets/KanbanView";
import TableView from "@/components/tickets/TableView";
import CompactView from "@/components/tickets/CompactView";
import TicketDetailSheet from "@/components/tickets/TicketDetailSheet";
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
import {
  Loader2,
  LayoutGrid,
  Table as TableIcon,
  List,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";

export default function Tickets() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "all",
    priority: "all",
    category: "all",
    assignedTo: "all",
  });

  useEffect(() => {
    initializeFieldMap();
  }, []);

  // ------------------- Queries -------------------
  const {
    data: tickets = [],
    isLoading: ticketsLoading,
    error: ticketsError,
    refetch: refetchTickets,
    isFetching: ticketsFetching,
  } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
    refetchInterval: 60000,
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 60000,
  });

  // ------------------- Refresh -------------------
  const handleRefresh = async () => {
    try {
      await Promise.all([refetchTickets(), refetchStats()]);
      toast.success("Tickets refreshed ✅");
    } catch {
      toast.error("Failed to refresh tickets", {
        action: {
          label: "Retry",
          onClick: () => handleRefresh(),
        },
      });
    }
  };

  // ------------------- Mutations -------------------
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
    onError: (_, __, context) => {
      toast.error("Failed to update status");
      if (context?.previousTickets) {
        queryClient.setQueryData(["tickets"], context.previousTickets);
      }
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
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
    onError: (_, __, context) => {
      toast.error("Failed to update priority");
      if (context?.previousTickets) {
        queryClient.setQueryData(["tickets"], context.previousTickets);
      }
    },
    onSuccess: () => {
      toast.success("Priority updated");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TicketStatus }) =>
      bulkUpdateStatus(ids, status),
    onSuccess: () => {
      toast.success(`${selectedTickets.length} tickets updated`);
      setSelectedTickets([]);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: () => toast.error("Bulk update failed"),
  });

  const bulkPriorityMutation = useMutation({
    mutationFn: ({ ids, priority }: { ids: string[]; priority: TicketPriority }) =>
      bulkUpdatePriority(ids, priority),
    onSuccess: () => {
      toast.success(`${selectedTickets.length} tickets updated`);
      setSelectedTickets([]);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Bulk update failed"),
  });

  // ------------------- Filters -------------------
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          ticket.name.toLowerCase().includes(search) ||
          ticket.contact.name?.toLowerCase().includes(search) ||
          ticket.contact.email?.toLowerCase().includes(search) ||
          ticket.contact.phone?.includes(search);
        if (!matchesSearch) return false;
      }
      if (filters.status !== "all" && ticket.status !== filters.status) return false;
      if (filters.priority !== "all" && ticket.priority !== filters.priority) return false;
      if (filters.category !== "all" && ticket.category !== filters.category) return false;
      if (filters.assignedTo !== "all" && ticket.assignedTo !== filters.assignedTo) return false;
      return true;
    });
  }, [tickets, filters]);

  const agencies = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.agencyName).filter(Boolean) as string[])),
    [tickets]
  );
  const assignees = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.assignedTo).filter(Boolean) as string[])),
    [tickets]
  );

  // ------------------- Handlers -------------------
  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
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

  // ------------------- Render -------------------
  if (ticketsError) {
    return (
      <div className="min-h-screen bg-dashboard-bg p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load tickets. Please try again.
            <Button
              variant="link"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["tickets"] })}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <div className="bg-background border-b pb-4 pt-6 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Tickets Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage and track all support tickets</p>
          </div>

          <div className="flex items-center gap-2">
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

            <Button
              variant="outline"
              size="default"
              onClick={handleRefresh}
              disabled={ticketsFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${ticketsFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>

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

        {USE_MOCK_DATA && (
          <Alert className="mb-4">
            <AlertDescription>
              <strong>Mock data active.</strong> Set VITE_GHL_API_TOKEN to connect to live data.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6">
          <StatsCards stats={stats!} isLoading={statsLoading} />
        </div>

        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          agencies={agencies}
          assignees={assignees}
        />
      </div>

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

      <TicketDetailSheet
        ticket={selectedTicket}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
