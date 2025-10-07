import type {
  Ticket,
  Stats,
  FieldMap,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "./types";
import { ghlRequest } from "@/integrations/ghl/client";
import { toast } from "sonner";

let FIELD_MAP: FieldMap = {};

/** Get location ID from stored tokens */
function getLocationId(): string {
  const tokens = JSON.parse(localStorage.getItem('ghl_tokens') || '{}');
  if (!tokens.locationId) {
    throw new Error("Location ID not found. Please re-authenticate.");
  }
  return tokens.locationId;
}

/** Load custom field ids once */
export async function initializeFieldMap(): Promise<void> {
  const locationId = getLocationId();
  const response = await ghlRequest<{ customFields: any[] }>(
    `/locations/${locationId}/customFields`
  );
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

/** Fetch tickets from Ticketing System pipeline only */
export async function fetchTickets(): Promise<Ticket[]> {
  try {
    const locationId = getLocationId();
    
    const response = await ghlRequest<{ opportunities: any[] }>(
      `/opportunities/search`,
      { 
        queryParams: { 
          location_id: locationId,
          pipelineId: "p14Is7nXjiqS6MVI0cCk",
          limit: 100
        },
        skipLocationId: true
      }
    );

    const allOpportunities = response.opportunities || [];

    return allOpportunities.map((opp: any) => {
      const category = (opp.category as TicketCategory) || "General Questions";
      return {
        id: opp.id,
        name: opp.name || `TICKET-${opp.id?.slice(0, 8)}`,
        contact: {
          id: opp.contactId,
          name: opp.contactName || "Unknown",
          email: opp.contactEmail,
          phone: opp.contactPhone,
        },
        agencyName: opp.agencyName || "N/A",
        status: toTicketStatus(opp.status || "Open"),
        priority: toTicketPriority(opp.priority || "Medium"),
        category,
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
  } catch (error) {
    toast.error(`Unable to fetch tickets: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/** Dashboard stats */
export async function fetchStats(): Promise<Stats> {
  const tickets = await fetchTickets();
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "Open").length;
  const pendingCustomer = tickets.filter((t) => t.status === "Pending Customer").length;
  const resolvedToday = tickets.filter(
    (t) =>
      t.status === "Resolved" &&
      new Date(t.updatedAt).getTime() >= new Date().setHours(0, 0, 0, 0)
  ).length;

  const resolved = tickets.filter((t) => t.status === "Resolved");
  const avgMs =
    resolved.reduce(
      (acc, t) => acc + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()),
      0
    ) / (resolved.length || 1);

  const avgHours = Math.round(avgMs / (1000 * 60 * 60));
  const avgResolutionTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`;

  return {
    total,
    open,
    pendingCustomer,
    resolvedToday,
    avgResolutionTime,
    pending: pendingCustomer,
    totalTrend: 0,
    openTrend: 0,
    pendingTrend: 0,
    resolvedTodayTrend: 0,
  };
}

/** Updates */
export async function updateTicketStatus(ticketId: string, newStatus: TicketStatus): Promise<void> {
  const locationId = getLocationId();
  await ghlRequest(`/opportunities/${ticketId}`, { 
    method: "PATCH", 
    body: { 
      status: newStatus,
      locationId 
    } 
  });
}

export async function updatePriority(ticketId: string, priority: TicketPriority): Promise<void> {
  const fieldId = getFieldId("priority");
  if (!fieldId) throw new Error("Priority field not found");
  
  const locationId = getLocationId();
  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { 
      customField: [{ id: fieldId, value: priority }],
      locationId 
    },
  });
}

export async function updateCategory(ticketId: string, category: TicketCategory): Promise<void> {
  const fieldId = getFieldId("category");
  if (!fieldId) throw new Error("Category field not found");
  
  const locationId = getLocationId();
  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { 
      customField: [{ id: fieldId, value: category }],
      locationId 
    },
  });
}

export async function updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  const locationId = getLocationId();
  const body: any = { locationId };
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

export async function bulkUpdateStatus(ids: string[], status: TicketStatus): Promise<void> {
  await Promise.all(ids.map((id) => updateTicketStatus(id, status)));
}

export async function bulkUpdatePriority(ids: string[], priority: TicketPriority): Promise<void> {
  await Promise.all(ids.map((id) => updatePriority(id, priority)));
}

/** Users - endpoint doesn't exist in OAuth v2 */
export interface GHLUser {
  id: string;
  name: string;
  email?: string;
}

export async function fetchUsers(): Promise<GHLUser[]> {
  // Endpoint doesn't exist in OAuth v2 API
  return [];
}

/** Converters to keep UI types safe */
export function toTicketStatus(value: string): TicketStatus {
  const allowed: TicketStatus[] = ["Open", "In Progress", "Pending Customer", "Resolved"];
  return (allowed.includes(value as TicketStatus) ? value : "Open") as TicketStatus;
}

export function toTicketPriority(value: string): TicketPriority {
  const allowed: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];
  return (allowed.includes(value as TicketPriority) ? value : "Medium") as TicketPriority;
}