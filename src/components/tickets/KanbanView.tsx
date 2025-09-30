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
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket, TicketStatus } from "@/lib/types";
import { TicketCard } from "./TicketCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface KanbanViewProps {
  tickets: Ticket[];
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
  onTicketClick: (ticket: Ticket) => void;
}

const COLUMNS: TicketStatus[] = ["Open", "In Progress", "Pending Customer", "Resolved"];

function SortableTicketCard({ 
  ticket, 
  onClick 
}: { 
  ticket: Ticket; 
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

function KanbanColumn({ 
  status, 
  tickets, 
  onTicketClick,
  isOver 
}: { 
  status: TicketStatus; 
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  isOver?: boolean;
}) {
  const statusColors: Record<TicketStatus, string> = {
    Open: "bg-status-open/10 text-status-open",
    "In Progress": "bg-status-in-progress/10 text-status-in-progress",
    "Pending Customer": "bg-status-pending/10 text-status-pending",
    Resolved: "bg-status-resolved/10 text-status-resolved",
  };

  return (
    <Card className={`flex flex-col h-full transition-all duration-200 ${
      isOver ? "ring-2 ring-primary shadow-lg" : ""
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{status}</CardTitle>
          <Badge variant="secondary" className={statusColors[status]}>
            {tickets.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2 pb-4">
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <SortableTicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onTicketClick(ticket)}
            />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tickets
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KanbanView({ tickets, onStatusChange, onTicketClick }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const ticketsByStatus = COLUMNS.reduce((acc, status) => {
    acc[status] = tickets.filter((t) => t.status === status);
    return acc;
  }, {} as Record<TicketStatus, Ticket[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    setOverId(over?.id || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const activeTicket = tickets.find((t) => t.id === active.id);
    if (!activeTicket) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    // Check if we're dropping over a column (status)
    const overStatus = COLUMNS.find(status => 
      ticketsByStatus[status].some(t => t.id === over.id)
    );

    if (overStatus && activeTicket.status !== overStatus) {
      onStatusChange(activeTicket.id, overStatus);
    }

    setActiveId(null);
    setOverId(null);
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-[calc(100vh-280px)]">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tickets={ticketsByStatus[status]}
            onTicketClick={onTicketClick}
            isOver={overId !== null && ticketsByStatus[status].some(t => t.id === overId)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTicket && <TicketCard ticket={activeTicket} />}
      </DragOverlay>
    </DndContext>
  );
}
