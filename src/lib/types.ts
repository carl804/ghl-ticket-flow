// src/lib/types.ts
export type TicketStatus = "Open" | "In Progress" | "Pending Customer" | "Resolved" | "Closed" | "Escalated to Dev" | "Deleted";
export type OpportunityStatus = "open" | "won" | "lost" | "abandoned";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketCategory = "Billing" | "Tech" | "Sales" | "Onboarding" | "Outage" | "General Questions";
export type TicketSource = "Intercom" | "Email" | "Manual" | "Phone";

export interface Ticket {
  id: string;
  name: string;
  contact: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  agencyName?: string;
  status: TicketStatus;
  opportunityStatus?: OpportunityStatus;
  priority: TicketPriority;
  category: TicketCategory;
  resolutionSummary?: string;
  assignedTo?: string;
  assignedToUserId?: string;
  contactId?: string;
  createdAt: string;
  updatedAt: string;
  value?: number;
  dueDate?: string;
  description?: string;
  tags?: string[];
  ticketSource?: TicketSource;
  intercomAgent?: string;
  intercomConversationId?: string;
}

export interface Stats {
  total: number;
  open: number;
  inProgress?: number;
  resolved?: number;
  closed?: number;
  deleted?: number;
  resolvedToday: number;
  avgResolutionTime: string;
  // Trends
  totalTrend?: number;
  openTrend?: number;
  inProgressTrend?: number;
  resolvedTrend?: number;
  closedTrend?: number;
  deletedTrend?: number;
  resolvedTodayTrend?: number;
  escalated?: number;
  pendingCustomer?: number;
}

export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
  ticketSource?: string;
  intercomAgent?: string;
  intercomConversationId?: string;
}