import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown, User, Mail, Phone, Building2 } from "lucide-react";
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface TableViewProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onPriorityChange: (ticketId: string, priority: TicketPriority) => void;
  selectedTickets: string[];
  onSelectTicket: (ticketId: string) => void;
  onSelectAll: () => void;
}

type SortField = "name" | "status" | "priority" | "createdAt" | "assignedTo";
type SortDirection = "asc" | "desc";

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

export default function TableView({
  tickets,
  onTicketClick,
  onStatusChange,
  onPriorityChange,
  selectedTickets,
  onSelectTicket,
  onSelectAll,
}: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTickets = [...tickets].sort((a, b) => {
    const direction = sortDirection === "asc" ? 1 : -1;

    switch (sortField) {
      case "name":
        return direction * a.name.localeCompare(b.name);
      case "status":
        return direction * a.status.localeCompare(b.status);
      case "priority":
        const priorityOrder = { Low: 0, Medium: 1, High: 2, Urgent: 3 };
        return direction * (priorityOrder[a.priority] - priorityOrder[b.priority]);
      case "createdAt":
        return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "assignedTo":
        return direction * (a.assignedTo || "").localeCompare(b.assignedTo || "");
      default:
        return 0;
    }
  });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 font-semibold hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-12 py-4">
              <Checkbox
                checked={selectedTickets.length === tickets.length && tickets.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead className="py-4">
              <SortButton field="name">Ticket</SortButton>
            </TableHead>
            <TableHead className="py-4">Contact</TableHead>
            <TableHead className="py-4">
              <SortButton field="status">Status</SortButton>
            </TableHead>
            <TableHead className="py-4">
              <SortButton field="priority">Priority</SortButton>
            </TableHead>
            <TableHead className="py-4">Category</TableHead>
            <TableHead className="py-4">
              <SortButton field="assignedTo">Assigned To</SortButton>
            </TableHead>
            <TableHead className="py-4">
              <SortButton field="createdAt">Created</SortButton>
            </TableHead>
            <TableHead className="w-12 py-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                No tickets found
              </TableCell>
            </TableRow>
          ) : (
            sortedTickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                className="cursor-pointer hover:bg-muted/50 border-b border-border/50 transition-colors"
                onClick={() => onTicketClick(ticket)}
              >
                <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedTickets.includes(ticket.id)}
                    onCheckedChange={() => onSelectTicket(ticket.id)}
                  />
                </TableCell>
                
                {/* Ticket Name */}
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold border border-primary/20">
                      {ticket.contact.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{ticket.name}</div>
                    </div>
                  </div>
                </TableCell>
                
                {/* Contact Info */}
                <TableCell className="py-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">
                      {ticket.contact.name}
                    </div>
                    {ticket.contact.email && (
                      <div className="text-xs text-muted-foreground">
                        {ticket.contact.email}
                      </div>
                    )}
                    {ticket.contact.phone && (
                      <div className="text-xs text-muted-foreground">
                        {ticket.contact.phone}
                      </div>
                    )}
                    {ticket.agencyName && (
                      <div className="text-xs text-muted-foreground">
                        {ticket.agencyName}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                {/* Status */}
                <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={`${statusConfig[ticket.status]?.color} border-transparent cursor-pointer font-medium px-3 py-1`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${statusConfig[ticket.status]?.dot}`} />
                        {ticket.status}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {(["Open", "In Progress", "Escalated to Dev", "Resolved", "Closed", "Deleted"] as TicketStatus[]).map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => onStatusChange(ticket.id, status)}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${statusConfig[status]?.dot}`} />
                          {status}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                
                {/* Priority */}
                <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge
                        variant="outline"
                        className={`${priorityConfig[ticket.priority]?.color} border-transparent cursor-pointer font-medium px-3 py-1`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${priorityConfig[ticket.priority]?.dot}`} />
                        {ticket.priority}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {(["Low", "Medium", "High", "Urgent"] as TicketPriority[]).map((priority) => (
                        <DropdownMenuItem
                          key={priority}
                          onClick={() => onPriorityChange(ticket.id, priority)}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${priorityConfig[priority]?.dot}`} />
                          {priority}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                
                {/* Category */}
                <TableCell className="py-4">
                  <Badge variant="outline" className="font-normal">{ticket.category}</Badge>
                </TableCell>
                
                {/* Assigned To */}
                <TableCell className="py-4">
                  <div className="flex items-center gap-2">
                    {ticket.assignedTo ? (
                      <>
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-semibold">
                          {ticket.assignedTo.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{ticket.assignedTo}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </TableCell>
                
                {/* Created */}
                <TableCell className="py-4 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </TableCell>
                
                {/* Actions */}
                <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
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
                      <DropdownMenuItem onClick={() => onStatusChange(ticket.id, "Resolved")}>
                        Mark as Resolved
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}