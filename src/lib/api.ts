import type {
  Ticket,
  Stats,
  FieldMap,
  CustomField,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  GHLUser,
} from "./types";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const USE_MOCK_DATA = false;

let FIELD_MAP: FieldMap = {};
let PIPELINE_ID: string | null = null;

/** -------------------------------
 * Generic Proxy Request
 -------------------------------- */
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
  if (data?.error) throw new Error(`GHL API Error: ${data.error}`);
  return data as T;
}

/** -------------------------------
 * Pipeline Helpers
 -------------------------------- */
async function getPipelineId(): Promise<string> {
  if (PIPELINE_ID) return PIPELINE_ID;
  const res = await ghlRequest<{ pipelines: Array<{ id: string; name: string }> }>("/pipelines");
  const ticketPipe = res.pipelines.find(p =>
    p.name.toLowerCase().includes("ticketing system")
  );
  if (!ticketPipe) {
    const names = res.pipelines.map(p => p.name).join(", ");
    throw new Error(`Ticketing System pipeline not found. Available: ${names}`);
  }
  PIPELINE_ID = ticketPipe.id;
  return PIPELINE_ID;
}

/** -------------------------------
 * Field Map
 -------------------------------- */
export async function initializeFieldMap(): Promise<void> {
  if (USE_MOCK_DATA) return;
  try {
    const res = await ghlRequest<{ customFields: CustomField[] }>("/custom-fields");
    const fields = res.customFields || [];
    FIELD_MAP = {
      priority: fields.find(f => f.fieldKey === "priority" || f.key === "priority")?.id,
      category: fields.find(f => f.fieldKey === "category" || f.key === "category")?.id,
      resolutionSummary: fields.find(f => f.fieldKey === "resolutionSummary" || f.key === "resolutionSummary")?.id,
      agencyName: fields.find(f => f.fieldKey === "agencyName" || f.key === "agencyName")?.id,
    };
  } catch (e) {
    console.error("initializeFieldMap failed:", e);
  }
}
function getFieldId(key: keyof FieldMap): string | undefined {
  return FIELD_MAP[key];
}

/** -------------------------------
 * Status Normalization
 -------------------------------- */
function mapStatus(raw: string | undefined): TicketStatus {
  const s = (raw || "").toLowerCase().replace(/[_\s]/g, "");
  if (s.includes("inprogress") || s.includes("progress")) return "In Progress";
  if (s.includes("pending") || s.includes("customer")) return "Pending Customer";
  if (s.includes("resolved") || s.includes("closed")) return "Resolved";
  return "Open";
}

/** -------------------------------
 * Fetch Tickets
 -------------------------------- */
export async function fetchTickets(): Promise<Ticket[]> {
  if (USE_MOCK_DATA) return [];

  const [pipelineId] = await Promise.all([getPipelineId(), initializeFieldMap()]);

  const res = await ghlRequest<any>(`/pipelines/${pipelineId}/opportunities`);
  const opps: any[] = res.opportunities || res.data || [];
  if (!opps.length) return [];

  return Promise.all(
    opps.map(async (opp: any) => {
      try {
        const contact = opp.contactId
          ? await ghlRequest<any>(`/contacts/${opp.contactId}`)
          : {};

        const cf = opp.customField || opp.customFields || [];
        const getCF = (k: keyof FieldMap) => {
          const id = FIELD_MAP[k];
          if (!id) return undefined;
          const hit = cf.find((f: any) => f?.id === id);
          return hit?.value ?? hit?.field_value ?? hit?.fieldValue;
        };

        return {
          id: String(opp.id),
          name: opp.name || `TICKET-${String(opp.id).slice(0, 8)}`,
          contact: {
            id: contact?.contact?.id || contact?.id || opp.contactId || "unknown",
            name: contact?.contact?.name || contact?.name,
            email: contact?.contact?.email || contact?.email,
            phone: contact?.contact?.phone || contact?.phone,
          },
          agencyName: getCF("agencyName") as string | undefined,
          status: mapStatus(opp.status || opp.pipelineStageId),
          priority: (getCF("priority") as TicketPriority) || "Medium",
          category: (getCF("category") as TicketCategory) || "General",
          resolutionSummary: getCF("resolutionSummary") as string | undefined,
          assignedTo: opp.assignedTo,
          assignedToUserId: opp.assignedToUserId,
          contactId: opp.contactId,
          createdAt: opp.createdAt || opp.dateAdded || new Date().toISOString(),
          updatedAt: opp.updatedAt || opp.lastStatusChangeAt || new Date().toISOString(),
          value: opp.monetaryValue ?? opp.value ?? 0,
          dueDate: opp.dueDate,
          description: opp.description || opp.notes,
          tags: opp.tags || [],
        } as Ticket;
      } catch {
        return {
          id: String(opp.id),
          name: opp.name || `TICKET-${String(opp.id).slice(0, 8)}`,
          contact: { id: String(opp.contactId || "unknown") },
          status: mapStatus(opp.status),
          priority: "Medium",
          category: "General",
          createdAt: opp.createdAt || new Date().toISOString(),
          updatedAt: opp.updatedAt || new Date().toISOString(),
        } as Ticket;
      }
    })
  );
}

/** -------------------------------
 * Stats
 -------------------------------- */
export async function fetchStats(): Promise<Stats> {
  const t = await fetchTickets();
  return {
    total: t.length,
    open: t.filter(x => x.status === "Open").length,
    pendingCustomer: t.filter(x => x.status === "Pending Customer").length,
    pending: t.filter(x => x.status === "Pending Customer").length,
    resolvedToday: t.filter(x => x.status === "Resolved").length,
    avgResolutionTime: "0h",
    totalTrend: 0,
    openTrend: 0,
    pendingTrend: 0,
    resolvedTodayTrend: 0,
  };
}

/** -------------------------------
 * Mutations
 -------------------------------- */
export async function updateTicketStatus(ticketId: string, newStatus: TicketStatus | string): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { status: newStatus } });
}
export async function updateResolutionSummary(ticketId: string, summary: string): Promise<void> {
  const fieldId = getFieldId("resolutionSummary");
  if (!fieldId) throw new Error("Resolution Summary field not found");
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { customField: [{ id: fieldId, value: summary }] } });
}
export async function updatePriority(ticketId: string, priority: TicketPriority | string): Promise<void> {
  const fieldId = getFieldId("priority");
  if (!fieldId) throw new Error("Priority field not found");
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { customField: [{ id: fieldId, value: priority }] } });
}
export async function updateCategory(ticketId: string, category: TicketCategory | string): Promise<void> {
  const fieldId = getFieldId("category");
  if (!fieldId) throw new Error("Category field not found");
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { customField: [{ id: fieldId, value: category }] } });
}
export async function updateOwner(ticketId: string, userId: string): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body: { assignedToUserId: userId } });
}
export async function updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  const body: any = {};
  const cf: Array<{ id: string; value: any }> = [];

  if (updates.status) body.status = updates.status;
  if (updates.assignedToUserId) body.assignedToUserId = updates.assignedToUserId;
  if (updates.description !== undefined) body.description = updates.description;
  if (updates.value !== undefined) body.value = updates.value;
  if (updates.dueDate !== undefined) body.dueDate = updates.dueDate;

  if (updates.priority) {
    const id = getFieldId("priority");
    if (id) cf.push({ id, value: updates.priority });
  }
  if (updates.category) {
    const id = getFieldId("category");
    if (id) cf.push({ id, value: updates.category });
  }
  if (updates.resolutionSummary !== undefined) {
    const id = getFieldId("resolutionSummary");
    if (id) cf.push({ id, value: updates.resolutionSummary });
  }

  if (cf.length) body.customField = cf;
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body });
}
export async function bulkUpdateStatus(ids: string[], status: TicketStatus | string): Promise<void> {
  await Promise.all(ids.map(id => updateTicketStatus(id, status)));
}
export async function bulkUpdatePriority(ids: string[], priority: TicketPriority | string): Promise<void> {
  await Promise.all(ids.map(id => updatePriority(id, priority)));
}

/** -------------------------------
 * Users
 -------------------------------- */
export async function fetchUsers(): Promise<GHLUser[]> {
  const res = await ghlRequest<any>("/users");
  const arr = res.users || res.data || [];
  return arr.map((u: any) => ({
    id: String(u.id),
    name: u.name || [u.firstName, u.lastName].filter(Boolean).join(" "),
    email: u.email,
  }));
}
