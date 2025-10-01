import type { Ticket, Stats, FieldMap, CustomField, TicketStatus, TicketPriority, TicketCategory } from "./types";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const USE_MOCK_DATA = false; // Always use real API through edge function
const GHL_LOCATION_ID = import.meta.env.VITE_GHL_LOCATION_ID;

let FIELD_MAP: FieldMap = {};
let PIPELINE_ID: string | null = null;

// Helper to make GHL requests through edge function
async function ghlRequest<T>(endpoint: string, options?: { method?: string; body?: any; queryParams?: Record<string, string> }): Promise<T> {
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
    
    const ticketPipeline = response.pipelines?.find(p => 
      p.name.toLowerCase().includes("ticketing system")
    );

    if (!ticketPipeline) {
      throw new Error("Ticketing System pipeline not found. Please create a pipeline with 'Ticketing System' in the name.");
    }

    PIPELINE_ID = ticketPipeline.id;
    return PIPELINE_ID;
  } catch (error) {
    console.error("Failed to fetch pipeline ID:", error);
    throw error;
  }
}

// Initialize custom field mapping
export async function initializeFieldMap(): Promise<void> {
  if (USE_MOCK_DATA) return;

  try {
    const response = await ghlRequest<{ customFields: CustomField[] }>("/custom-fields");
    const fields = response.customFields;

    FIELD_MAP = {
      priority: fields.find(f => f.fieldKey === "priority")?.id,
      category: fields.find(f => f.fieldKey === "category")?.id,
      resolutionSummary: fields.find(f => f.fieldKey === "resolutionSummary")?.id,
      agencyName: fields.find(f => f.fieldKey === "agencyName")?.id,
    };
  } catch (error) {
    console.error("Failed to initialize field map:", error);
  }
}

export function getFieldId(key: keyof FieldMap): string | undefined {
  return FIELD_MAP[key];
}

// Mock data for development
const MOCK_TICKETS: Ticket[] = [
  {
    id: "1",
    name: "BILLING-10001",
    contact: { id: "c1", name: "John Doe", email: "john@example.com", phone: "+1234567890" },
    agencyName: "Acme Corp",
    status: "Open",
    priority: "High",
    category: "Billing",
    resolutionSummary: "",
    assignedTo: "Sarah Johnson",
    assignedToUserId: "u1",
    contactId: "c1",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    value: 500,
    description: "Customer cannot access billing portal",
    tags: ["urgent", "portal"],
  },
  {
    id: "2",
    name: "TECH-10002",
    contact: { id: "c2", name: "Jane Smith", email: "jane@example.com", phone: "+1234567891" },
    agencyName: "TechFlow Inc",
    status: "In Progress",
    priority: "Medium",
    category: "Tech",
    resolutionSummary: "Investigating API connection issues",
    assignedTo: "Mike Chen",
    assignedToUserId: "u2",
    contactId: "c2",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    value: 1200,
    description: "Integration not syncing properly",
    tags: ["api", "integration"],
  },
  {
    id: "3",
    name: "SALES-10003",
    contact: { id: "c3", name: "Bob Wilson", email: "bob@example.com", phone: "+1234567892" },
    agencyName: "Digital Solutions",
    status: "Pending Customer",
    priority: "Low",
    category: "Sales",
    resolutionSummary: "Waiting for customer response on pricing",
    assignedTo: "Sarah Johnson",
    assignedToUserId: "u1",
    contactId: "c3",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    value: 3000,
    description: "Enterprise plan inquiry",
    tags: ["enterprise"],
  },
  {
    id: "4",
    name: "ONBOARDING-10004",
    contact: { id: "c4", name: "Alice Brown", email: "alice@example.com", phone: "+1234567893" },
    agencyName: "StartupHub",
    status: "Resolved",
    priority: "Medium",
    category: "Onboarding",
    resolutionSummary: "Completed setup and training session",
    assignedTo: "Mike Chen",
    assignedToUserId: "u2",
    contactId: "c4",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    value: 0,
    description: "New customer onboarding",
    tags: ["training"],
  },
  {
    id: "5",
    name: "OUTAGE-10005",
    contact: { id: "c5", name: "Chris Davis", email: "chris@example.com", phone: "+1234567894" },
    agencyName: "CloudNet",
    status: "In Progress",
    priority: "Urgent",
    category: "Outage",
    resolutionSummary: "Working with engineering team",
    assignedTo: "Sarah Johnson",
    assignedToUserId: "u1",
    contactId: "c5",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    value: 0,
    description: "Service disruption reported",
    tags: ["critical", "outage"],
  },
  {
    id: "6",
    name: "BILLING-10006",
    contact: { id: "c6", name: "Emma Wilson", email: "emma@example.com", phone: "+1234567895" },
    agencyName: "Acme Corp",
    status: "Open",
    priority: "Low",
    category: "Billing",
    resolutionSummary: "",
    assignedTo: "Mike Chen",
    assignedToUserId: "u2",
    contactId: "c6",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    value: 200,
    description: "Invoice inquiry",
    tags: ["billing"],
  },
];

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
export async function fetchTickets(): Promise<Ticket[]> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return MOCK_TICKETS;
  }

  try {
    // Step 1: Get Pipeline ID
    const pipelineId = await getPipelineId();
    
    // Step 2: Fetch opportunities from the pipeline
    const response = await ghlRequest<{ opportunities: any[] }>(`/pipelines/${pipelineId}/opportunities`);
    
    if (!response.opportunities || response.opportunities.length === 0) {
      return [];
    }
    
    // Fetch contacts for each opportunity
    const ticketsPromises = response.opportunities.map(async (opp: any) => {
      try {
        const contact = await ghlRequest<any>(`/contacts/${opp.contactId}`);
        
        // Extract custom fields
        const customFields = opp.customField || [];
        const getCustomFieldValue = (key: string) => 
          customFields.find((f: any) => f.id === FIELD_MAP[key as keyof FieldMap])?.value;
        
        return {
          id: opp.id,
          name: opp.name || `TICKET-${opp.id.slice(0, 8)}`,
          contact: {
            id: contact.contact?.id || contact.id,
            name: contact.contact?.name || contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
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
        return null;
      }
    });

    const tickets = await Promise.allSettled(ticketsPromises);
    return tickets
      .filter((result): result is PromiseFulfilledResult<Ticket> => result.status === "fulfilled" && result.value !== null)
      .map(result => result.value);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    toast.error("Unable to fetch tickets. Check API Key or Pipeline.");
    throw error;
  }
}

// Fetch stats
export async function fetchStats(): Promise<Stats> {
  const tickets = await fetchTickets();
  
  const total = tickets.length;
  const open = tickets.filter(t => t.status === "Open").length;
  const pendingCustomer = tickets.filter(t => t.status === "Pending Customer").length;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resolvedToday = tickets.filter(t => 
    t.status === "Resolved" && new Date(t.updatedAt) >= today
  ).length;

  // Calculate avg resolution time (simplified)
  const resolved = tickets.filter(t => t.status === "Resolved");
  const avgMs = resolved.reduce((acc, t) => {
    const created = new Date(t.createdAt).getTime();
    const updated = new Date(t.updatedAt).getTime();
    return acc + (updated - created);
  }, 0) / (resolved.length || 1);
  
  const avgHours = Math.round(avgMs / (1000 * 60 * 60));
  const avgResolutionTime = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`;

  return { total, open, pendingCustomer, resolvedToday, avgResolutionTime };
}

// Update ticket status
export async function updateTicketStatus(ticketId: string, newStatus: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { status: newStatus },
  });
}

// Update resolution summary
export async function updateResolutionSummary(ticketId: string, summary: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

  const fieldId = getFieldId("resolutionSummary");
  if (!fieldId) throw new Error("Resolution summary field not found");

  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: {
      customField: [{ id: fieldId, value: summary }],
    },
  });
}

// Update priority
export async function updatePriority(ticketId: string, priority: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

  const fieldId = getFieldId("priority");
  if (!fieldId) throw new Error("Priority field not found");

  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: {
      customField: [{ id: fieldId, value: priority }],
    },
  });
}

// Update category
export async function updateCategory(ticketId: string, category: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

  const fieldId = getFieldId("category");
  if (!fieldId) throw new Error("Category field not found");

  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: {
      customField: [{ id: fieldId, value: category }],
    },
  });
}

// Update owner
export async function updateOwner(ticketId: string, userId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body: { assignedToUserId: userId },
  });
}

// Update ticket (general)
export async function updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

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

  await ghlRequest(`/opportunities/${ticketId}`, {
    method: "PATCH",
    body,
  });
}

// Bulk update status
export async function bulkUpdateStatus(ids: string[], status: string): Promise<void> {
  await Promise.all(ids.map(id => updateTicketStatus(id, status)));
}

// Bulk update priority
export async function bulkUpdatePriority(ids: string[], priority: string): Promise<void> {
  await Promise.all(ids.map(id => updatePriority(id, priority)));
}

// Fetch GHL users/owners
export interface GHLUser {
  id: string;
  name: string;
  email?: string;
}

const MOCK_USERS: GHLUser[] = [
  { id: "u1", name: "Sarah Johnson", email: "sarah@example.com" },
  { id: "u2", name: "Mike Chen", email: "mike@example.com" },
  { id: "u3", name: "Emily Davis", email: "emily@example.com" },
  { id: "u4", name: "Alex Martinez", email: "alex@example.com" },
];

export async function fetchUsers(): Promise<GHLUser[]> {
  if (USE_MOCK_DATA) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_USERS;
  }

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

export { USE_MOCK_DATA };
