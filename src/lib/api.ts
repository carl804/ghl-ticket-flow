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
  console.log("[api.ts] Fetching tickets...");
  try {
    const pipelineId = await getPipelineId();
    const response = await ghlRequest<{ opportunities: any[] }>(
      `/pipelines/${pipelineId}/opportunities`
    );

    if (!response.opportunities || response.opportunities.length === 0) {
      console.warn("[api.ts] No opportunities found");
      return [];
    }

    const tickets = response.opportunities.map((opp: any) => {
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
