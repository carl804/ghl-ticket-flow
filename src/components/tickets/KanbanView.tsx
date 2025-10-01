import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket, TicketStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

/** If you have a TicketCard component, import it here.
 *  Otherwise, this inline fallback keeps the file self-contained.
 */
// import { TicketCard } from "./TicketCard";
function TicketCard({
  ticket,
  isDragging,
  onClick,
  dragHandleProps,
}: {
  ticket: Ticket;
  isDragging?: boolean;
  onClick?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: any;
}) {
  return (
    <div
      className={`rounded-md border bg-card p-3 shadow-sm transition-all hover:shadow ${
        isDragging ? "opacity-70 ring-2 ring-primary" : ""
      } cursor-pointer`}
      onClick={onClick}
      {...dragHandleProps}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium">{ticket.name}</div>
        <Badge variant="outline">{ticket.priority}</Badge>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{ticket.contact?.name || "—"}</div>
      <div className="mt-2 text-xs text-muted-foreground">{ticket.category}</div>
    </div>
  );
}

export interface KanbanViewProps {
  tickets: Ticket[];
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
  onTicketClick: (ticket: Ticket) => void;
}

const COLUMNS: TicketStatus[] = ["Open", "In Progress", "Pending Customer", "Resolved"];

function SortableTicketCard({
  ticket,
  onClick,
}: {
  ticket: Ticket;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TicketCard ticket={ticket} onClick={onClick} isDragging={isDragging} dragHandleProps={listeners} />
    </div>
  );
}

function KanbanColumn({
  status,
  tickets,
  onTicketClick,
  isOver,
}: {
  status: TicketStatus;
  tickets: Ticket[];
  onTicketClick: (t: Ticket) => void;
  isOver?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-lg transition-all duration-200 ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="rounded-t-lg bg-primary/10 px-4 py-3">
        <h3 className="font-semibold text-foreground">
          {status} <span className="text-muted-foreground">({tickets.length})</span>
        </h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/5 p-3">
        <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <SortableTicketCard key={ticket.id} ticket={ticket} onClick={() => onTicketClick(ticket)} />
          ))}
        </SortableContext>

        {tickets.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No tickets</div>
        )}
      </div>
    </div>
  );
}

/** Default export to satisfy `import KanbanView from ...` */
export default function KanbanView({
  tickets,
  onStatusChange,
  onTicketClick,
}: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCardId, setOverCardId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // group tickets by status once per render
  const byStatus = COLUMNS.reduce((acc, s) => {
    acc[s] = tickets.filter((t) => t.status === s);
    return acc;
  }, {} as Record<TicketStatus, Ticket[]>);

  const handleDragStart = (evt: DragStartEvent) => {
    setActiveId(evt.active.id as string);
  };

  const handleDragOver = (evt: DragOverEvent) => {
    setOverCardId((evt.over?.id as string) || null);
  };

  const handleDragEnd = (evt: DragEndEvent) => {
    const { active, over } = evt;
    setActiveId(null);
    setOverCardId(null);
    if (!over) return;

    const dragged = tickets.find((t) => t.id === active.id);
    if (!dragged) return;

    // Determine the column (status) we dropped into:
    const targetStatus = COLUMNS.find((status) =>
      byStatus[status].some((t) => t.id === over.id)
    );

    // If user dropped into an empty column area, detect via header match
    // (optional enhancement — for now we only change when dropped on a card)
    if (!targetStatus) return;

    if (dragged.status !== targetStatus) {
      onStatusChange(dragged.id, targetStatus);
    }
  };

  const activeTicket = tickets.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid h-[calc(100vh-280px)] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tickets={byStatus[status]}
            onTicketClick={onTicketClick}
            isOver={Boolean(overCardId && byStatus[status].some((t) => t.id === overCardId))}
          />
        ))}
      </div>

      <DragOverlay>{activeTicket ? <TicketCard ticket={activeTicket} /> : null}</DragOverlay>
    </DndContext>
  );
}
