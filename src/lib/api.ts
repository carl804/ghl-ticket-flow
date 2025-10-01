import type { Ticket, Stats, FieldMap, CustomField, TicketStatus, TicketPriority, TicketCategory } from "./types";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const USE_MOCK_DATA = false; // Always use real API through edge function
const GHL_LOCATION_ID = import.meta.env.VITE_GHL_LOCATION_ID;

let FIELD_MAP: FieldMap = {};
let PIPELINE_ID: string | null = null;

// Helper to make GHL requests through edge function
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

  if (error) {
    throw new Error(`GHL API Error: ${error.message}`);
  }

  if (data.error) {
    throw new Error(`GHL API Error: ${data.error}`);
  }

  return data;
}

// Get Pipeline ID by finding "Ticketing System" pipeline
async function getPipelineId(): Promise<string> {
  if (PIPELINE_ID) return PIPELINE_ID;

  try {
    const response = await ghlRequest<{ pipelines: Array<{ id: string; name: string }> }>("/pipelines");

    if (!response.pipelines || response.pipelines.length === 0) {
      throw new Error("No pipelines found in your GHL account");
    }

    const ticketPipeline = response.pipelines.find((p) =>
      p.name.toLowerCase().includes("ticketing system")
    );

    if (!ticketPipeline) {
      const availablePipelines = response.pipelines.map((p) => p.name).join(", ");
      throw new Error(`Ticketing System pipeline not found. Available pipelines: ${availablePipelines}`);
    }

    PIPELINE_ID = ticketPipeline.id;
    console.log(`Found Ticketing System pipeline: ${ticketPipeline.name} (${PIPELINE_ID})`);
    return PIPELINE_ID;
  } catch (error) {
    console.error("Failed to fetch pipeline ID:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Pipeline Error: ${errorMessage}`);
    throw error;
  }
}

// Initialize custom field mapping
async function initializeFieldMap(): Promise<void> {
  if (USE_MOCK_DATA) return;

  try {
    const response = await ghlRequest<{ customFields: CustomField[] }>("/custom-fields");
    const fields = response.customFields;

    FIELD_MAP = {
      priority: fields.find((f) => f.fieldKey === "priority")?.id,
      category: fields.find((f) => f.fieldKey === "category")?.id,
      resolutionSummary: fields.find((f) => f.fieldKey === "resolutionSummary")?.id,
      agencyName: fields.find((f) => f.fieldKey === "agencyName")?.id,
    };
  } catch (error) {
    console.error("Failed to initialize field map:", error);
  }
}

function getFieldId(key: keyof FieldMap): string | undefined {
  return FIELD_MAP[key];
}

// Map GHL status to our status format
function mapStatus(ghlStatus: string): TicketStatus {
  const statusLower = ghlStatus.toLowerCase().replace(/[_\s]/g, "");

  if (statusLower.includes("open")) return "Open";
  if (statusLower.includes("inprogress") || statusLower.includes("progress")) return "In Progress";
  if (statusLower.includes("pending") || statusLower.includes("customer")) return "Pending Customer";
  if (statusLower.includes("resolved") || statusLower.includes("closed")) return "Resolved";

  return "Open"; // Default fallback
}

// Fetch tickets with stitched data
async function fetchTickets(): Promise<Ticket[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return []; // use mock if needed
  }

  try {
    const pipelineId = await getPipelineId();
    console.log(`Fetching opportunities from pipeline: ${pipelineId}`);

    const response = await ghlRequest<{ opportunities: any[] }>(
      `/pipelines/${pipelineId}/opportunities`
    );

    if (!response.opportunities || response.opportunities.length === 0) {
      console.log("No opportunities found in pipeline");
      return [];
    }

    const ticketsPromises = response.opportunities.map(async (opp: any, index: number) => {
      try {
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, index * 100));
        }

        const contact = await ghlRequest<any>(`/contacts/${opp.contactId}`);

        const customFields = opp.customField || [];
        const getCustomFieldValue = (key: string) =>
          customFields.find((f: any) => f.id === FIELD_MAP[key as keyof FieldMap])?.value;

        return {
          id: opp.id,
          name: opp.name || `TICKET-${opp.id.slice(0, 8)}`,
          contact: {
            id: contact.contact?.id || contact.id,
            name:
              contact.contact?.name ||
              contact.name ||
              `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
            email: contact.contact?.email || contact.email,
            phone: contact.contact?.phone || contact.phone,
          },
          agencyName: getCustomFieldValue("agencyName"),
          status: mapStatus(opp.status || opp.pipelineStageId || "open"),
          priority: (getCustomFieldValue("priority") || "Medium") as TicketPriority,
          category: (getCustomFieldValue("category") || "Tech") as TicketCategory,
          resolutionSummary: getCustomFieldValue("resolutionSummary"),
          assignedTo: opp.assignedTo,
          assignedToUserId: opp.assignedToUserId,
          contactId: opp.contactId,
          createdAt: opp.dateAdded || opp.createdAt || new Date().toISOString(),
          updatedAt: opp.lastStatusChangeAt || opp.updatedAt || new Date().toISOString(),
          value: opp.monetaryValue || opp.value || 0,
          dueDate: opp.dueDate,
          description: opp.description || opp.notes,
          tags: opp.tags || [],
        } as Ticket;
      } catch (error) {
        console.error(`Failed to fetch contact for opportunity ${opp.id}:`, error);
        return {
          id: opp.id,
          name: opp.name || `TICKET-${opp.id.slice(0, 8)}`,
          contact: { id: opp.contactId, name: "Unknown Contact" },
          status: mapStatus(opp.status || "open"),
          priority: "Medium" as TicketPriority,
          category: "Tech" as TicketCategory,
          contactId: opp.contactId,
          createdAt: opp.dateAdded || new Date().toISOString(),
          updatedAt: opp.lastStatusChangeAt || new Date().toISOString(),
          value: 0,
        } as Ticket;
      }
    });

    const tickets = await Promise.allSettled(ticketsPromises);
    return tickets
      .filter((result): result is PromiseFulfilledResult<Ticket> => result.status === "fulfilled")
      .map((result) => result.value);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    toast.error(`Unable to fetch tickets: ${(error as Error).message}`);
    throw error;
  }
}

// Fetch stats
async function fetchStats(): Promise<Stats> {
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
      resolved.reduce((acc, t) => {
        const created = new Date(t.createdAt).getTime();
        const updated = new Date(t.updatedAt).getTime();
        return acc + (updated - created);
      }, 0) / (resolved.length || 1);

    const avgHours = Math.round(avgMs / (1000 * 60 * 60));
    const avgResolutionTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`;

    return { total, open, pendingCustomer, resolvedToday, avgResolutionTime };
  } catch (error) {
    console.error("fetchStats failed:", error);
    return { total: 0, open: 0, pendingCustomer: 0, resolvedToday: 0, avgResolutionTime: "0h" };
  }
}

// Update ticket functions
async function updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  const body: any = {};
  const customFields: Array<{ id: string; value: any }> = [];

  if (updates.status) body.status = updates.status;
  if (updates.assignedToUserId) body.assignedToUserId = updates.assignedToUserId;
  if (updates.description) body.description = updates.description;
  if (updates.value !== undefined) body.value = updates.value;
  if (updates.dueDate) body.dueDate = updates.dueDate;

  if (updates.priority) {
    const fieldId = getFieldId("priority");
    if (fieldId) customFields.push({ id: fieldId, value: updates.priority });
  }
  if (updates.category) {
    const fieldId = getFieldId("category");
    if (fieldId) customFields.push({ id: fieldId, value: updates.category });
  }
  if (updates.resolutionSummary !== undefined) {
    const fieldId = getFieldId("resolutionSummary");
    if (fieldId) customFields.push({ id: fieldId, value: updates.resolutionSummary });
  }

  if (customFields.length > 0) {
    body.customField = customFields;
  }

  await ghlRequest(`/opportunities/${ticketId}`, { method: "PATCH", body });
}

async function updateTicketStatus(ticketId: string, newStatus: string): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { status: newStatus },
  });
}

async function updateResolutionSummary(ticketId: string, summary: string): Promise<void> {
  const fieldId = getFieldId("resolutionSummary");
  if (!fieldId) throw new Error("Resolution summary field not found");

  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { customField: [{ id: fieldId, value: summary }] },
  });
}

async function updatePriority(ticketId: string, priority: string): Promise<void> {
  const fieldId = getFieldId("priority");
  if (!fieldId) throw new Error("Priority field not found");

  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { customField: [{ id: fieldId, value: priority }] },
  });
}

async function updateCategory(ticketId: string, category: string): Promise<void> {
  const fieldId = getFieldId("category");
  if (!fieldId) throw new Error("Category field not found");

  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { customField: [{ id: fieldId, value: category }] },
  });
}

async function updateOwner(ticketId: string, userId: string): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { assignedToUserId: userId },
  });
}

async function bulkUpdateStatus(ids: string[], status: string): Promise<void> {
  await Promise.all(ids.map((id) => updateTicketStatus(id, status)));
}

async function bulkUpdatePriority(ids: string[], priority: string): Promise<void> {
  await Promise.all(ids.map((id) => updatePriority(id, priority)));
}

// Fetch users
interface GHLUser {
  id: string;
  name: string;
  email?: string;
}

async function fetchUsers(): Promise<GHLUser[]> {
  try {
    const response = await ghlRequest<any>("/users/");
    return response.users.map((user: any) => ({
      id: user.id,
      name: user.name || `${user.firstName} ${user.lastName}`,
      email: user.email,
    }));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}

export {
  USE_MOCK_DATA,
  fetchTickets,
  fetchStats,
  fetchUsers,
  updateTicket,
  updateTicketStatus,
  updateResolutionSummary,
  updatePriority,
  updateCategory,
  updateOwner,
  bulkUpdateStatus,
  bulkUpdatePriority,
  initializeFieldMap,
};
