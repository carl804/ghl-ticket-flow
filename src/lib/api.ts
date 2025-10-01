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

const USE_MOCK_DATA = false; // always try real API
let FIELD_MAP: FieldMap = {};
let PIPELINE_ID: string | null = null;

// ------------------------------
// Helper: Proxy GHL API through Supabase Edge Function
// ------------------------------
async function ghlRequest<T>(
  endpoint: string,
  options?: { method?: string; body?: any; queryParams?: Record<string, string> }
): Promise<T> {
  console.log("[api.ts] Calling endpoint:", endpoint, options || {});
  const { data, error } = await supabase.functions.invoke("ghl-proxy", {
    body: {
      endpoint,
      method: options?.method || "GET",
      body: options?.body,
      queryParams: options?.queryParams,
    },
  });

  if (error) {
    console.error("[api.ts] Proxy error:", error);
    throw new Error(`Proxy Error: ${error.message}`);
  }

  if (data?.error) {
    console.error("[api.ts] GHL error:", data.error);
    throw new Error(`GHL API Error: ${data.error}`);
  }

  return data;
}

// ------------------------------
// Get Pipeline ID (cached)
// ------------------------------
async function getPipelineId(): Promise<string> {
  if (PIPELINE_ID) return PIPELINE_ID;

  console.log("[api.ts] Fetching pipelines...");
  const response = await ghlRequest<{ pipelines: Array<{ id: string; name: string }> }>("/pipelines");
  console.log("[api.ts] Pipelines response:", response);

  if (!response.pipelines || response.pipelines.length === 0) {
    throw new Error("No pipelines found in your GHL account");
  }

  const ticketPipeline = response.pipelines.find((p) =>
    p.name.toLowerCase().includes("ticketing system")
  );

  if (!ticketPipeline) {
    const available = response.pipelines.map((p) => p.name).join(", ");
    throw new Error(`Ticketing System pipeline not found. Available: ${available}`);
  }

  PIPELINE_ID = ticketPipeline.id;
  console.log(`[api.ts] Using Ticketing pipeline: ${ticketPipeline.name} (${PIPELINE_ID})`);
  return PIPELINE_ID;
}

// ------------------------------
// Custom Fields mapping
// ------------------------------
export async function initializeFieldMap(): Promise<void> {
  if (USE_MOCK_DATA) return;

  try {
    const response = await ghlRequest<{ customFields: any[] }>("/custom-fields");
    console.log("[api.ts] Custom fields response:", response);

    const fields = response.customFields || [];
    FIELD_MAP = {
      priority: fields.find((f) => f.fieldKey === "priority")?.id,
      category: fields.find((f) => f.fieldKey === "category")?.id,
      resolutionSummary: fields.find((f) => f.fieldKey === "resolutionSummary")?.id,
      agencyName: fields.find((f) => f.fieldKey === "agencyName")?.id,
    };

    console.log("[api.ts] FIELD_MAP initialized:", FIELD_MAP);
  } catch (err) {
    console.error("[api.ts] Failed to init field map:", err);
  }
}

function getFieldId(key: keyof FieldMap): string | undefined {
  return FIELD_MAP[key];
}

// ------------------------------
// Fetch Tickets
// ------------------------------
export async function fetchTickets(): Promise<Ticket[]> {
  console.log("[api.ts] Fetching tickets...");
  try {
    const pipelineId = await getPipelineId();
    console.log("[api.ts] Using pipelineId:", pipelineId);

    const response = await ghlRequest<{ opportunities: any[] }>(
      `/pipelines/${pipelineId}/opportunities`
    );
    console.log("[api.ts] Opportunities response:", response);

    if (!response.opportunities || response.opportunities.length === 0) {
      console.warn("[api.ts] No opportunities found");
      return [];
    }

    const tickets = response.opportunities.map((opp: any) => {
      const status = (opp.status || "Open") as TicketStatus;
      return {
        id: opp.id,
        name: opp.name || `TICKET-${opp.id.slice(0, 8)}`,
        contact: {
          id: opp.contactId,
          name: opp.contactName || "Unknown",
          email: opp.contactEmail,
          phone: opp.contactPhone,
        },
        agencyName: opp.agencyName || "N/A",
        status,
        priority: (opp.priority || "Medium") as TicketPriority,
        category: (opp.category || "Tech") as TicketCategory,
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
      } as Ticket;
    });

    console.log(`[api.ts] Loaded ${tickets.length} tickets`);
    return tickets;
  } catch (error) {
    console.error("[api.ts] Failed to fetch tickets:", error);
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
  const resolvedToday = tickets.filter(
    (t) => t.status === "Resolved" && new Date(t.updatedAt) >= new Date().setHours(0, 0, 0, 0)
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

  if (customFields.length > 0) {
    body.customField = customFields;
  }

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
// Fetch Users (for AssignedTo dropdown)
// ------------------------------
// ------------------------------
// Fetch Users (for AssignedTo dropdown)
// ------------------------------
export interface GHLUser {
  id: string;
  name: string;
  email?: string;
}

export async function fetchUsers(): Promise<GHLUser[]> {
  try {
    const response = await ghlRequest<any>("/users/");
    console.log("[api.ts] Users response:", response);

    if (!response.users) return [];

    return response.users.map((u: any) => ({
      id: u.id,
      name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      email: u.email,
    }));
  } catch (err) {
    console.error("[api.ts] Failed to fetch users:", err);
    return [];
  }
}

// ------------------------------
// Explicit Exports
// ------------------------------
export {
  USE_MOCK_DATA,
  fetchTickets,
  fetchStats,
  updateTicket,
  updateTicketStatus,
  updateResolutionSummary,
  updatePriority,
  updateCategory,
  updateOwner,
  bulkUpdateStatus,
  bulkUpdatePriority,
  fetchUsers,              // 👈 explicit export here
  initializeFieldMap,
};

// ------------------------------
export { USE_MOCK_DATA };
