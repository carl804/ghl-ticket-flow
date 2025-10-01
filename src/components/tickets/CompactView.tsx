import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Ticket } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface CompactViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

function CompactView({ tickets, onTicketClick }: CompactViewProps) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No tickets found
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {tickets.map((ticket) => (
        <Card
          key={ticket.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onTicketClick(ticket)}
        >
          <CardContent className="flex items-center justify-between py-3 px-4">
            <div>
              <div className="font-medium">{ticket.name}</div>
              <div className="text-xs text-muted-foreground">
                {ticket.contact.name} •{" "}
                {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant="outline">{ticket.status}</Badge>
              <Badge variant="outline">{ticket.priority}</Badge>
              <Badge variant="outline">{ticket.category}</Badge>
              <Button variant="ghost" size="sm">
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default CompactView;
