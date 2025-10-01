import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTickets,
  fetchStats,
  updateTicketStatus,
  updatePriority,
  bulkUpdateStatus,
  bulkUpdatePriority,
  initializeFieldMap,
} from "@/lib/api";

import type { Ticket, TicketStatus, TicketPriority, Stats } from "@/lib/types";

import KanbanView from "@/components/tickets/KanbanView";
import TableView from "@/components/tickets/TableView";
import CompactView from "@/components/tickets/CompactView";
import { TicketDetailSheet } from "@/components/tickets/TicketDetailSheet"; // ✅ fixed
import { StatsCards } from "@/components/tickets/StatsCards"; // ✅ fixed

// Define view modes here instead of importing ViewMode
type ViewMode = "kanban" | "table" | "compact";

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Fetch field map (custom fields) once on load
  React.useEffect(() => {
    initializeFieldMap();
  }, []);

  // Fetch tickets
  const {
    data: tickets = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Ticket[]>({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
    refetchInterval: 60000, // auto-refresh every 60s
  });

  // Fetch stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 60000,
  });

  // Mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      updateTicketStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: TicketPriority }) =>
      updatePriority(id, priority),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TicketStatus }) =>
      bulkUpdateStatus(ids, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const bulkPriorityMutation = useMutation({
    mutationFn: ({ ids, priority }: { ids: string[]; priority: TicketPriority }) =>
      bulkUpdatePriority(ids, priority),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });

  // UI handlers
  const handleTicketClick = (ticket: Ticket) => setSelectedTicket(ticket);

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    statusMutation.mutate({ id: ticketId, status: newStatus as TicketStatus });
  };

  const handlePriorityChange = (ticketId: string, newPriority: string) => {
    priorityMutation.mutate({ id: ticketId, priority: newPriority as TicketPriority });
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Tickets Dashboard</h1>

      {/* Stats */}
      {stats && <StatsCards stats={stats} />}

      {/* Controls */}
      <div className="flex gap-2 items-center">
        <button onClick={() => setViewMode("kanban")}>Kanban</button>
        <button onClick={() => setViewMode("table")}>Table</button>
        <button onClick={() => setViewMode("compact")}>Compact</button>
        <button onClick={() => refetch()}>Force Refresh</button>
      </div>

      {/* Content */}
      {isLoading && <p>Loading tickets...</p>}
      {isError && (
        <p className="text-red-500">Failed to load tickets. Please try again.</p>
      )}
      {!isLoading && !isError && (
        <>
          {viewMode === "kanban" && (
            <KanbanView tickets={tickets} onTicketClick={handleTicketClick} />
          )}
          {viewMode === "table" && (
            <TableView
              tickets={tickets}
              onTicketClick={handleTicketClick}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
            />
          )}
          {viewMode === "compact" && (
            <CompactView tickets={tickets} onTicketClick={handleTicketClick} />
          )}
        </>
      )}

      {/* Ticket Detail Sheet */}
      {selectedTicket && (
        <TicketDetailSheet
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
