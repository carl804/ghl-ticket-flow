import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { fetchTickets } from "@/lib/api";
import type { Ticket, TicketStatus, TicketPriority, Stats } from "@/lib/types";
import TableView from "@/components/tickets/TableView";
import { KanbanView } from "@/components/tickets/KanbanView";
import CompactView from "@/components/tickets/CompactView";
import TicketDetailSheet from "@/components/tickets/TicketDetailSheet";
import StatsCards from "@/components/tickets/StatsCards";
import { FilterBar, type Filters } from "@/components/tickets/FilterBar";

type ViewMode = "table" | "kanban" | "compact";

export default function Tickets() {
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
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
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

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignedTo;
    });
  }, [tickets, filters]);

  // Get unique values for filters
  const agencies = useMemo(() => {
    const unique = new Set(tickets.map((t) => t.agencyName).filter(Boolean));
    return Array.from(unique) as string[];
  }, [tickets]);

  const assignees = useMemo(() => {
    const unique = new Set(tickets.map((t) => t.assignedTo).filter(Boolean));
    return Array.from(unique) as string[];
  }, [tickets]);

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSheetOpen(true);
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    const updated = tickets.map((t) =>
      t.id === ticketId ? { ...t, status } : t
    );
    queryClient.setQueryData(["tickets"], updated);
    queryClient.invalidateQueries({ queryKey: ["tickets"] as const });
  };

  const handlePriorityChange = (ticketId: string, priority: TicketPriority) => {
    const updated = tickets.map((t) =>
      t.id === ticketId ? { ...t, priority } : t
    );
    queryClient.setQueryData(["tickets"], updated);
    queryClient.invalidateQueries({ queryKey: ["tickets"] as const });
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="compact">Compact</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={isLoading} />

      {/* Filter Bar */}
      <div className="mb-6">
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          agencies={agencies}
          assignees={assignees}
        />
      </div>

      {/* Views */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : viewMode === "table" ? (
        <TableView
          tickets={filteredTickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          selectedTickets={selectedTickets}
          onSelectTicket={handleSelectTicket}
          onSelectAll={handleSelectAll}
        />
      ) : viewMode === "kanban" ? (
        <KanbanView
          tickets={filteredTickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <CompactView
          tickets={filteredTickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
        />
      )}

      {/* Ticket Detail Sheet */}
      <TicketDetailSheet
        ticket={selectedTicket}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}