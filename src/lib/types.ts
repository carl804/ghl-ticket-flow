// Ticket Status
export type TicketStatus =
  | "Open"
  | "In Progress"
  | "Pending Customer"
  | "Resolved"
  | "Closed";

// Ticket Priority
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

// Ticket Category (extended to match what GHL might return)
export type TicketCategory =
  | "Billing"
  | "Technical"
  | "Sales"
  | "Support"
  | "Other"
  | "Tech"
  | "Onboarding"
  | "Outage";

// Ticket Shape
export interface Ticket {
  id: string;
  name: string;
  contact: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  agencyName?: string;
  status: TicketStatus;
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
}

// Stats for dashboard
export interface Stats {
  total: number;
  open: number;
  pendingCustomer: number;
  pending: number;
  resolvedToday: number;
  avgResolutionTime: string;
  totalTrend?: number;
  openTrend?: number;
  pendingTrend?: number;
  resolvedTodayTrend?: number;
}

// FieldMap for custom fields
export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
}

// For AssignedTo dropdown
export interface GHLUser {
  id: string;
  name: string;
  email?: string;
}

// View Modes for Tickets
export type ViewMode = "kanban" | "table";
