// Path: src/lib/api.ts
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ---- Types (keep minimal; align with your existing ./types if present) ----
export type TicketStatus = "Open" | "In Progress" | "Pending Customer" | "Resolved";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketCategory = "Billing" | "Tech" | "Sales" | "Onboarding" | "Outage" | "General";

export interface Contact {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface Ticket {
  id: string;
  name: string;
  contact: Contact;
  contactId?: string;
  agencyName?: string;
  status: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  resolutionSummary?: string;
  assignedTo?: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
  value?: number;
  dueDate?: string;
  description?: string;
  tags?: string[];
}

export interface Stats {
  total: number;
  open: number;
  pendingCustomer: number;
  resolvedToday: number;
  avgResolutionTime: string;
}

// ---- Env / config ----
export const USE_MOCK_DATA = false; // force live
const LOCATION_ID = import.meta.env.VITE_GHL_LOCATION_ID as string | undefined;
const PIPELINE_ID_ENV = import.meta.env.VITE_GHL_PIPELINE_ID as string | undefined;
const PIPELINE_NAME_ENV = (import.meta.env.VITE_GHL_PIPELINE_NAME as string | undefined) || "Ticketing System";

// Custom field keys we care about (as shown in your UI screenshots)
const CF_KEYS = {
  priority: "opportunity.priority",
  category: "opportunity.category",
  resolutionSummary: "opportunity.resolution_summary",
  agencyName: "opportunity.agency_name",
  ticketOwner: "opportunity.ticket_owner",
} as const;

type FieldMap = Partial<Record<keyof typeof CF_KEYS, string>>;
let FIELD_MAP: FieldMap = {};
let PIPELINE_ID: string | null = PIPELINE_ID_ENV ?? null;

// ---- Proxy to the edge function ----
async function ghlRequest<T>(endpoint: string, opts?: {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  queryParams?: Record<string, string | number | boolean>;
}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("ghl-proxy", {
    body: { endpoint, method: opts?.method || "GET", body: opts?.body, queryParams: toStringParams(opts?.queryParams) }
  });

  if (error) throw new Error(`GHL API Error: ${error.message}`);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

function toStringParams(obj?: Record<string, string | number | boolean>) {
  if (!obj) return undefined;
  const out: Record<string, string> = {};
  Object.entries(obj).forEach(([k, v]) => (out[k] = String(v)));
  return out;
}

// ---- Pipelines ----
async function getPipelineId(): Promise<string> {
  if (PIPELINE_ID) return PIPELINE_ID;
  if (!LOCATION_ID) throw new Error("Missing VITE_GHL_LOCATION_ID");

  // /opportunities/pipelines (v2)
  const res = await ghlRequest<{ pipelines: Array<{ id: string; name: string }> }>(
    "/opportunities/pipelines",
    { queryParams: { location_id: LOCATION_ID } }
  );

  const byExact = res.pipelines.find(p => p.name.trim().toLowerCase() === PIPELINE_NAME_ENV.trim().toLowerCase());
  const byContains = res.pipelines.find(p => p.name.toLowerCase().includes("ticketing system"));

  const found = byExact || byContains || res.pipelines[0];
  if (!found) throw new Error("No pipelines found for this location");
  PIPELINE_ID = found.id;
  return PIPELINE_ID;
}

// ---- Custom Fields ----
async function initializeFieldMap(): Promise<void> {
  if (!LOCATION_ID) throw new Error("Missing VITE_GHL_LOCATION_ID");

  const res = await ghlRequest<{ customFields: Array<{ id: string; key?: string; fieldKey?: string; name: string; type: string }> }>(
    `/locations/${LOCATION_ID}/customFields`
  );

  const pick = (key: string) =>
    res.customFields.find(f => f.key === key || f.fieldKey === key)?.id;

  FIELD_MAP = {
    priority: pick(CF_KEYS.priority),
    category: pick(CF_KEYS.category),
    resolutionSummary: pick(CF_KEYS.resolutionSummary),
    agencyName: pick(CF_KEYS.agencyName),
    ticketOwner: pick(CF_KEYS.ticketOwner),
  };
}

// ---- Helpers ----
function mapStatus(raw: string | undefined, stageName?: string): TicketStatus {
  const s = (raw || stageName || "").toLowerCase();
  if (s.includes("pending")) return "Pending Customer";
  if (s.includes("progress")) return "In Progress";
  if (s.includes("resolved") || s.includes("closed") || s.includes("done")) return "Resolved";
  return "Open";
}

function cfValue(arr: any[] | undefined, id?: string) {
  if (!arr || !id) return undefined;
  const hit = arr.find((f: any) => f?.id === id);
  return hit?.value ?? hit?.field_value ?? hit?.fieldValue;
}

// ---- Fetch Tickets (Opportunities + Contacts + CFs) ----
export async function fetchTickets(): Promise<Ticket[]> {
  if (USE_MOCK_DATA) return [];

  if (!LOCATION_ID) throw new Error("Missing VITE_GHL_LOCATION_ID");
  // Ensure pipeline + fields are ready
  const [pipelineId] = await Promise.all([getPipelineId(), initializeFieldMap()]);

  // pull all pages from /opportunities/search
  let urlParams: Record<string, string | number | boolean> = {
    location_id: LOCATION_ID,
    pipeline_id: pipelineId,
    limit: 50,
    q: "",
  };

  const allOpps: any[] = [];
  // first page
  let page = await ghlRequest<{ opportunities: any[]; nextPageUrl?: string }>(
    "/opportunities/search",
    { queryParams: urlParams }
  );
  allOpps.push(...(page.opportunities || []));

  // follow pagination if present
  while (page.nextPageUrl) {
    const next = new URL(page.nextPageUrl);
    const qp: Record<string, string> = {};
    next.searchParams.forEach((v, k) => (qp[k] = v));
    page = await ghlRequest<{ opportunities: any[]; nextPageUrl?: string }>(
      "/opportunities/search",
      { queryParams: qp }
    );
    allOpps.push(...(page.opportunities || []));
  }

  if (allOpps.length === 0) return [];

  // Enrich with contacts (best-effort)
  const tickets = await Promise.all(
    allOpps.map(async (opp, idx) => {
      // Gentle staggering
      if (idx) await new Promise(r => setTimeout(r, Math.min(idx * 20, 200)));

      let contact: any = {};
      try {
        if (opp.contactId) {
          contact = await ghlRequest<any>(`/contacts/${opp.contactId}`, { queryParams: { location_id: LOCATION_ID } });
        }
      } catch {
        // ignore contact errors; we'll still return a ticket
      }

      const customFieldArray = opp.customField || opp.customFields || [];

      const ticket: Ticket = {
        id: opp.id,
        name: opp.name || `TICKET-${String(opp.id).slice(0, 6)}`,
        contact: {
          id: contact?.contact?.id || contact?.id || opp.contactId,
          name:
            contact?.contact?.name ||
            contact?.name ||
            [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
            undefined,
          email: contact?.contact?.email || contact?.email,
          phone: contact?.contact?.phone || contact?.phone,
        },
        contactId: opp.contactId,
        agencyName: cfValue(customFieldArray, FIELD_MAP.agencyName),
        status: mapStatus(opp.status, opp.stageName),
        priority: cfValue(customFieldArray, FIELD_MAP.priority),
        category: (cfValue(customFieldArray, FIELD_MAP.category) as TicketCategory) || "General",
        resolutionSummary: cfValue(customFieldArray, FIELD_MAP.resolutionSummary),
        assignedTo: opp.assignedTo,
        assignedToUserId: opp.assignedToUserId || opp.userId,
        createdAt: opp.createdAt || opp.dateAdded || new Date().toISOString(),
        updatedAt: opp.updatedAt || opp.lastStatusChangeAt || new Date().toISOString(),
        value: opp.monetaryValue ?? opp.value ?? 0,
        dueDate: opp.dueDate,
        description: opp.description || opp.notes,
        tags: opp.tags || [],
      };

      return ticket;
    })
  );

  return tickets;
}

// ---- Stats (derived) ----
export async function fetchStats(): Promise<Stats> {
  const t = await fetchTickets();
  const total = t.length;
  const open = t.filter(x => x.status === "Open").length;
  const pendingCustomer = t.filter(x => x.status === "Pending Customer").length;

  const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
  const resolvedToday = t.filter(x => x.status === "Resolved" && new Date(x.updatedAt) >= startOfDay).length;

  // crude avg resolution
  const resolved = t.filter(x => x.status === "Resolved");
  const avgMs = resolved.reduce((acc, x) => {
    const a = new Date(x.createdAt).getTime();
    const b = new Date(x.updatedAt).getTime();
    return acc + Math.max(b - a, 0);
  }, 0) / Math.max(resolved.length, 1);

  const hours = Math.round(avgMs / 36e5);
  const avgResolutionTime = hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
  return { total, open, pendingCustomer, resolvedToday, avgResolutionTime };
}

// ---- Mutations ----
export async function updateTicketStatus(ticketId: string, newStageOrStatus: string): Promise<void> {
  // If you intend to move between pipeline STAGES, you can send stage id inside PUT /opportunities/:id
  // If you intend to flip to Won/Lost/Abandoned, use the status endpoint below.
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PUT", body: { status: newStageOrStatus } });
}

export async function setOpportunityStatus(ticketId: string, status: "open" | "won" | "lost" | "abandoned"): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}/status`, { method: "PUT", body: { status } });
}

export async function updateResolutionSummary(ticketId: string, summary: string): Promise<void> {
  const id = FIELD_MAP.resolutionSummary;
  if (!id) throw new Error("Resolution Summary custom field not found");
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PUT", body: { customField: [{ id, value: summary }] } });
}

export async function updatePriority(ticketId: string, priority: TicketPriority): Promise<void> {
  const id = FIELD_MAP.priority;
  if (!id) throw new Error("Priority custom field not found");
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PUT", body: { customField: [{ id, value: priority }] } });
}

export async function updateCategory(ticketId: string, category: TicketCategory): Promise<void> {
  const id = FIELD_MAP.category;
  if (!id) throw new Error("Category custom field not found");
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PUT", body: { customField: [{ id, value: category }] } });
}

export async function updateOwner(ticketId: string, userId: string): Promise<void> {
  await ghlRequest(`/opportunities/${ticketId}`, { method: "PUT", body: { assignedToUserId: userId } });
}

export async function updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  const body: any = {};
  const cf: Array<{ id: string; value: any }> = [];

  if (updates.description !== undefined) body.description = updates.description;
  if (updates.value !== undefined) body.value = updates.value;
  if (updates.dueDate !== undefined) body.dueDate = updates.dueDate;
  if (updates.assignedToUserId) body.assignedToUserId = updates.assignedToUserId;
  if (updates.status) body.status = updates.status;

  if (updates.priority && FIELD_MAP.priority) cf.push({ id: FIELD_MAP.priority, value: updates.priority });
  if (updates.category && FIELD_MAP.category) cf.push({ id: FIELD_MAP.category, value: updates.category });
  if (updates.resolutionSummary !== undefined && FIELD_MAP.resolutionSummary) {
    cf.push({ id: FIELD_MAP.resolutionSummary, value: updates.resolutionSummary });
  }
  if (updates.agencyName && FIELD_MAP.agencyName) cf.push({ id: FIELD_MAP.agencyName, value: updates.agencyName });

  if (cf.length) body.customField = cf;

  await ghlRequest(`/opportunities/${ticketId}`, { method: "PUT", body });
}

// Bulk helpers
export async function bulkUpdateStatus(ids: string[], status: TicketStatus): Promise<void> {
  await Promise.all(ids.map(id => updateTicketStatus(id, status)));
}
export async function bulkUpdatePriority(ids: string[], priority: TicketPriority): Promise<void> {
  await Promise.all(ids.map(id => updatePriority(id, priority)));
}

// ---- Users (assignees) ----
export interface GHLUser { id: string; name: string; email?: string }
export async function fetchUsers(): Promise<GHLUser[]> {
  if (!LOCATION_ID) return [];
  try {
    const res = await ghlRequest<{ users: Array<{ id: string; name?: string; firstName?: string; lastName?: string; email?: string }> }>(
      "/users/",
      { queryParams: { locationId: LOCATION_ID } }
    );
    return (res as any).users?.map((u: any) => ({
      id: u.id,
      name: u.name || [u.firstName, u.lastName].filter(Boolean).join(" "),
      email: u.email,
    })) || [];
  } catch (e) {
    console.error("fetchUsers failed:", e);
    return [];
  }
}
