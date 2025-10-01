// ------------------------------
// Ticket Status
// ------------------------------
export type TicketStatus =
  | "Open"
  | "In Progress"
  | "Pending Customer"
  | "Resolved"
  | "Closed";

// ------------------------------
// Ticket Priority
// ------------------------------
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

// ------------------------------
// Ticket Category
// ------------------------------
export type TicketCategory =
  | "Billing"
  | "Technical"
  | "Sales"
  | "Support"
  | "Other";

// ------------------------------
// Contact
// ------------------------------
export interface Contact {
  id: string;
  name?: string; // optional because GHL may not always return it
  email?: string;
  phone?: string;
}

// ------------------------------
// Ticket
// ------------------------------
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

// ------------------------------
// Stats (for dashboard)
// ------------------------------
export interface Stats {
  total: number;
  open: number;
  pendingCustomer: number;
  pending: number;
  resolvedToday: number;
  avgResolutionTime: string;

  // trends (optional, default 0 if not available)
  totalTrend?: number;
  openTrend?: number;
  pendingTrend?: number;
  resolvedTodayTrend?: number;
}

// ------------------------------
// Field Map (custom fields)
// ------------------------------
export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
}
