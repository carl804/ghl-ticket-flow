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

// Custom field IDs
const CUSTOM_FIELD_IDS = {
  description: 'y9aYiEln1CpSuz6u3rtE',
  priority: 'QMiATAEcjFjQc9q8FxW6',
  resolved: 'UiGPQzYy7u1xVixtCvld',
  resolutionSummary: 'ZzsDH7pErVhwLqJt1NjA',
  ticketOwner: 'VYv1QpVAAgns13227Pii',
  agencyName: '32NhsYp2R2zpExXr8TO1',
  category: 'eCjK3IHuhErwlkyWJ4Wx'
};

/** Get location ID from stored tokens */
function getLocationId(): string {
  const tokens = JSON.parse(localStorage.getItem('ghl_tokens') || '{}');
  if (!tokens.locationId) {
    throw new Error("Location ID not found. Please re-authenticate.");
  }
  return tokens.locationId;
}

/** Helper to get custom field value from opportunity */
function getCustomFieldValue(opp: any, fieldId: string): any {
  const customFields = opp.customFields || [];
  const field = customFields.find((f: any) => f.id === fieldId);
  return field?.fieldValue || field?.value || field?.field_value || '';
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
    
    // First, get all opportunity IDs from the pipeline
    const response = await ghlRequest<{ opportunities: any[] }>(
      `/opportunities/search`,
      { 
        queryParams: { 
          location_id: locationId,
          pipeline_id: "p14Is7nXjiqS6MVI0cCk",
          limit: 100
        },
        skipLocationId: true
      }
    );
    const opportunityIds = (response.opportunities || []).map((opp: any) => opp.id);
    
    console.log(`Fetching full details for ${opportunityIds.length} opportunities...`);
    
    // Then fetch full details for each opportunity (includes contact with tags)
    const fullOpportunities = await Promise.all(
      opportunityIds.map(id => 
        ghlRequest<any>(`/opportunities/${id}`).catch(err => {
          console.error(`Failed to fetch opportunity ${id}:`, err);
          return null;
        })
      )
    );
    
    // Filter out failed requests and extract the opportunity object
    const validOpportunities = fullOpportunities
      .filter(response => response !== null)
      .map(response => response.opportunity);

    return validOpportunities.map((opp: any) => {
      // Extract custom fields
      const description = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.description);
      const priority = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.priority) || "Medium";
      const resolutionSummary = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.resolutionSummary);
      const ticketOwner = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.ticketOwner);
      const agencyName = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.agencyName);
      const category = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.category) || "General Questions";
      
      console.log('🎫 Mapping opportunity:', opp.id);
      console.log('📋 Extracted custom fields:', { description, priority, resolutionSummary, ticketOwner, agencyName, category });
      
      return {
        id: opp.id,
        name: opp.name || `TICKET-${opp.id?.slice(0, 8)}`,
        contact: {
          id: opp.contact?.id || opp.contactId,
          name: opp.contact?.name || opp.contactName || "Unknown",
          email: opp.contact?.email || opp.contactEmail,
          phone: opp.contact?.phone || opp.contactPhone,
        },
        agencyName: agencyName || "N/A",
        status: toTicketStatus(opp.status || "Open"),
        priority: toTicketPriority(priority),
        category: category as TicketCategory,
        resolutionSummary: resolutionSummary || "",
        assignedTo: ticketOwner || "",
        assignedToUserId: opp.assignedTo || "",
        contactId: opp.contact?.id || opp.contactId,
        createdAt: opp.createdAt || new Date().toISOString(),
        updatedAt: opp.updatedAt || new Date().toISOString(),
        value: opp.monetaryValue || 0,
        dueDate: opp.dueDate || "",
        description: description || "",
        tags: Array.isArray(opp.contact?.tags) ? opp.contact.tags : [],
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
  const body: any = {};
  const customFields: Array<{ id: string; value: any }> = [];

  if (updates.status) body.status = updates.status;

  // Map assignedTo to Ticket Owner custom field (don't use assignedToUserId)
  if (updates.assignedTo !== undefined) {
    customFields.push({ id: CUSTOM_FIELD_IDS.ticketOwner, value: updates.assignedTo });
  }

  if (updates.priority) {
    customFields.push({ id: CUSTOM_FIELD_IDS.priority, value: updates.priority });
  }
  
  if (updates.category !== undefined) {
    customFields.push({ id: CUSTOM_FIELD_IDS.category, value: updates.category });
  }
  
  if (updates.description !== undefined) {
    customFields.push({ id: CUSTOM_FIELD_IDS.description, value: updates.description });
  }
  
  if (updates.resolutionSummary !== undefined) {
    customFields.push({ id: CUSTOM_FIELD_IDS.resolutionSummary, value: updates.resolutionSummary });
  }
  
  if (updates.agencyName !== undefined) {
    customFields.push({ id: CUSTOM_FIELD_IDS.agencyName, value: updates.agencyName });
  }

  if (customFields.length > 0) {
    body.customFields = customFields;
  }

  await ghlRequest(`/opportunities/${ticketId}`, { method: "PUT", body });
}
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
  // Return ticket owners from custom field options
  return [
    { id: "Aneela", name: "Aneela" },
    { id: "Carl", name: "Carl" },
    { id: "Chloe", name: "Chloe" },
    { id: "Christian", name: "Christian" },
    { id: "Jonathan", name: "Jonathan" },
    { id: "Joyce", name: "Joyce" },
  ];
}

/** Tags */
export interface GHLTag {
  id: string;
  name: string;
  color?: string;
}

/** Fetch all tags for the location */
export async function fetchTags(): Promise<GHLTag[]> {
  try {
    const locationId = getLocationId();
    console.log('Fetching tags for location:', locationId);
    
    const response = await ghlRequest<{ tags: any[] }>(
      `/locations/${locationId}/tags`,
      { skipLocationId: false }
    );
    
    console.log('Tags API response:', response);
    
    if (!response.tags || !Array.isArray(response.tags)) {
      console.error('Invalid tags response:', response);
      return [];
    }
    
    return response.tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    }));
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return [];
  }
}

/** Update tags on a contact */
export async function updateContactTags(contactId: string, tags: string[]): Promise<void> {
  try {
    console.log('Updating contact tags:', contactId, tags);
    
    await ghlRequest(`/contacts/${contactId}`, {
      method: "PUT",
      body: { tags },
    });
    
    console.log('Contact tags updated successfully');
    toast.success("Tags updated successfully");
  } catch (error) {
    console.error("Failed to update contact tags:", error);
    throw error;
  }
}

/** Converters to keep UI types safe */
export function toTicketStatus(value: string): TicketStatus {
  const allowed: TicketStatus[] = ["Open", "In Progress", "Pending Customer", "Resolved", "Closed", "Deleted"];
  return (allowed.includes(value as TicketStatus) ? value : "Open") as TicketStatus;
}

export function toTicketPriority(value: string): TicketPriority {
  const allowed: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];
  return (allowed.includes(value as TicketPriority) ? value : "Medium") as TicketPriority;
}