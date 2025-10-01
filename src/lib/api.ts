// ... keep the imports

// Get Pipeline ID by finding "Ticketing System" pipeline
async function getPipelineId(): Promise<string> {
  if (PIPELINE_ID) return PIPELINE_ID;

  try {
    console.log("[api.ts] Fetching pipelines...");
    const response = await ghlRequest<{ pipelines: Array<{ id: string; name: string }> }>("/pipelines");
    console.log("[api.ts] Pipelines response:", response);

    if (!response.pipelines || response.pipelines.length === 0) {
      throw new Error("No pipelines found in your GHL account");
    }

    const ticketPipeline = response.pipelines.find(p => 
      p.name.toLowerCase().includes("ticketing system")
    );

    if (!ticketPipeline) {
      const availablePipelines = response.pipelines.map(p => p.name).join(", ");
      throw new Error(`Ticketing System pipeline not found. Available pipelines: ${availablePipelines}`);
    }

    PIPELINE_ID = ticketPipeline.id;
    console.log(`[api.ts] Found Ticketing System pipeline: ${ticketPipeline.name} (${PIPELINE_ID})`);
    return PIPELINE_ID;
  } catch (error) {
    console.error("[api.ts] Failed to fetch pipeline ID:", error);
    throw error;
  }
}

// Fetch tickets with stitched data
export async function fetchTickets(): Promise<Ticket[]> {
  console.log("[api.ts] Fetching tickets...");
  try {
    // Step 1: Get Pipeline ID
    const pipelineId = await getPipelineId();
    console.log("[api.ts] Using pipelineId:", pipelineId);

    // Step 2: Fetch opportunities from the pipeline
    const response = await ghlRequest<{ opportunities: any[] }>(`/pipelines/${pipelineId}/opportunities`);
    console.log("[api.ts] Opportunities response:", response);

    if (!response.opportunities || response.opportunities.length === 0) {
      console.warn("[api.ts] No opportunities found in pipeline");
      return [];
    }

    // Map to tickets
    const tickets = response.opportunities.map((opp: any) => ({
      id: opp.id,
      name: opp.name,
      status: opp.status,
      contactId: opp.contactId,
      createdAt: opp.dateAdded || new Date().toISOString(),
      updatedAt: opp.updatedAt || new Date().toISOString(),
    }));

    console.log(`[api.ts] Processed ${tickets.length} tickets`);
    return tickets as Ticket[];
  } catch (error) {
    console.error("[api.ts] Failed to fetch tickets:", error);
    throw error;
  }
}
