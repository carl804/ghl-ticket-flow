// Only the Category part changed. Rest of your file stays same.

import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from "@/lib/types";

// Map backend values to display text
const CATEGORY_MAP: Record<TicketCategory, string> = {
  Billing: "BILLING",
  "Technical Support": "TECHNICAL SUPPORT",
  Onboarding: "ONBOARDING",
  "Sales Inquiry": "SALES INQUIRY",
  "Report an Outage": "REPORT AN OUTAGE",
  "General Questions": "GENERAL QUESTIONS",
  "Cancel Account": "CANCEL ACCOUNT",
  "Upgrade Plan": "UPGRADE PLAN",
};

const REVERSE_CATEGORY_MAP = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([k, v]) => [v, k as TicketCategory])
);

// inside JSX for Category:
<div className="flex-1 min-w-[150px]">
  <Label>Category</Label>
  <Select
    value={CATEGORY_MAP[editedTicket.category as TicketCategory] || ""}
    onValueChange={(value) =>
      setEditedTicket({
        ...editedTicket,
        category: REVERSE_CATEGORY_MAP[value] as TicketCategory,
      })
    }
  >
    <SelectTrigger className="mt-1 bg-popover">
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="bg-popover z-[100]">
      {Object.values(CATEGORY_MAP).map((label) => (
        <SelectItem key={label} value={label}>
          {label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
