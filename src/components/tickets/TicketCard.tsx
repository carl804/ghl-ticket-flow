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
    glow: "shadow-green-500/30",
    icon: "🟢"
  },
  Medium: { 
    gradient: "from-yellow-400 to-amber-600",
    glow: "shadow-yellow-500/30",
    icon: "🟡"
  },
  High: { 
    gradient: "from-orange-400 to-red-600",
    glow: "shadow-orange-500/30",
    icon: "🟠"
  },
  Urgent: { 
    gradient: "from-red-500 to-rose-700",
    glow: "shadow-red-500/50",
    icon: "🔴"
  },
};

const statusConfig: Record<string, { gradient: string; glow: string }> = {
  Open: { gradient: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/30" },
  "In Progress": { gradient: "from-amber-500 to-orange-600", glow: "shadow-amber-500/30" },
  "Pending Customer": { gradient: "from-purple-500 to-pink-600", glow: "shadow-purple-500/30" },
  Resolved: { gradient: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30" },
  Closed: { gradient: "from-slate-500 to-gray-700", glow: "shadow-slate-500/30" },
  "Escalated to Dev": { gradient: "from-red-600 to-rose-700", glow: "shadow-red-500/40" },
  Deleted: { gradient: "from-gray-500 to-slate-600", glow: "shadow-gray-500/30" },
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
      className={`relative overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-0 transition-all duration-300 ${
        isDragging 
          ? "opacity-60 rotate-3 scale-105 shadow-2xl" 
          : "hover:shadow-xl hover:scale-[1.02] cursor-pointer"
      } ${priorityData.glow}`}
      onClick={onClick}
    >
      {/* Gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${priorityData.gradient}`} />
      
      {/* Intercom ticket special indicator */}
      {isIntercomTicket && (
        <div className="absolute top-2 right-2 z-10">
          <div className="relative">
            <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
            <div className="absolute -inset-1 bg-indigo-500/20 rounded-full blur" />
          </div>
        </div>
      )}
      
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${priorityData.gradient} opacity-[0.02] group-hover:opacity-[0.05] transition-opacity`} />
      
      <CardContent className="p-5 space-y-4 relative">
        {/* Header with drag handle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{priorityData.icon}</span>
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 truncate">
                {ticket.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                {ticket.contact.name?.charAt(0) || '?'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{ticket.contact.name}</p>
            </div>
          </div>
          
          <button
            type="button"
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-none"
            onClick={(e) => e.stopPropagation()}
            aria-label="Drag to move ticket"
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Badges with glassmorphism */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-gradient-to-r ${statusData.gradient} text-white text-xs font-semibold shadow-lg ${statusData.glow}`}>
            <span className="relative z-10">{ticket.status}</span>
            <div className="absolute inset-0 bg-white/20 rounded-lg" />
          </div>
          
          <div className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-gradient-to-r ${categoryData.gradient} text-white text-xs font-semibold shadow-lg`}>
            <span>{categoryData.icon}</span>
            <span className="relative z-10">{ticket.category}</span>
            <div className="absolute inset-0 bg-white/20 rounded-lg" />
          </div>
        </div>

        {/* Contact Info with icons */}
        <div className="space-y-2.5 text-sm">
          {ticket.contact.email && (
            <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 group/item">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm group-hover/item:scale-110 transition-transform">
                <Mail className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="truncate text-xs">{ticket.contact.email}</span>
            </div>
          )}
          
          {ticket.contact.phone && (
            <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 group/item">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-sm group-hover/item:scale-110 transition-transform">
                <Phone className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs">{ticket.contact.phone}</span>
            </div>
          )}
          
          {ticket.agencyName && (
            <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 group/item">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-sm group-hover/item:scale-110 transition-transform">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="truncate text-xs">{ticket.agencyName}</span>
            </div>
          )}
          
          {(ticket.assignedTo || ticket.intercomAgent) && (
            <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400 group/item">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-sm group-hover/item:scale-110 transition-transform">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="truncate text-xs">{ticket.assignedTo || ticket.intercomAgent}</span>
            </div>
          )}
        </div>

        {/* Description with fade effect */}
        {ticket.description && (
          <div className="relative pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {ticket.description}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
          </div>
        )}
      </CardContent>
      
      {/* Animated shine effect on hover */}
      <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
    </Card>
  );
}