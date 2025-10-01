import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import type { Ticket } from "@/lib/types";

interface CompactViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  selectedTickets: string[];
  onSelectTicket: (ticketId: string) => void;
  onSelectAll: () => void;
}

export function CompactView({
  tickets,
  onTicketClick,
  selectedTickets,
  onSelectTicket,
  onSelectAll,
}: CompactViewProps) {
  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center p-2 border-b">
        <Checkbox
          checked={selectedTickets.length === tickets.length && tickets.length > 0}
          onCheckedChange={onSelectAll}
        />
        <span className="ml-2 text-sm text-muted-foreground">Select All</span>
      </div>
      <ul>
        {tickets.length === 0 ? (
          <li className="p-4 text-center text-muted-foreground">No tickets found</li>
        ) : (
          tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="p-3 border-b hover:bg-muted/50 cursor-pointer flex items-center justify-between"
              onClick={() => onTicketClick(ticket)}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedTickets.includes(ticket.id)}
                  onCheckedChange={() => onSelectTicket(ticket.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <p className="font-medium">{ticket.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.contact.name || "-"} ·{" "}
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{ticket.status}</Badge>
                <Badge variant="outline">{ticket.priority}</Badge>
                <Badge variant="outline">{ticket.category}</Badge>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
