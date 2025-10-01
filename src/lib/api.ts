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

// Helper to call GHL via Edge Function
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

  if (error) throw new Error(`GHL API Error: ${error.message}`);
  if (data.error) throw new Error(`GHL API Error: ${data.error}`);
  return data;
}

// 🔹 Pipeline lookup
async function getPipelineId(): Promise<string> {
  if (PIPELINE_ID) return PIPELINE_ID;
  const response = await ghlRequest<{ pipelines: Array<{ id: string; name: string }> }>("/pipelines");
  const ticketPipeline = response.pipelines.find((p) =>
    p.name.toLowerCase().includes("ticketing system")
  );
  if (!ticketPipeline) {
    throw new Error("Ticketing System pipeline not found.");
  }
  PIPELINE_ID = ticketPipeline.id;
  return PIPELINE_ID;
}

// 🔹 Initialize custom field IDs
export async function initializeFieldMap(): Promise<void> {
  if (USE_MOCK_DATA) return;
  const response = await ghlRequest<{ customFields: any[] }>("/custom-fields");
  const fields = response.customFields || [];
  FIELD_MAP = {
    priority: fields.find((f) => f.fieldKey?.endsWith(".priority"))?.id,
    category: fields.find((f) => f.fieldKey?.endsWith(".category"))?.id,
    resolutionSummary: fields.find((f) => f.fieldKey?.endsWith(".resolution_summary"))?.id,
    agencyName: fields.find((f) => f.fieldKey?.endsWith(".agency_name"))?.id,
  };
}

function getFieldId(key: keyof FieldMap): string | undefined {
  return FIELD_MAP[key];
}

// 🔹 Status normalization
function mapStatus(ghlStatus: string): TicketStatus {
  const statusLower = (ghlStatus || "").toLowerCase();
  if (statusLower.includes("open")) return "Open";
  if (statusLower.includes("progress")) return "In Progress";
  if (statusLower.includes("pending")) return "Pending Customer";
  if (statusLower.includes("resolved") || statusLower.includes("closed")) return "Resolved";
  return "Open";
}

// 🔹 Fetch tickets
export async function fetchTickets(): Promise<Ticket[]> {
  if (USE_MOCK_DATA) return [];

  const pipelineId = await getPipelineId();
  const response = await ghlRequest<any>(`/pipelines/${pipelineId}/opportunities`);
  const opportunities = response.opportunities || response.data || [];

  if (!opportunities.length) return [];

  const tickets = await Promise.all(
    opportunities.map(async (opp: any) => {
      try {
        const contact = await ghlRequest<any>(`/contacts/${opp.contactId}`);
        const customFields = opp.customField || [];
        const getValue = (key: keyof FieldMap) =>
          customFields.find((f: any) => f.id === FIELD_MAP[key])?.value;

        return {
          id: opp.id,
          name: opp.name || `TICKET-${opp.id.slice(0, 8)}`,
          contact: {
            id: contact.id || opp.contactId,
            name:
              contact.name ||
              `${contact.firstName || ""} ${contact.lastName || ""}`.trim() ||
              "Unknown",
            email: contact.email,
            phone: contact.phone,
          },
          agencyName: getValue("agencyName") || "N/A",
          status: mapStatus(opp.status || opp.pipelineStageId || "open"),
          priority: (getValue("priority") as TicketPriority) || "Medium",
          category: (getValue("category") as TicketCategory) || "Tech",
          resolutionSummary: getValue("resolutionSummary") || "",
          assignedTo: opp.assignedTo,
          assignedToUserId: opp.assignedToUserId,
          contactId: opp.contactId,
          createdAt: opp.dateAdded || new Date().toISOString(),
          updatedAt: opp.updatedAt || new Date().toISOString(),
          value: opp.monetaryValue || 0,
          dueDate: opp.dueDate,
          description: opp.description || "",
          tags: opp.tags || [],
        } as Ticket;
      } catch (err) {
        return {
          id: opp.id,
          name: opp.name || `TICKET-${opp.id.slice(0, 8)}`,
          contact: { id: opp.contactId, name: "Unknown" },
          status: "Open",
          priority: "Medium",
          category: "Tech",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Ticket;
      }
    })
  );

  return tickets;
}

// 🔹 Stats
export async function fetchStats(): Promise<Stats> {
  try {
    const tickets = await fetchTickets();
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "Open").length;
    const pendingCustomer = tickets.filter((t) => t.status === "Pending Customer").length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = tickets.filter(
      (t) => t.status === "Resolved" && new Date(t.updatedAt) >= today
    ).length;
    const resolved = tickets.filter((t) => t.status === "Resolved");
    const avgMs =
      resolved.reduce(
        (acc, t) =>
          acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()),
        0
      ) / (resolved.length || 1);
    const avgHours = Math.round(avgMs / (1000 * 60 * 60));
    const avgResolutionTime =
      avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`;
    return { total, open, pendingCustomer, resolvedToday, avgResolutionTime };
  } catch {
    return { total: 0, open: 0, pendingCustomer: 0, resolvedToday: 0, avgResolutionTime: "0h" };
  }
}

// 🔹 Update helpers
export async function updateTicketStatus(ticketId: string, newStatus: TicketStatus): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { status: newStatus } });
}
export async function updateResolutionSummary(ticketId: string, summary: string): Promise<void> {
  const fieldId = getFieldId("resolutionSummary");
  if (!fieldId) throw new Error("Resolution summary field not found");
  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { customField: [{ id: fieldId, value: summary }] },
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
export async function updateCategory(ticketId: string, category: TicketCategory): Promise<void> {
  const fieldId = getFieldId("category");
  if (!fieldId) throw new Error("Category field not found");
  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { customField: [{ id: fieldId, value: category }] },
  });
}
export async function updateOwner(ticketId: string, userId: string): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { assignedToUserId: userId },
  });
}
export async function updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  const body: any = {};
  const customFields: Array<{ id: string; value: any }> = [];
  if (updates.status) body.status = updates.status;
  if (updates.assignedToUserId) body.assignedToUserId = updates.assignedToUserId;
  if (updates.description) body.description = updates.description;
  if (updates.value !== undefined) body.value = updates.value;
  if (updates.dueDate) body.dueDate = updates.dueDate;
  if (updates.priority) {
    const id = getFieldId("priority");
    if (id) customFields.push({ id, value: updates.priority });
  }
  if (updates.category) {
    const id = getFieldId("category");
    if (id) customFields.push({ id, value: updates.category });
  }
  if (updates.resolutionSummary !== undefined) {
    const id = getFieldId("resolutionSummary");
    if (id) customFields.push({ id, value: updates.resolutionSummary });
  }
  if (customFields.length > 0) body.customField = customFields;
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body });
}
export async function bulkUpdateStatus(ids: string[], status: TicketStatus): Promise<void> {
  await Promise.all(ids.map((id) => updateTicketStatus(id, status)));
}
export async function bulkUpdatePriority(ids: string[], priority: TicketPriority): Promise<void> {
  await Promise.all(ids.map((id) => updatePriority(id, priority)));
}

// 🔹 Fetch Users
export async function fetchUsers(): Promise<GHLUser[]> {
  const response = await ghlRequest<any>("/users");
  return (response.users || []).map((user: any) => ({
    id: user.id,
    name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    email: user.email,
  }));
}

// ✅ Export everything
export {
  USE_MOCK_DATA,
  initializeFieldMap,
};
