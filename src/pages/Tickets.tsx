import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import type { Ticket, TicketStatus, TicketPriority, ViewMode } from "@/lib/types";

import { StatsCards } from "@/components/tickets/StatsCards";
import { TableView } from "@/components/tickets/TableView";
import { CompactView } from "@/components/tickets/CompactView";
import { KanbanView } from "@/components/tickets/KanbanView";
import { TicketDetailSheet } from "@/components/tickets/TicketDetailSheet";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  // Example stats (replace with real API data)
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    pendingCustomer: tickets.filter((t) => t.status === "Pending Customer").length,
    resolvedToday: 0,
    avgResolutionTime: "2h 14m",
  };

  const handleTicketClick = (ticket: Ticket) => {
    setActiveTicket(ticket);
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
    );
  };

  const handlePriorityChange = (ticketId: string, priority: TicketPriority) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, priority } : t))
    );
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets((prev) =>
      prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTickets.length === tickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(tickets.map((t) => t.id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Overview */}
      <StatsCards stats={stats} />

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="compact">Compact</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* View Modes */}
      {viewMode === "table" && (
        <TableView
          tickets={tickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          selectedTickets={selectedTickets}
          onSelectTicket={handleSelectTicket}
          onSelectAll={handleSelectAll}
        />
      )}

      {viewMode === "kanban" && (
        <KanbanView
          tickets={tickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleStatusChange}
        />
      )}

      {viewMode === "compact" && (
        <CompactView
          tickets={tickets}
          onTicketClick={handleTicketClick}
          selectedTickets={selectedTickets}
          onSelectTicket={handleSelectTicket}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* Ticket Detail Drawer */}
      {activeTicket && (
        <TicketDetailSheet
          ticket={activeTicket}
          open={!!activeTicket}
          onOpenChange={(open) => !open && setActiveTicket(null)}
        />
      )}
    </div>
  );
}
