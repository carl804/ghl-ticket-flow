// Cache bust
import type {
  Ticket,
  OpportunityStatus,
  Stats,
  FieldMap,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "./types";
import { ghlRequest } from "@/integrations/ghl/client";
export { ghlRequest };
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
  category: 'eCjK3IHuhErwlkyWJ4Wx',
  intercomAgent: 'TIkNFiv8JUDvj0FMVF0E',
  ticketSource: 'ZfA3rPJQiSU8wRuEFWYP',
  intercomConversationId: 'gk2kXQuactrb8OdIJ3El',
};

// Stage ID to name mapping
const STAGE_MAP: Record<string, TicketStatus> = {
  "3f3482b8-14c4-4de2-8a3c-4a336d01bb6e": "Open",
  "bef596b8-d63d-40bd-b59a-5e0e474f1c8f": "In Progress",
  "4e24e27c-2e44-435b-bc1b-964e93518f20": "Resolved",
  "fdbed144-2dd3-48b7-981d-b0869082cc4e": "Closed",
  "7558330f-4b0e-48fd-af40-ab57f38c4141": "Escalated to Dev",
  "4a6eb7bf-51b0-4f4e-ad07-40256b92fe5b": "Deleted",
};

// Helper to format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (minutes < 60) {
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  } else if (hours < 24) {
    const mins = minutes % 60;
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  } else {
    const hrs = hours % 24;
    const mins = minutes % 60;
    return `${days}d ${hrs}h ${mins}m`;
  }
}

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
  const value = field?.fieldValueString || field?.fieldValue || field?.value || field?.field_value || '';
  return value;
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
    intercomAgent: fields.find((f) => f.fieldKey === "intercomAgent")?.id,
    ticketSource: fields.find((f) => f.fieldKey === "ticketSource")?.id,
    intercomConversationId: fields.find((f) => f.fieldKey === "intercomConversationId")?.id,
  };
}

function getFieldId(key: keyof FieldMap): string | undefined {
  return FIELD_MAP[key];
}

// Cache for ticket data (to track previous state)
const ticketCache = new Map<string, Ticket>();

/** Fetch tickets from Ticketing System pipeline with proper pagination */
export async function fetchTickets(): Promise<Ticket[]> {
  try {
    const locationId = getLocationId();
    
    console.log('🔄 Fetching all tickets with pagination...');
    console.log('📍 Location ID:', locationId);
    console.log('📋 Pipeline ID:', "p14Is7nXjiqS6MVI0cCk");
    
    let allOpportunities: any[] = [];
    let pageCount = 0;
    let startAfter: string | number | null = null;
    const limit = 100;
    const seenIds = new Set<string>(); // Track IDs to detect infinite loops
    
    // Keep fetching pages until we get less than 100 results
    while (true) {
      pageCount++;
      
      const queryParams: any = {
        location_id: locationId,
        pipeline_id: "p14Is7nXjiqS6MVI0cCk",
        limit: limit
      };
      
      if (startAfter) {
        queryParams.startAfter = startAfter;
      }
      
      console.log(`📄 Fetching page ${pageCount}${startAfter ? ` (startAfter: ${startAfter})` : ''}...`);
      
      const response = await ghlRequest<{ opportunities: any[]; meta?: { startAfterId?: string; startAfter?: string } }>(
        `/opportunities/search`,
        { 
          queryParams,
          skipLocationId: true
        }
      );
      
      const opportunities = response.opportunities || [];
      const meta = response.meta;
      
      console.log(`✅ Page ${pageCount}: Got ${opportunities.length} opportunities`);
      console.log(`📍 Meta pagination:`, meta);
      
      // If no opportunities returned, we're done
      if (opportunities.length === 0) {
        console.log('🏁 No more opportunities, stopping pagination');
        break;
      }
      
      // Check for infinite loop - if we've seen the first ID before, stop
      const firstId = opportunities[0]?.id;
      if (firstId && seenIds.has(firstId)) {
        console.warn('⚠️ Detected infinite loop - same opportunities returned, stopping');
        break;
      }
      
      // Add all IDs to seen set
      opportunities.forEach(opp => seenIds.add(opp.id));
      
      // Add to collection
      allOpportunities = [...allOpportunities, ...opportunities];
      
      // If we got less than limit, we've reached the end
      if (opportunities.length < limit) {
        console.log('🏁 Got less than 100 opportunities, reached the end');
        break;
      }
      
      // Use meta.startAfter from response for next page (this is the correct way!)
      if (meta?.startAfter) {
        startAfter = meta.startAfter;
        console.log(`🔄 Next page will use startAfter from meta: ${startAfter}`);
      } else {
        console.log('🏁 No meta.startAfter in response, stopping pagination');
        break;
      }
      
      // Safety check: don't loop forever
      if (pageCount >= 20) {
        console.warn('⚠️ Reached maximum page limit (20 pages = 2000 tickets)');
        break;
      }
    }
    
    console.log(`🎉 Total opportunities fetched: ${allOpportunities.length} across ${pageCount} pages`);
    console.log('🔍 Sample ticket names:', allOpportunities.slice(0, 10).map(o => o.name));
    
    // Process all opportunities into tickets
    const tickets = allOpportunities.map((opp: any) => {
      const description = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.description);
      const priority = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.priority) || "Medium";
      const resolutionSummary = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.resolutionSummary);
      const ticketOwner = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.ticketOwner);
      const agencyName = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.agencyName);
      const category = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.category) || "General Questions";
      const intercomAgent = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.intercomAgent);
      const ticketSource = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.ticketSource);
      const intercomConversationId = getCustomFieldValue(opp, CUSTOM_FIELD_IDS.intercomConversationId);
      
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
        status: STAGE_MAP[opp.pipelineStageId] || "Open",
        opportunityStatus: (opp.status as OpportunityStatus) || "open",
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
        intercomAgent: intercomAgent || undefined,
        ticketSource: ticketSource || undefined,
        intercomConversationId: intercomConversationId || undefined,
      } as Ticket;
    });

    // Update cache
    tickets.forEach(ticket => ticketCache.set(ticket.id, ticket));

    console.log(`🎯 Successfully processed ${tickets.length} tickets`);
    
    return tickets;
  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    toast.error(`Unable to fetch tickets: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/** Dashboard stats */
export async function fetchStats(): Promise<Stats> {
  const tickets = await fetchTickets();
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "Open").length;
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
    pendingCustomer: 0,
    resolvedToday,
    avgResolutionTime,
    totalTrend: 0,
    openTrend: 0,
    resolvedTodayTrend: 0,
  };
}

export async function updateTicketStatus(ticketId: string, newStatus: TicketStatus): Promise<void> {
  const previousTicket = ticketCache.get(ticketId);
  
  const stageId = Object.keys(STAGE_MAP).find(key => STAGE_MAP[key] === newStatus);
  if (!stageId) throw new Error(`Invalid status: ${newStatus}`);
  
  await ghlRequest(`/opportunities/${ticketId}`, { 
    method: "PUT", 
    body: { 
      pipelineStageId: stageId
    } 
  });
  
  if (previousTicket) {
    ticketCache.set(ticketId, { ...previousTicket, status: newStatus, updatedAt: new Date().toISOString() });
  }
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

  if (updates.status) {
    const stageId = Object.keys(STAGE_MAP).find(key => STAGE_MAP[key] === updates.status);
    if (stageId) body.pipelineStageId = stageId;
  }

  if (updates.opportunityStatus) {
    body.status = updates.opportunityStatus;
  }

  if (updates.name) {
    body.name = updates.name;
  }

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

export async function bulkUpdateStatus(ids: string[], status: TicketStatus): Promise<void> {
  await Promise.all(ids.map((id) => updateTicketStatus(id, status)));
}

export async function bulkUpdatePriority(ids: string[], priority: TicketPriority): Promise<void> {
  await Promise.all(ids.map((id) => updatePriority(id, priority)));
}

export interface GHLUser {
  id: string;
  name: string;
  email?: string;
}

export async function fetchUsers(): Promise<GHLUser[]> {
  return [
    { id: "Aneela", name: "Aneela" },
    { id: "Carl", name: "Carl" },
    { id: "Chloe", name: "Chloe" },
    { id: "Christian", name: "Christian" },
    { id: "Jonathan", name: "Jonathan" },
    { id: "Joyce", name: "Joyce" },
  ];
}

export interface GHLTag {
  id: string;
  name: string;
  color?: string;
}

export async function fetchTags(): Promise<GHLTag[]> {
  try {
    const locationId = getLocationId();
    
    const response = await ghlRequest<{ tags: any[] }>(
      `/locations/${locationId}/tags`,
      { skipLocationId: true }
    );
    
    if (!response.tags || !Array.isArray(response.tags)) {
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

export async function updateContactTags(contactId: string, tags: string[]): Promise<void> {
  try {
    await ghlRequest(`/contacts/${contactId}`, {
      method: "PUT",
      body: { tags },
      skipLocationId: true
    });
    
    toast.success("Tags updated successfully");
  } catch (error) {
    console.error("Failed to update contact tags:", error);
    throw error;
  }
}

export function toTicketStatus(value: string): TicketStatus {
  const allowed: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed", "Escalated to Dev", "Deleted"];
  return (allowed.includes(value as TicketStatus) ? value : "Open") as TicketStatus;
}

export function toTicketPriority(value: string): TicketPriority {
  const allowed: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];
  return (allowed.includes(value as TicketPriority) ? value : "Medium") as TicketPriority;
}