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
  | "UPGRADE PLAN"
  | "Billing" // Legacy support
  | "Tech" 
  | "Sales" 
  | "Onboarding" 
  | "Outage";

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Ticket {
  id: string;
  name: string; // e.g., BILLING-10001
  contact: Contact;
  agencyName?: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  resolutionSummary?: string;
  assignedTo?: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
  value?: number;
  dueDate?: string;
  description?: string;
  tags?: string[];
}

export interface Stats {
  total: number;
  open: number;
  pendingCustomer: number;
  resolvedToday: number;
  avgResolutionTime: string;
  totalTrend?: number;
  openTrend?: number;
  pending?: number;
  pendingTrend?: number;
  resolvedTodayTrend?: number;
}

export interface CustomField {
  id: string;
  name: string;
  fieldKey: string;
}

export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
}

export type ViewMode = "kanban" | "table" | "compact";
