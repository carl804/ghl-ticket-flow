import type { Ticket } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface CompactViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

export default function CompactView({ tickets, onTicketClick }: CompactViewProps) {
  return (
    <div className="divide-y rounded-md border bg-card">
      {tickets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No tickets found
        </div>
      ) : (
        tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="p-3 hover:bg-muted/50 cursor-pointer flex items-center justify-between"
            onClick={() => onTicketClick(ticket)}
          >
            <div>
              <p className="font-medium">{ticket.name}</p>
              <p className="text-xs text-muted-foreground">{ticket.contact?.name || "Unknown"}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{ticket.status}</Badge>
              <Badge variant="outline">{ticket.priority}</Badge>
              <Badge variant="outline">{ticket.category}</Badge>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
