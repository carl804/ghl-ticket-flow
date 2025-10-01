import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Ticket } from "@/lib/types";
import { User, Tag } from "lucide-react";

interface CompactViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

const priorityConfig = {
  Low: { color: "bg-priority-low/10 text-priority-low border-priority-low/20" },
  Medium: { color: "bg-priority-medium/10 text-priority-medium border-priority-medium/20" },
  High: { color: "bg-priority-high/10 text-priority-high border-priority-high/20" },
  Urgent: { color: "bg-priority-urgent/10 text-priority-urgent border-priority-urgent/20" },
};

const statusConfig = {
  Open: { color: "bg-status-open text-white" },
  "In Progress": { color: "bg-status-in-progress text-white" },
  "Pending Customer": { color: "bg-status-pending text-white" },
  Resolved: { color: "bg-status-resolved text-white" },
};

export function CompactView({ tickets, onTicketClick }: CompactViewProps) {
  return (
    <div className="space-y-2">
      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tickets found
          </CardContent>
        </Card>
      ) : (
        tickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-muted/50"
            onClick={() => onTicketClick(ticket)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Ticket Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{ticket.name}</span>
                      <Badge variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {ticket.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {ticket.contact.name} • {ticket.agencyName || "No agency"}
                    </p>
                  </div>
                </div>

                {/* Right: Status, Priority, Assigned */}
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`${statusConfig[ticket.status]?.color || "bg-muted text-muted-foreground"} text-xs`}>
                    {ticket.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs border ${priorityConfig[ticket.priority]?.color || "bg-muted text-muted-foreground border-muted"}`}
                  >
                    {ticket.priority}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[100px]">
                    <User className="h-3 w-3" />
                    <span className="truncate">{ticket.assignedTo || "Unassigned"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
