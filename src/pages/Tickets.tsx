import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { fetchTickets } from "@/lib/api";
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types";
import TableView from "@/components/tickets/TableView";
import { KanbanView } from "@/components/tickets/KanbanView";
import CompactView from "@/components/tickets/CompactView";
import TicketDetailSheet from "@/components/tickets/TicketDetailSheet";

// Define ViewMode locally until it's added to @/lib/types
type ViewMode = "table" | "kanban" | "compact";

export default function Tickets() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });
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
    if (selectedTickets.length === tickets.length) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(tickets.map((t) => t.id));
    }
  };
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="compact">Compact</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : viewMode === "table" ? (
        <TableView
          tickets={tickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          selectedTickets={selectedTickets}
          onSelectTicket={handleSelectTicket}
          onSelectAll={handleSelectAll}
        />
      ) : viewMode === "kanban" ? (
        <KanbanView
          tickets={tickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <CompactView
          tickets={tickets}
          onTicketClick={handleTicketClick}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
        />
      )}
      <TicketDetailSheet
        ticket={selectedTicket}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}