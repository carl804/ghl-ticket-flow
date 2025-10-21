import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, User, Mail, Phone } from "lucide-react";
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface CompactViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onPriorityChange: (ticketId: string, priority: TicketPriority) => void;
}

const priorityConfig = {
  Low: { 
    color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
    dot: "bg-green-500"
  },
  Medium: { 
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
    dot: "bg-yellow-500"
  },
  High: { 
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
    dot: "bg-orange-500"
  },
  Urgent: { 
    color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    dot: "bg-red-500"
  },
};

const statusConfig: Record<TicketStatus, { color: string; dot: string }> = {
  Open: { color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400", dot: "bg-blue-500" },
  "In Progress": { color: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400", dot: "bg-orange-500" },
  "Pending Customer": { color: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400", dot: "bg-purple-500" },
  "Escalated to Dev": { color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400", dot: "bg-red-500" },
  Resolved: { color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400", dot: "bg-green-500" },
  Closed: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400", dot: "bg-gray-500" },
  Deleted: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400", dot: "bg-gray-400" },
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
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-all"
          onClick={() => onTicketClick(ticket)}
        >
          {/* Avatar & Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold border border-primary/20 flex-shrink-0">
              {ticket.contact.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground truncate">{ticket.name}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="truncate">{ticket.contact.name}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* Contact Quick Info */}
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            {ticket.contact.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{ticket.contact.email}</span>
              </div>
            )}
            {ticket.contact.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                <span>{ticket.contact.phone}</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Badge 
                  variant="outline"
                  className={`${statusConfig[ticket.status]?.color} border-transparent cursor-pointer font-medium px-2.5 py-0.5`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig[ticket.status]?.dot}`} />
                  {ticket.status}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(["Open", "In Progress", "Pending Customer", "Escalated to Dev", "Resolved", "Closed"] as TicketStatus[]).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(ticket.id, status);
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${statusConfig[status]?.dot}`} />
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Badge
                  variant="outline"
                  className={`${priorityConfig[ticket.priority]?.color} border-transparent cursor-pointer font-medium px-2.5 py-0.5`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${priorityConfig[ticket.priority]?.dot}`} />
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
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${priorityConfig[priority]?.dot}`} />
                    {priority}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Category */}
            <Badge variant="outline" className="font-normal hidden lg:inline-flex">
              {ticket.category}
            </Badge>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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