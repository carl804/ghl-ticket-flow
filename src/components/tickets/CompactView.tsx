import type { Ticket } from "@/lib/types";

interface CompactViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

export function CompactView({ tickets, onTicketClick }: CompactViewProps) {
  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="border p-2 rounded-md cursor-pointer hover:bg-muted/50"
          onClick={() => onTicketClick(ticket)}
        >
          <p className="font-medium">{ticket.name}</p>
          <p className="text-sm text-muted-foreground">{ticket.status} • {ticket.priority}</p>
        </div>
      ))}
    </div>
  );
}

export default CompactView;
