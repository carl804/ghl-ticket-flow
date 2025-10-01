import type {
  Ticket,
  Stats,
  FieldMap,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "./types";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const USE_MOCK_DATA = false;
let FIELD_MAP: FieldMap = {};
let PIPELINE_ID: string | null = null;

// ------------------------------
// Proxy GHL API through Supabase Edge Function
// ------------------------------
async function ghlRequest<T>(
  endpoint: string,
  options?: { method?: string; body?: any; queryParams?: Record<string, string> }
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ghl-proxy", {
    body: { endpoint, method: options?.method || "GET", body: options?.body, queryParams: options?.queryParams },
  });

  if (error) throw new Error(`Proxy Error: ${error.message}`);
  if (data?.error) throw new Error(`GHL API Error: ${data.error}`);
  return data;
}

// ------------------------------
// Get Pipeline ID
// ------------------------------
async function getPipelineId(): Promise<string> {
  if (PIPELINE_ID) return PIPELINE_ID;
  const response = await ghlRequest<{ pipelines: Array<{ id: string; name: string }> }>("/pipelines");
  const ticketPipeline = response.pipelines.find((p) => p.name.toLowerCase().includes("ticketing system"));
  if (!ticketPipeline) throw new Error("Ticketing System pipeline not found");
  PIPELINE_ID = ticketPipeline.id;
  return PIPELINE_ID;
}

// ------------------------------
// Field Map
// ------------------------------
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
// Helpers to normalize values
// ------------------------------
function toTicketStatus(value: string): TicketStatus {
  const map: Record<string, TicketStatus> = {
    open: "Open",
    inprogress: "In Progress",
    progress: "In Progress",
    pending: "Pending Customer",
    customer: "Pending Customer",
    resolved: "Resolved",
    closed: "Resolved",
  };
  return map[value?.toLowerCase()] || "Open";
}
function toTicketPriority(value: string): TicketPriority {
  const map: Record<string, TicketPriority> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };
  return map[value?.toLowerCase()] || "Medium";
}
function toTicketCategory(value: string): TicketCategory {
  const map: Record<string, TicketCategory> = {
    billing: "Billing",
    tech: "Tech",
    sales: "Sales",
    onboarding: "Onboarding",
    outage: "Outage",
  };
  return map[value?.toLowerCase()] || "Tech";
}

// ------------------------------
// Fetch Tickets
// ------------------------------
export async function fetchTickets(): Promise<Ticket[]> {
  try {
    const pipelineId = await getPipelineId();
    const response = await ghlRequest<{ opportunities: any[] }>(`/pipelines/${pipelineId}/opportunities`);
    if (!response.opportunities) return [];

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
      status: toTicketStatus(opp.status || ""),
      priority: toTicketPriority(opp.priority || ""),
      category: toTicketCategory(opp.category || ""),
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
  } catch (error) {
    toast.error(`Unable to fetch tickets: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

// ------------------------------
// Stats
// ------------------------------
export async function fetchStats(): Promise<Stats> {
  const tickets = await fetchTickets();
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "Open").length;
  const pendingCustomer = tickets.filter((t) => t.status === "Pending Customer").length;
  const today = new Date(); today.setHours(0,0,0,0);
  const resolvedToday = tickets.filter((t) => t.status === "Resolved" && new Date(t.updatedAt) >= today).length;

  const resolved = tickets.filter((t) => t.status === "Resolved");
  const avgMs = resolved.reduce((acc, t) => acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0) / (resolved.length || 1);
  const avgHours = Math.round(avgMs / (1000*60*60));
  const avgResolutionTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours/24)}d`;

  return { total, open, pendingCustomer, resolvedToday, avgResolutionTime };
}

// ------------------------------
// Updates
// ------------------------------
export async function updateTicketStatus(ticketId: string, newStatus: TicketStatus): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { status: newStatus } });
}
export async function updateResolutionSummary(ticketId: string, summary: string): Promise<void> {
  const fieldId = getFieldId("resolutionSummary"); if (!fieldId) return;
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { customField: [{ id: fieldId, value: summary }] } });
}
export async function updatePriority(ticketId: string, priority: TicketPriority): Promise<void> {
  const fieldId = getFieldId("priority"); if (!fieldId) return;
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { customField: [{ id: fieldId, value: priority }] } });
}
export async function updateCategory(ticketId: string, category: TicketCategory): Promise<void> {
  const fieldId = getFieldId("category"); if (!fieldId) return;
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { customField: [{ id: fieldId, value: category }] } });
}
export async function updateOwner(ticketId: string, userId: string): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { assignedToUserId: userId } });
}
export async function updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  const body: any = {}; const customFields: any[] = [];
  if (updates.status) body.status = updates.status;
  if (updates.assignedToUserId) body.assignedToUserId = updates.assignedToUserId;
  if (updates.priority) { const f = getFieldId("priority"); if (f) customFields.push({ id: f, value: updates.priority }); }
  if (updates.category) { const f = getFieldId("category"); if (f) customFields.push({ id: f, value: updates.category }); }
  if (updates.resolutionSummary) { const f = getFieldId("resolutionSummary"); if (f) customFields.push({ id: f, value: updates.resolutionSummary }); }
  if (customFields.length > 0) body.customField = customFields;
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body });
}
export async function bulkUpdateStatus(ids: string[], status: TicketStatus): Promise<void> {
  await Promise.all(ids.map((id) => updateTicketStatus(id, status)));
}
export async function bulkUpdatePriority(ids: string[], priority: TicketPriority): Promise<void> {
  await Promise.all(ids.map((id) => updatePriority(id, priority)));
}

// ------------------------------
// Users
// ------------------------------
export interface GHLUser { id: string; name: string; email?: string; }
export async function fetchUsers(): Promise<GHLUser[]> {
  const response = await ghlRequest<any>("/users/");
  if (!response.users) return [];
  return response.users.map((u: any) => ({ id: u.id, name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(), email: u.email }));
}

// ------------------------------
// Explicit Exports
// ------------------------------
export { USE_MOCK_DATA };
