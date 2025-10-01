import type { Ticket, Stats, FieldMap, CustomField, TicketStatus, TicketPriority, TicketCategory } from "./types";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const USE_MOCK_DATA = false;
const GHL_LOCATION_ID = import.meta.env.VITE_GHL_LOCATION_ID;

let FIELD_MAP: FieldMap = {};
let PIPELINE_ID: string | null = null;

// Proxy request through Supabase Edge Function
async function ghlRequest<T>(endpoint: string, options?: { method?: string; body?: any; queryParams?: Record<string, string> }): Promise<T> {
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

// 🔹 Pipeline
async function getPipelineId(): Promise<string> {
  if (PIPELINE_ID) return PIPELINE_ID;

  const response = await ghlRequest<{ pipelines: Array<{ id: string; name: string }> }>("/pipelines");

  const ticketPipeline = response.pipelines.find(p =>
    p.name.toLowerCase().includes("ticketing system")
  );

  if (!ticketPipeline) {
    const available = response.pipelines.map(p => p.name).join(", ");
    throw new Error(`Ticketing System pipeline not found. Available pipelines: ${available}`);
  }

  PIPELINE_ID = ticketPipeline.id;
  return PIPELINE_ID;
}

// 🔹 Custom Field Map
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

// 🔹 Status mapping
function mapStatus(ghlStatus: string): TicketStatus {
  const status = ghlStatus.toLowerCase().replace(/[_\s]/g, "");
  if (status.includes("open")) return "Open";
  if (status.includes("inprogress") || status.includes("progress")) return "In Progress";
  if (status.includes("pending")) return "Pending Customer";
  if (status.includes("resolved") || status.includes("closed")) return "Resolved";
  return "Open";
}

// 🔹 Tickets
export async function fetchTickets(): Promise<Ticket[]> {
  const pipelineId = await getPipelineId();
  const response = await ghlRequest<{ opportunities: any[] }>(`/pipelines/${pipelineId}/opportunities`);

  if (!response.opportunities) return [];

  const tickets = await Promise.all(response.opportunities.map(async (opp: any) => {
    try {
      const contact = await ghlRequest<any>(`/contacts/${opp.contactId}`);
      const cf = opp.customField || [];
      const getCF = (key: string) => cf.find((f: any) => f.id === FIELD_MAP[key as keyof FieldMap])?.value;

      return {
        id: opp.id,
        name: opp.name,
        contact: {
          id: contact.id,
          name: contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
          email: contact.email,
          phone: contact.phone,
        },
        agencyName: getCF("agencyName"),
        status: mapStatus(opp.status || "open"),
        priority: (getCF("priority") || "Medium") as TicketPriority,
        category: (getCF("category") || "Tech") as TicketCategory,
        resolutionSummary: getCF("resolutionSummary"),
        assignedTo: opp.assignedTo,
        assignedToUserId: opp.assignedToUserId,
        contactId: opp.contactId,
        createdAt: opp.dateAdded || new Date().toISOString(),
        updatedAt: opp.updatedAt || new Date().toISOString(),
        value: opp.value || 0,
        description: opp.description,
        tags: opp.tags || [],
      };
    } catch (err) {
      return {
        id: opp.id,
        name: opp.name,
        contact: { id: opp.contactId },
        status: "Open",
        priority: "Medium",
        category: "Tech",
        createdAt: opp.dateAdded || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }));

  return tickets;
}

// 🔹 Stats
export async function fetchStats(): Promise<Stats> {
  const tickets = await fetchTickets();

  const total = tickets.length;
  const open = tickets.filter(t => t.status === "Open").length;
  const pendingCustomer = tickets.filter(t => t.status === "Pending Customer").length;
  const resolvedToday = tickets.filter(t =>
    t.status === "Resolved" && new Date(t.updatedAt) >= new Date(new Date().setHours(0,0,0,0))
  ).length;

  return {
    total,
    open,
    pendingCustomer,
    pending: pendingCustomer,
    resolvedToday,
    avgResolutionTime: "0h",
    totalTrend: 0,
    openTrend: 0,
    pendingTrend: 0,
    resolvedTodayTrend: 0,
  };
}

export { USE_MOCK_DATA };
