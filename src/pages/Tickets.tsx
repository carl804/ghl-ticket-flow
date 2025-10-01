import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCards from "@/components/tickets/StatsCards";
import KanbanView from "@/components/tickets/KanbanView";
import TableView from "@/components/tickets/TableView";
import CompactView from "@/components/tickets/CompactView";
import TicketDetailSheet from "@/components/tickets/TicketDetailSheet";
import type { Ticket, TicketStatus, TicketPriority, ViewMode, Stats } from "@/lib/types";
import { fetchTickets, updateTicket } from "@/lib/api";
import { toast } from "sonner";

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  // ✅ fetch tickets
  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  // ✅ update ticket mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Ticket> }) =>
      updateTicket(id, updates),
    onSuccess: () => {
      toast.success("Ticket updated");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Failed to update ticket"),
  });

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    updateMutation.mutate({ id: ticketId, updates: { status } });
  };

  const handlePriorityChange = (ticketId: string, priority: TicketPriority) => {
    updateMutation.mutate({ id: ticketId, updates: { priority } });
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

  // ✅ sample stats
  const stats: Stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    pendingCustomer: tickets.filter((t) => t.status === "Pending Customer").length,
    resolvedToday: tickets.filter((t) => t.status === "Resolved").length,
    avgResolutionTime: "2d 4h", // placeholder
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries(["tickets"])}>
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="compact">Compact</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <KanbanView
            tickets={tickets}
            onTicketClick={handleTicketClick}
            onStatusChange={handleStatusChange}
          />
        </TabsContent>

        <TabsContent value="table">
          <TableView
            tickets={tickets}
            onTicketClick={handleTicketClick}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            selectedTickets={selectedTickets}
            onSelectTicket={handleSelectTicket}
            onSelectAll={handleSelectAll}
          />
        </TabsContent>

        <TabsContent value="compact">
          <CompactView tickets={tickets} onTicketClick={handleTicketClick} />
        </TabsContent>
      </Tabs>

      {/* Ticket Detail Drawer */}
      {selectedTicket && (
        <TicketDetailSheet
          ticket={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(open) => {
            if (!open) setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}
