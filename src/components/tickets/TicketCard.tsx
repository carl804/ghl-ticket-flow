import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Mail, GripVertical, Sparkles } from "lucide-react";
import type { Ticket } from "@/lib/types";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
}

const priorityConfig = {
  Low: { 
    gradient: "from-green-400 to-emerald-600",
    shadow: "shadow-green-500/20",
    glow: "group-hover:shadow-green-500/30",
    icon: "🟢"
  },
  Medium: { 
    gradient: "from-yellow-400 to-amber-600",
    shadow: "shadow-yellow-500/20",
    glow: "group-hover:shadow-yellow-500/30",
    icon: "🟡"
  },
  High: { 
    gradient: "from-orange-400 to-red-600",
    shadow: "shadow-orange-500/20",
    glow: "group-hover:shadow-orange-500/30",
    icon: "🟠"
  },
  Urgent: { 
    gradient: "from-red-500 to-rose-700",
    shadow: "shadow-red-500/30",
    glow: "group-hover:shadow-red-500/40",
    icon: "🔴"
  },
};

const statusConfig: Record<string, { gradient: string; shadow: string }> = {
  Open: { gradient: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/20" },
  "In Progress": { gradient: "from-orange-500 to-amber-600", shadow: "shadow-orange-500/20" },
  "Pending Customer": { gradient: "from-purple-500 to-pink-600", shadow: "shadow-purple-500/20" },
  Resolved: { gradient: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/20" },
  Closed: { gradient: "from-gray-500 to-slate-700", shadow: "shadow-gray-500/20" },
  "Escalated to Dev": { gradient: "from-red-600 to-rose-700", shadow: "shadow-red-500/30" },
  Deleted: { gradient: "from-gray-500 to-slate-600", shadow: "shadow-gray-500/20" },
};

const categoryColors: Record<string, { gradient: string; icon: string }> = {
  BILLING: { gradient: "from-purple-400 to-purple-600", icon: "💳" },
  "TECHNICAL SUPPORT": { gradient: "from-blue-400 to-blue-600", icon: "🔧" },
  ONBOARDING: { gradient: "from-green-400 to-green-600", icon: "🎯" },
  "SALES INQUIRY": { gradient: "from-teal-400 to-teal-600", icon: "💼" },
  "REPORT AN OUTAGE": { gradient: "from-red-400 to-red-600", icon: "⚠️" },
  "GENERAL QUESTIONS": { gradient: "from-gray-400 to-gray-600", icon: "❓" },
  "CANCEL ACCOUNT": { gradient: "from-pink-400 to-pink-600", icon: "❌" },
  "UPGRADE PLAN": { gradient: "from-indigo-400 to-indigo-600", icon: "⬆️" },
  // Legacy
  Billing: { gradient: "from-purple-400 to-purple-600", icon: "💳" },
  Tech: { gradient: "from-blue-400 to-blue-600", icon: "🔧" },
  Sales: { gradient: "from-teal-400 to-teal-600", icon: "💼" },
  Onboarding: { gradient: "from-green-400 to-green-600", icon: "🎯" },
  Outage: { gradient: "from-red-400 to-red-600", icon: "⚠️" },
  "General Questions": { gradient: "from-gray-400 to-gray-600", icon: "❓" },
};

export function TicketCard({ ticket, onClick, isDragging, dragHandleProps }: TicketCardProps) {
  const categoryData = categoryColors[ticket.category] || { gradient: "from-gray-400 to-gray-600", icon: "📋" };
  const priorityData = priorityConfig[ticket.priority];
  const statusData = statusConfig[ticket.status] || statusConfig.Open;
  const isIntercomTicket = ticket.name.startsWith('[Intercom]');
  
  return (
    <Card 
      className={`
        relative overflow-hidden group
        bg-[hsl(var(--card))] border border-[hsl(var(--border))]
        transition-all duration-300
        ${isDragging 
          ? "opacity-60 rotate-2 scale-105 shadow-2xl" 
          : "hover:bg-[hsl(var(--elevated))] hover:shadow-xl hover:scale-[1.02] cursor-pointer"
        }
        ${priorityData.shadow} ${priorityData.glow}
      `}
      onClick={onClick}
    >
      {/* Gradient accent bar - thicker and more prominent */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${priorityData.gradient}`} />
      
      {/* Intercom ticket special indicator */}
      {isIntercomTicket && (
        <div className="absolute top-3 right-3 z-10">
          <div className="relative">
            <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
            <div className="absolute -inset-1 bg-blue-500/20 rounded-full blur" />
          </div>
        </div>
      )}
      
      {/* Subtle gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${priorityData.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
      
      <CardContent className="p-5 space-y-4 relative">
        {/* Header with drag handle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{priorityData.icon}</span>
              <h3 className="font-bold text-base text-[hsl(var(--text-primary))] truncate">
                {ticket.name}
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${priorityData.gradient} flex items-center justify-center text-white text-sm font-bold shadow-lg ${priorityData.shadow}`}>
                {ticket.contact.name?.charAt(0) || '?'}
              </div>
              <p className="text-sm text-[hsl(var(--text-secondary))] truncate font-medium">
                {ticket.contact.name}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-[hsl(var(--elevated-hover))] rounded-lg transition-colors touch-none"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to move ticket"
          >
            <GripVertical className="h-5 w-5 text-[hsl(var(--text-tertiary))]" />
          </button>
        </div>

        {/* Badges with premium styling */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`
            relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg 
            bg-gradient-to-r ${statusData.gradient} 
            text-white text-xs font-semibold shadow-lg ${statusData.shadow}
          `}>
            <span className="relative z-10">{ticket.status}</span>
            <div className="absolute inset-0 bg-white/10 rounded-lg" />
          </div>
          
          <div className={`
            relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg 
            bg-gradient-to-r ${categoryData.gradient} 
            text-white text-xs font-semibold shadow-lg
          `}>
            <span>{categoryData.icon}</span>
            <span className="relative z-10">{ticket.category}</span>
            <div className="absolute inset-0 bg-white/10 rounded-lg" />
          </div>
        </div>

        {/* Contact Info with modern icons */}
        <div className="space-y-2.5 text-sm">
          {ticket.contact.email && (
            <div className="flex items-center gap-2.5 text-[hsl(var(--text-secondary))] group/item">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover/item:scale-110 transition-transform`}>
                <Mail className="h-4 w-4 text-white" />
              </div>
              <span className="truncate text-xs font-medium">{ticket.contact.email}</span>
            </div>
          )}
          
          {ticket.contact.phone && (
            <div className="flex items-center gap-2.5 text-[hsl(var(--text-secondary))] group/item">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-md shadow-green-500/20 group-hover/item:scale-110 transition-transform`}>
                <Phone className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium">{ticket.contact.phone}</span>
            </div>
          )}
          
          {ticket.agencyName && (
            <div className="flex items-center gap-2.5 text-[hsl(var(--text-secondary))] group/item">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover/item:scale-110 transition-transform`}>
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="truncate text-xs font-medium">{ticket.agencyName}</span>
            </div>
          )}
          
          {(ticket.assignedTo || ticket.intercomAgent) && (
            <div className="flex items-center gap-2.5 text-[hsl(var(--text-secondary))] group/item">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover/item:scale-110 transition-transform`}>
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="truncate text-xs font-medium">{ticket.assignedTo || ticket.intercomAgent}</span>
            </div>
          )}
        </div>

        {/* Description with modern fade */}
        {ticket.description && (
          <div className="relative pt-3 border-t border-[hsl(var(--border))]">
            <p className="text-xs text-[hsl(var(--text-secondary))] line-clamp-2 leading-relaxed">
              {ticket.description}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[hsl(var(--card))] to-transparent pointer-events-none" />
          </div>
        )}
      </CardContent>
      
      {/* Animated shine effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
    </Card>
  );
}