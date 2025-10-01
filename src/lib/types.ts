// Ticket Status + Priority
export type TicketStatus = "Open" | "In Progress" | "Pending Customer" | "Resolved";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketCategory = "Billing" | "Tech" | "Sales" | "Onboarding" | "Outage";

// Contact
export interface Contact {
  id: string;
  name?: string;   // optional now (UI complained it was missing sometimes)
  email?: string;
  phone?: string;
}

// Ticket
export interface Ticket {
  id: string;
  name: string;
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

// Stats (extended to match UI usage)
export interface Stats {
  total: number;
  open: number;
  pendingCustomer: number;
  resolvedToday: number;
  avgResolutionTime: string;

  // UI fields that were missing (added as optional)
  pending?: number; 
  totalTrend?: number;
  openTrend?: number;
  pendingTrend?: number;
  resolvedTodayTrend?: number;
}

// Field map for custom fields
export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
}

// ViewMode (used in Tickets.tsx)
export type ViewMode = "list" | "board";
