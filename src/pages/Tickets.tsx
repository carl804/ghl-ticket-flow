import React, { useState, useEffect } from "react";
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
import { TableView } from "@/components/tickets/TableView";
import { CompactView } from "@/components/tickets/CompactView";
import { TicketDetailSheet } from "@/components/tickets/TicketDetailSheet";
import { StatsCards } from "@/components/tickets/StatsCards";
import { toast } from "sonner";

type ViewMode = "kanban" | "table" | "compact";

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    initializeFieldMap();
  }, []);

  const {
    data: tickets = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Ticket[]>({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
    refetchInterval: 60000,
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 60000,
  });

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

  const handleTicketClick = (t: Ticket) => {
    setSelectedTicket(t);
    setDetailOpen(true);
  };

  const handleStatusChange = (ticketId: string, status: string) => {
    statusMutation.mutate({ id: ticketId, status: status as TicketStatus });
  };

  const handlePriorityChange = (ticketId: string, priority: string) => {
    priorityMutation.mutate({ id: ticketId, priority: priority as TicketPriority });
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Tickets Dashboard</h1>

      {stats && <StatsCards stats={stats} />}

      <div className="flex gap-2 items-center">
        <button onClick={() => setViewMode("kanban")}>Kanban</button>
        <button onClick={() => setViewMode("table")}>Table</button>
        <button onClick={() => setViewMode("compact")}>Compact</button>
        <button onClick={() => refetch()}>Force Refresh</button>
      </div>

      {isLoading && <p>Loading tickets...</p>}
      {isError && <p className="text-red-500">Failed to load tickets. Please try again.</p>}

      {!isLoading && !isError && (
        <>
          {viewMode === "kanban" && (
            <KanbanView tickets={tickets} onTicketClick={handleTicketClick} />
          )}
          {viewMode === "table" && (
            <TableView
              tickets={tickets}
              onTicketClick={handleTicketClick}
            />
          )}
          {viewMode === "compact" && (
            <CompactView
              tickets={tickets}
              onTicketClick={handleTicketClick}
            />
          )}
        </>
      )}

      <TicketDetailSheet
        ticket={selectedTicket}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
