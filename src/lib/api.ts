import type {
  Ticket,
  Stats,
  FieldMap,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  GHLUser,
} from "./types";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const USE_MOCK_DATA = false;
let FIELD_MAP: FieldMap = {};
let PIPELINE_ID: string | null = null;

// ------------------------------
// Helpers
// ------------------------------
async function ghlRequest<T>(
  endpoint: string,
  options?: { method?: string; body?: any; queryParams?: Record<string, string> }
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ghl-proxy", {
    body: {
      endpoint,
      method: options?.method || "GET",
      body: options?.body,
      queryParams: options?.queryParams,
    },
  });

  if (error) throw new Error(`Proxy Error: ${error.message}`);
  if (data?.error) throw new Error(`GHL API Error: ${data.error}`);
  return data;
}

async function getPipelineId(): Promise<string> {
  if (PIPELINE_ID) return PIPELINE_ID;
  const response = await ghlRequest<{ pipelines: Array<{ id: string; name: string }> }>("/pipelines");
  const ticketPipeline = response.pipelines.find((p) =>
    p.name.toLowerCase().includes("ticketing system")
  );
  if (!ticketPipeline) throw new Error("Ticketing System pipeline not found");
  PIPELINE_ID = ticketPipeline.id;
  return PIPELINE_ID;
}

export async function initializeFieldMap(): Promise<void> {
  if (USE_MOCK_DATA) return;
  const response = await ghlRequest<{ customFields: any[] }>("/custom-fields");
  const fields = response.customFields || [];
  FIELD_MAP = {
    priority: fields.find((f) => f.fieldKey === "priority")?.id,
    category: fields.find((f) => f.fieldKey === "category")?.id,
    resolutionSummary: fields.find((f) => f.fieldKey === "resolutionSummary")?.id,
    agencyName: fields.find((f) => f.fieldKey === "agencyName")?.id,
  };
}
function getFieldId(key: keyof FieldMap): string | undefined {
  return FIELD_MAP[key];
}

// ------------------------------
// Normalizers for API → Types
// ------------------------------
function toTicketStatus(raw: string): TicketStatus {
  const map: Record<string, TicketStatus> = {
    Open: "Open",
    "In Progress": "In Progress",
    "Pending Customer": "Pending Customer",
    Resolved: "Resolved",
    Closed: "Closed",
  };
  return map[raw] || "Open";
}

function toTicketPriority(raw: string): TicketPriority {
  const map: Record<string, TicketPriority> = {
    Low: "Low",
    Medium: "Medium",
    High: "High",
    Urgent: "Urgent",
  };
  return map[raw] || "Medium";
}

function toTicketCategory(raw: string): TicketCategory {
  const map: Record<string, TicketCategory> = {
    Billing: "Billing",
    Technical: "Technical",
    Sales: "Sales",
    Support: "Support",
    Other: "Other",
    Tech: "Tech",
    Onboarding: "Onboarding",
    Outage: "Outage",
  };
  return map[raw] || "Other";
}

// ------------------------------
// Fetch Tickets
// ------------------------------
export async function fetchTickets(): Promise<Ticket[]> {
  const pipelineId = await getPipelineId();
  const response = await ghlRequest<{ opportunities: any[] }>(
    `/pipelines/${pipelineId}/opportunities`
  );

  if (!response.opportunities || response.opportunities.length === 0) return [];

  return response.opportunities.map((opp: any) => ({
    id: opp.id,
    name: opp.name || `TICKET-${opp.id.slice(0, 8)}`,
    contact: {
      id: opp.contactId,
      name: opp.contactName || "Unknown",
      email: opp.contactEmail,
      phone: opp.contactPhone,
    },
    agencyName: opp.agencyName || "N/A",
    status: toTicketStatus(opp.status || "Open"),
    priority: toTicketPriority(opp.priority || "Medium"),
    category: toTicketCategory(opp.category || "Other"),
    resolutionSummary: opp.resolutionSummary || "",
    assignedTo: opp.assignedTo,
    assignedToUserId: opp.assignedToUserId,
    contactId: opp.contactId,
    createdAt: opp.dateAdded || new Date().toISOString(),
    updatedAt: opp.updatedAt || new Date().toISOString(),
    value: opp.monetaryValue || 0,
    dueDate: opp.dueDate,
    description: opp.description,
    tags: opp.tags || [],
  }));
}

// ------------------------------
// Stats
// ------------------------------
export async function fetchStats(): Promise<Stats> {
  const tickets = await fetchTickets();
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "Open").length;
  const pendingCustomer = tickets.filter((t) => t.status === "Pending Customer").length;
  const resolvedToday = tickets.filter(
    (t) => t.status === "Resolved" && new Date(t.updatedAt).getTime() >= new Date().setHours(0, 0, 0, 0)
  ).length;

  const resolved = tickets.filter((t) => t.status === "Resolved");
  const avgMs =
    resolved.reduce((acc, t) => acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0) /
    (resolved.length || 1);
  const avgHours = Math.round(avgMs / (1000 * 60 * 60));
  const avgResolutionTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`;

  return {
    total,
    open,
    pendingCustomer,
    pending: pendingCustomer,
    resolvedToday,
    avgResolutionTime,
    totalTrend: 0,
    openTrend: 0,
    pendingTrend: 0,
    resolvedTodayTrend: 0,
  };
}

// ------------------------------
// Update helpers
// ------------------------------
export async function updateTicketStatus(ticketId: string, newStatus: TicketStatus): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { status: newStatus },
  });
}

export async function updatePriority(ticketId: string, priority: TicketPriority): Promise<void> {
  const fieldId = getFieldId("priority");
  if (!fieldId) throw new Error("Priority field not found");
  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { customField: [{ id: fieldId, value: priority }] },
  });
}

export async function updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  const body: any = {};
  const customFields: Array<{ id: string; value: any }> = [];

  if (updates.status) body.status = updates.status;
  if (updates.assignedToUserId) body.assignedToUserId = updates.assignedToUserId;
  if (updates.priority) {
    const fieldId = getFieldId("priority");
    if (fieldId) customFields.push({ id: fieldId, value: updates.priority });
  }
  if (updates.category) {
    const fieldId = getFieldId("category");
    if (fieldId) customFields.push({ id: fieldId, value: updates.category });
  }
  if (updates.resolutionSummary) {
    const fieldId = getFieldId("resolutionSummary");
    if (fieldId) customFields.push({ id: fieldId, value: updates.resolutionSummary });
  }

  if (customFields.length > 0) body.customField = customFields;

  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body });
}

// ------------------------------
// Bulk updates
// ------------------------------
export async function bulkUpdateStatus(ids: string[], status: TicketStatus): Promise<void> {
  await Promise.all(ids.map((id) => updateTicketStatus(id, status)));
}
export async function bulkUpdatePriority(ids: string[], priority: TicketPriority): Promise<void> {
  await Promise.all(ids.map((id) => updatePriority(id, priority)));
}

// ------------------------------
// Users
// ------------------------------
export async function fetchUsers(): Promise<GHLUser[]> {
  const response = await ghlRequest<any>("/users/");
  if (!response.users) return [];
  return response.users.map((u: any) => ({
    id: u.id,
    name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
    email: u.email,
  }));
}

// ------------------------------
// Explicit exports
// ------------------------------
export {
  USE_MOCK_DATA,
  initializeFieldMap,
};
