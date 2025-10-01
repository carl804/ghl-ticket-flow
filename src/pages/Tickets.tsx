// src/pages/Tickets.tsx
import React, { useEffect, useState } from "react";
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
import type { Ticket, TicketStatus, TicketPriority, Stats } from "@/lib/types";
import KanbanView from "@/components/tickets/KanbanView";
import TicketDetailSheet from "@/components/tickets/TicketDetailSheet";
import StatsCards from "@/components/tickets/StatsCards";
import { toast } from "sonner";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    initializeFieldMap();
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      setLoading(true);
      const t = await fetchTickets();
      const s = await fetchStats();
      setTickets(t);
      setStats(s);
    } catch (err: any) {
      toast.error(`Failed to load tickets: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(ticketId: string, status: string) {
    try {
      await updateTicketStatus(ticketId, status as TicketStatus); // ✅ cast to TicketStatus
      toast.success("Status updated");
      await loadTickets();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handlePriorityChange(ticketId: string, priority: string) {
    try {
      await updatePriority(ticketId, priority as TicketPriority); // ✅ cast to TicketPriority
      toast.success("Priority updated");
      await loadTickets();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleBulkStatus(ids: string[], status: string) {
    try {
      await bulkUpdateStatus(ids, status as TicketStatus); // ✅ cast
      toast.success("Bulk status update complete");
      await loadTickets();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleBulkPriority(ids: string[], priority: string) {
    try {
      await bulkUpdatePriority(ids, priority as TicketPriority); // ✅ cast
      toast.success("Bulk priority update complete");
      await loadTickets();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Tickets</h1>

      {stats && <StatsCards stats={stats} />}

      {loading ? (
        <p>Loading tickets...</p>
      ) : (
        <KanbanView
          tickets={tickets}
          onTicketClick={(t) => setSelectedTicket(t)}
        />
      )}

      {selectedTicket && (
        <TicketDetailSheet
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
        />
      )}
    </div>
  );
}
