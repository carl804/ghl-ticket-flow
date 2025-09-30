import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, Clock, Phone, Mail } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

const priorityConfig = {
  Low: { color: "border-green-500/50 text-green-600 bg-background dark:text-green-400" },
  Medium: { color: "border-yellow-500/50 text-yellow-600 bg-background dark:text-yellow-400" },
  High: { color: "border-orange-500/50 text-orange-600 bg-background dark:text-orange-400" },
  Urgent: { color: "border-red-500/50 text-red-600 bg-background dark:text-red-400" },
};

const statusConfig = {
  Open: { color: "bg-primary text-primary-foreground" },
  "In Progress": { color: "bg-primary text-primary-foreground" },
  "Pending Customer": { color: "bg-warning text-warning-foreground" },
  Resolved: { color: "bg-success text-success-foreground" },
};

const categoryColors: Record<string, string> = {
  BILLING: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "TECHNICAL SUPPORT": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ONBOARDING: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "SALES INQUIRY": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "REPORT AN OUTAGE": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "GENERAL QUESTIONS": "bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-300",
  "CANCEL ACCOUNT": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "UPGRADE PLAN": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  // Legacy support
  Billing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Tech: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Sales: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  Onboarding: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  Outage: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function TicketCard({ ticket, onClick, isDragging, dragHandleProps }: TicketCardProps) {
  const categoryColor = categoryColors[ticket.category] || "bg-secondary text-secondary-foreground";
  
  return (
    <Card 
      className={`bg-card cursor-pointer ${isDragging ? "opacity-50" : ""}`}
      style={{ transition: 'box-shadow 0.2s ease, transform 0.2s ease' }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.transform = '';
      }}
    >
      <CardContent className="p-5 space-y-3">
        {/* Header with drag handle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base mb-1">{ticket.name}</h3>
            <p className="text-sm text-muted-foreground">{ticket.contact.name}</p>
          </div>
          <div 
            {...dragHandleProps} 
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </div>
        </div>

        {/* Status, Priority, Category badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${statusConfig[ticket.status].color} text-xs font-medium px-3 py-1`}>
            {ticket.status}
          </Badge>
          <Badge 
            variant="outline" 
            className={`text-xs font-medium border-2 px-3 py-1 ${priorityConfig[ticket.priority].color}`}
          >
            {ticket.priority}
          </Badge>
          <Badge className={`text-xs font-medium px-3 py-1 ${categoryColor}`}>
            {ticket.category}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-2 text-sm">
          {ticket.contact.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{ticket.contact.email}</span>
            </div>
          )}
          {ticket.contact.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{ticket.contact.phone}</span>
            </div>
          )}
          {ticket.agencyName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="truncate">{ticket.agencyName}</span>
            </div>
          )}
          {ticket.assignedTo && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{ticket.assignedTo}</span>
            </div>
          )}
        </div>

        {/* Description if available */}
        {ticket.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 pt-2 border-t">
            {ticket.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
