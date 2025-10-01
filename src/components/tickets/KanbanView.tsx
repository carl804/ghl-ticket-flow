import { useState } from "react";
import type { Ticket, TicketStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface KanbanViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
}

const statusColumns: Record<TicketStatus, string> = {
  Open: "Open",
  "In Progress": "In Progress",
  "Pending Customer": "Pending Customer",
  Resolved: "Resolved",
};

function KanbanView({ tickets, onTicketClick, onStatusChange }: KanbanViewProps) {
  const [draggingTicket, setDraggingTicket] = useState<Ticket | null>(null);

  const handleDragStart = (ticket: Ticket) => {
    setDraggingTicket(ticket);
  };

  const handleDrop = (status: TicketStatus) => {
    if (draggingTicket) {
      onStatusChange(draggingTicket.id, status);
      setDraggingTicket(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Object.entries(statusColumns).map(([statusKey, label]) => (
        <div
          key={statusKey}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(statusKey as TicketStatus)}
          className="bg-muted rounded-md p-3 min-h-[400px]"
        >
          <h3 className="font-semibold mb-3">{label}</h3>
          <div className="space-y-3">
            {tickets
              .filter((t) => t.status === statusKey)
              .map((ticket) => (
                <Card
                  key={ticket.id}
                  draggable
                  onDragStart={() => handleDragStart(ticket)}
                  className="cursor-move"
                  onClick={() => onTicketClick(ticket)}
                >
                  <CardHeader className="flex items-center justify-between p-3">
                    <CardTitle className="text-sm font-medium">{ticket.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(["Open", "In Progress", "Pending Customer", "Resolved"] as TicketStatus[]).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => onStatusChange(ticket.id, s)}>
                            {s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{ticket.contact.name}</p>
                    <Badge variant="outline" className="mt-2">
                      {ticket.priority}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default KanbanView;
