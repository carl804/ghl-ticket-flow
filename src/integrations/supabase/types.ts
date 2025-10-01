// Ticket status / priority / category
export type TicketStatus = "Open" | "In Progress" | "Pending Customer" | "Resolved";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketCategory =
  | "BILLING"
  | "TECHNICAL SUPPORT"
  | "ONBOARDING"
  | "SALES INQUIRY"
  | "REPORT AN OUTAGE"
  | "GENERAL QUESTIONS"
  | "CANCEL ACCOUNT"
  | "UPGRADE PLAN";

// Contact (make name optional to avoid runtime missing-name errors)
export interface Contact {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

// Ticket
export interface Ticket {
  id: string;
  name: string;              // e.g. BILLING-10001
  contact: Contact;
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

// Stats (extend to match UI props used in StatsCards)
export interface Stats {
  total: number;
  open: number;
  pendingCustomer: number;
  resolvedToday: number;
  avgResolutionTime: string;

  // UI expects these (optional so we don’t force logic right now)
  pending?: number;            
  totalTrend?: number;
  openTrend?: number;
  pendingTrend?: number;
  resolvedTodayTrend?: number;
}

// Mapping custom fields to IDs
export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
}

// CustomField (for mapping responses)
export interface CustomField {
  id: string;
  fieldKey?: string;
  key?: string;
  name?: string;
  type?: string;
}

// Used in Tickets.tsx (your UI compares against "kanban" / "table")
export type ViewMode = "kanban" | "table" | "compact";

// GHL user object (for assignees)
export interface GHLUser {
  id: string;
  name: string;
  email?: string;
}
