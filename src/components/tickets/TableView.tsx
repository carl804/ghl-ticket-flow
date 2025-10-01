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
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
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
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedTickets.length === tickets.length && tickets.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>
              <SortButton field="name">Ticket ID</SortButton>
            </TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead>
              <SortButton field="status">Status</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="priority">Priority</SortButton>
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead>
              <SortButton field="assignedTo">Assigned To</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="createdAt">Created</SortButton>
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                No tickets found
              </TableCell>
            </TableRow>
          ) : (
            sortedTickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onTicketClick(ticket)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedTickets.includes(ticket.id)}
                    onCheckedChange={() => onSelectTicket(ticket.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{ticket.name}</TableCell>
                <TableCell>{ticket.contact.name}</TableCell>
                <TableCell className="text-muted-foreground">{ticket.contact.email || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{ticket.contact.phone || "-"}</TableCell>
                <TableCell className="text-muted-foreground">{ticket.agencyName || "-"}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge className={`${statusConfig[ticket.status]?.color || "bg-muted text-muted-foreground"} cursor-pointer`}>
                        {ticket.status}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {(["Open", "In Progress", "Pending Customer", "Resolved"] as TicketStatus[]).map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => onStatusChange(ticket.id, status)}
                        >
                          {status}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge
                        variant="outline"
                        className={`${priorityConfig[ticket.priority]?.color || "bg-muted text-muted-foreground border-muted"} cursor-pointer border`}
                      >
                        {ticket.priority}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {(["Low", "Medium", "High", "Urgent"] as TicketPriority[]).map((priority) => (
                        <DropdownMenuItem
                          key={priority}
                          onClick={() => onPriorityChange(ticket.id, priority)}
                        >
                          {priority}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ticket.category}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{ticket.assignedTo || "Unassigned"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
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
