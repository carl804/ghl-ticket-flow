import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Mail, GripVertical } from "lucide-react";
import type { Ticket } from "@/lib/types";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

const priorityConfig = {
  Low: { 
    color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    icon: "🟢"
  },
  Medium: { 
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: "🟡"
  },
  High: { 
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    icon: "🟠"
  },
  Urgent: { 
    color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    icon: "🔴"
  },
};

const statusConfig: Record<string, { color: string }> = {
  Open: { color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  "In Progress": { color: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400" },
  "Pending Customer": { color: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400" },
  Resolved: { color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400" },
  Closed: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400" },
  "Escalated to Dev": { color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
  Deleted: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400" },
};

const categoryColors: Record<string, { color: string; icon: string }> = {
  BILLING: { color: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400", icon: "💳" },
  "TECHNICAL SUPPORT": { color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400", icon: "🔧" },
  ONBOARDING: { color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400", icon: "🎯" },
  "SALES INQUIRY": { color: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400", icon: "💼" },
  "REPORT AN OUTAGE": { color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400", icon: "⚠️" },
  "GENERAL QUESTIONS": { color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400", icon: "❓" },
  "CANCEL ACCOUNT": { color: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400", icon: "❌" },
  "UPGRADE PLAN": { color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400", icon: "⬆️" },
  // Legacy
  Billing: { color: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400", icon: "💳" },
  Tech: { color: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400", icon: "🔧" },
  Sales: { color: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400", icon: "💼" },
  Onboarding: { color: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400", icon: "🎯" },
  Outage: { color: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400", icon: "⚠️" },
  "General Questions": { color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400", icon: "❓" },
};

export function TicketCard({ ticket, onClick, isDragging, dragHandleProps }: TicketCardProps) {
  const categoryData = categoryColors[ticket.category] || { 
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400", 
    icon: "📋" 
  };
  const priorityData = priorityConfig[ticket.priority];
  const statusData = statusConfig[ticket.status] || statusConfig.Open;
  
  return (
    <Card 
      className={`
        relative overflow-hidden group
        bg-card border border-border
        transition-all duration-200
        ${isDragging 
          ? "opacity-60 rotate-1 scale-105 shadow-2xl" 
          : "hover:shadow-md hover:border-primary/50 cursor-pointer"
        }
      `}
      onClick={onClick}
    >
      {/* Priority accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${priorityData.color.split(' ')[0]}`} />
      
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{priorityData.icon}</span>
              <h3 className="font-semibold text-sm text-foreground truncate leading-tight">
                {ticket.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
                {ticket.contact.name?.charAt(0) || '?'}
              </div>
              <p className="text-sm font-medium text-foreground truncate">
                {ticket.contact.name}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-accent rounded transition-colors touch-none flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to move ticket"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={`${statusData.color} border-transparent text-xs font-medium px-2 py-0.5`}>
            {ticket.status}
          </Badge>
          
          <Badge variant="outline" className={`${categoryData.color} border-transparent text-xs font-medium px-2 py-0.5`}>
            <span className="mr-1">{categoryData.icon}</span>
            {ticket.category}
          </Badge>
        </div>

        {/* Contact Info - Compact */}
        <div className="space-y-1.5 text-xs">
          {ticket.contact.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="truncate">{ticket.contact.email}</span>
            </div>
          )}
          
          {ticket.contact.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="truncate">{ticket.contact.phone}</span>
            </div>
          )}
          
          {ticket.agencyName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-3 w-3 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="truncate">{ticket.agencyName}</span>
            </div>
          )}
          
          {(ticket.assignedTo || ticket.intercomAgent) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3 w-3 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span className="truncate">{ticket.assignedTo || ticket.intercomAgent}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}