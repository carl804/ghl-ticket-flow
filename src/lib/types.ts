export type TicketStatus = "Open" | "In Progress" | "Pending Customer" | "Resolved" | "Closed" | "Escalated to Dev" | "Deleted";
export type OpportunityStatus = "open" | "won" | "lost" | "abandoned";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketCategory = "Billing" | "Tech" | "Sales" | "Onboarding" | "Outage" | "General Questions" | "Technical Support" | "Sales Inquiry" | "Report an Outage" | "Cancel Account" | "Upgrade Plan" | "Feature Request" | "Bug Report";
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
  pipelineStageId?: string; // Added for GHL pipeline stage ID
}

export interface Stats {
  total: number;
  open: number;
  inProgress?: number;
  resolved?: number;
  closed?: number;
  pendingCustomer?: number;
  resolvedToday?: number;
  avgResolutionTime?: string;
  totalTrend?: number;
  openTrend?: number;
  resolvedTodayTrend?: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface GHLTag {
  id: string;
  name: string;
  locationId?: string;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: string;
}
export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
  intercomAgent?: string;
  ticketSource?: string;
  intercomConversationId?: string;
}

export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
  intercomAgent?: string;
  ticketSource?: string;
  intercomConversationId?: string;
}
