// Ticket status options
export type TicketStatus = "Open" | "In Progress" | "Pending Customer" | "Resolved";

// Priority levels
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

// Ticket categories
export type TicketCategory = "Billing" | "Tech" | "Sales" | "Onboarding" | "Outage";

// Contact object (required name field!)
export interface Contact {
  id: string;
  name: string; // required
  email?: string;
  phone?: string;
}

// Ticket object
export interface Ticket {
  id: string;
  name: string; // Ticket number, e.g. BILLING-10001
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

// Dashboard stats
export interface Stats {
  total: number;
  open: number;
  pendingCustomer: number;
  resolvedToday: number;
  avgResolutionTime: string;
}

// Mapping custom fields to IDs
export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
}

// GHL user object
export interface GHLUser {
  id: string;
  name: string;
  email?: string;
}
