import type { Ticket, Stats, FieldMap, CustomField, TicketStatus, TicketPriority, TicketCategory } from "./types";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const USE_MOCK_DATA = false; // Always use real API through edge function
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
export async function initializeFieldMap(): Promise<void> {
  if (USE_MOCK_DATA) return;

  try {
    const response = await ghlRequest<{ customFields: CustomField[] }>("/custom-fields");
    const fields = response.customFields || [];

    FIELD_MAP = {
      priority: fields.find((f) => f.fieldKey?.endsWith(".priority"))?.id,
      category: fields.find((f) => f.fieldKey?.endsWith(".category"))?.id,
      resolutionSummary: fields.find((f) => f.fieldKey?.endsWith(".resolution_summary"))?.id,
      agencyName: fields.find((f) => f.fieldKey?.endsWith(".agency_name"))?.id,
    };

    console.log("Initialized FIELD_MAP:", FIELD_MAP);
  } catch (error) {
    console.error("Failed to initialize field map:", error);
  }
}

export function getFieldId(key: keyof FieldMap): string | undefined {
  return FIELD_MAP[key];
}

// Map GHL status to our status format
function mapStatus(ghlStatus: string): TicketStatus {
  const statusLower = (ghlStatus || "").toLowerCase().replace(/[_\s]/g, "");

  if (statusLower.includes("open")) return "Open";
  if (statusLower.includes("inprogress") || statusLower.includes("progress")) return "In Progress";
  if (statusLower.includes("pending") || statusLower.includes("customer")) return "Pending Customer";
  if (statusLower.includes("resolved") || statusLower.includes("closed")) return "Resolved";

  return "Open"; // Default fallback
}

// Fetch tickets with stitched data
export async function fetchTickets(): Promise<Ticket[]> {
  if (USE_MOCK_DATA) {
    return [];
  }

  try {
    const pipelineId = await getPipelineId();

    console.log(`Fetching opportunities from pipeline: ${pipelineId}`);
    const response = await ghlRequest<any>(`/pipelines/${pipelineId}/opportunities`);

    const opportunities = response.opportunities || response.data || [];
    if (!opportunities.length) {
      console.log("No opportunities found in pipeline response:", response);
      return [];
    }

    console.log(`Found ${opportunities.length} opportunities`);

    const ticketsPromises = opportunities.map(async (opp: any, index: number) => {
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
          description: opp.description || opp.notes,
          tags: opp.tags || [],
        } as Ticket;
      } catch (error) {
        console.error(`Failed to fetch contact for opportunity ${opp.id}:`, error);
        return {
          id: opp.id,
          name: opp.name || `TICKET-${opp.id.slice(0, 8)}`,
          contact: {
            id: opp.contactId,
            name: "Unknown Contact",
          },
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
      .filter((r): r is PromiseFulfilledResult<Ticket> => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Unable to fetch tickets: ${errorMessage}`);
    throw error;
  }
}

// Fetch users/owners
export interface GHLUser {
  id: string;
  name: string;
  email?: string;
}

export async function fetchUsers(): Promise<GHLUser[]> {
  if (USE_MOCK_DATA) return [];

  try {
    const response = await ghlRequest<any>("/users"); // ✅ no trailing slash
    return (response.users || response.data || []).map((user: any) => ({
      id: user.id,
      name: user.name || `${user.firstName} ${user.lastName}`,
      email: user.email,
    }));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
}
