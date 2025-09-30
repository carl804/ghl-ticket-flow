import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, Clock, Phone, Mail } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  isDragging?: boolean;
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

export function TicketCard({ ticket, onClick, isDragging }: TicketCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
        isDragging ? "opacity-50" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{ticket.name}</p>
            <p className="text-xs text-muted-foreground truncate">{ticket.contact.name}</p>
          </div>
          <Badge className={`${statusConfig[ticket.status].color} shrink-0`}>
            {ticket.status}
          </Badge>
        </div>

        {/* Category & Priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {ticket.category}
          </Badge>
          <Badge 
            variant="outline" 
            className={`text-xs border ${priorityConfig[ticket.priority].color}`}
          >
            {ticket.priority}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {ticket.contact.email && (
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{ticket.contact.email}</span>
            </div>
          )}
          {ticket.contact.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{ticket.contact.phone}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate">{ticket.assignedTo || "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
