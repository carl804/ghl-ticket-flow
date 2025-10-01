import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface CompactViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onPriorityChange: (ticketId: string, priority: TicketPriority) => void;
}

const priorityColors: Record<TicketPriority, string> = {
  Low: "bg-priority-low/10 text-priority-low border-priority-low/20",
  Medium: "bg-priority-medium/10 text-priority-medium border-priority-medium/20",
  High: "bg-priority-high/10 text-priority-high border-priority-high/20",
  Urgent: "bg-priority-urgent/10 text-priority-urgent border-priority-urgent/20",
};

const statusColors: Record<TicketStatus, string> = {
  Open: "bg-status-open text-white",
  "In Progress": "bg-status-in-progress text-white",
  "Pending Customer": "bg-status-pending text-white",
  Resolved: "bg-status-resolved text-white",
};

export default function CompactView({
  tickets,
  onTicketClick,
  onStatusChange,
  onPriorityChange,
}: CompactViewProps) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tickets found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-center justify-between rounded-md border bg-card px-4 py-3 hover:bg-muted/50 cursor-pointer"
          onClick={() => onTicketClick(ticket)}
        >
          <div className="flex flex-col">
            <span className="font-medium">{ticket.name}</span>
            <span className="text-xs text-muted-foreground">
              {ticket.contact.name || "-"} • {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge className={`${statusColors[ticket.status]} cursor-pointer`}>
                  {ticket.status}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(["Open", "In Progress", "Pending Customer", "Resolved"] as TicketStatus[]).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(ticket.id, status);
                    }}
                  >
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Badge
                  variant="outline"
                  className={`${priorityColors[ticket.priority]} cursor-pointer border`}
                >
                  {ticket.priority}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(["Low", "Medium", "High", "Urgent"] as TicketPriority[]).map((priority) => (
                  <DropdownMenuItem
                    key={priority}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPriorityChange(ticket.id, priority);
                    }}
                  >
                    {priority}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTicketClick(ticket)}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(ticket.id, "Resolved");
                  }}
                >
                  Mark as Resolved
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
