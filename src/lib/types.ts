// src/lib/types.ts
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed" | "Deleted" | "Pending Customer";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketCategory = string;

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

export interface Stats {
  total: number;
  open: number;
  inProgress?: number;
  resolved?: number;
  closed?: number;
  deleted?: number;
  pending?: number;
  pendingCustomer: number;
  resolvedToday: number;
  avgResolutionTime: string;
  // Trends
  totalTrend?: number;
  openTrend?: number;
  inProgressTrend?: number;
  resolvedTrend?: number;
  closedTrend?: number;
  deletedTrend?: number;
  pendingTrend?: number;
  resolvedTodayTrend?: number;
}

export interface FieldMap {
  priority?: string;
  category?: string;
  resolutionSummary?: string;
  agencyName?: string;
}