// Ticket status / priority / category
export type TicketStatus = "Open" | "In Progress" | "Pending Customer" | "Resolved";

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

// Your real categories (typed backend values, but properly cased for TS)
export type TicketCategory =
  | "Billing"
  | "Technical Support"
  | "Onboarding"
  | "Sales Inquiry"
  | "Report an Outage"
  | "General Questions"
  | "Cancel Account"
  | "Upgrade Plan";

// Contact (name optional for safety)
export interface Contact {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

// Ticket
export interface Ticket {
  id: string;
  name: string;           // e.g. BILLING-10001
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

// Stats (kept to match your UI)
export interface Stats {
  total: number;
  open: number;
  pendingCustomer: number;
  resolvedToday: number;
  avgResolutionTime: string;

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

// CustomField (for robustness to API shapes)
export interface CustomField {
  id: string;
  fieldKey?: string; // some APIs use fieldKey
  key?: string;      // some APIs use key
  name?: string;
  type?: string;
}

// Views
export type ViewMode = "kanban" | "table" | "compact";

// GHL user object (assignees)
export interface GHLUser {
  id: string;
  name: string;
  email?: string;
}
