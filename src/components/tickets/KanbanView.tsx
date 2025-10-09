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
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket, TicketStatus } from "@/lib/types";
import { TicketCard } from "./TicketCard";

interface KanbanViewProps {
  tickets: Ticket[];
  onStatusChange: (ticketId: string, newStatus: TicketStatus) => void;
  onTicketClick: (ticket: Ticket) => void;
}

const COLUMNS: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed", "Deleted"];

function SortableTicketCard({ 
  ticket, 
  onClick 
}: { 
  ticket: Ticket; 
  onClick: () => void;
}) {
  const { setNodeRef, transform, transition, isDragging, listeners, attributes } = useSortable({ 
    id: ticket.id 
  });

  const [isDraggingState, setIsDraggingState] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger onClick if we didn't drag
    if (!isDraggingState) {
      onClick();
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      onMouseDown={() => setIsDraggingState(false)}
      onMouseMove={() => setIsDraggingState(true)}
      onClick={handleClick}
    >
      <TicketCard 
        ticket={ticket} 
        isDragging={isDragging}
      />
    </div>
  );
}

function DroppableColumn({ 
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
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col h-full transition-all duration-200 rounded-lg flex-shrink-0 ${
        isOver ? "ring-2 ring-primary bg-primary/5" : ""
      }`}
      style={{ width: '320px' }}
    >
      <div className="bg-primary/10 px-4 py-3 rounded-t-lg flex-shrink-0">
        <h3 className="font-semibold text-foreground">{status} ({tickets.length})</h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-muted/5 rounded-b-lg min-h-[200px]">
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
          <div className="text-center py-12 text-muted-foreground text-sm">
            No tickets
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanView({ tickets, onStatusChange, onTicketClick }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const ticketsByStatus = COLUMNS.reduce((acc, status) => {
    acc[status] = tickets.filter((t) => t.status === status);
    return acc;
  }, {} as Record<TicketStatus, Ticket[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeTicket = tickets.find((t) => t.id === active.id);
    if (!activeTicket) return;

    const targetStatus = COLUMNS.find(col => col === over.id);
    
    if (targetStatus && activeTicket.status !== targetStatus) {
      onStatusChange(activeTicket.id, targetStatus);
      return;
    }

    const targetTicket = tickets.find((t) => t.id === over.id);
    if (targetTicket && activeTicket.status !== targetTicket.status) {
      onStatusChange(activeTicket.id, targetTicket.status);
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
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-320px)]">
        {COLUMNS.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            tickets={ticketsByStatus[status]}
            onTicketClick={onTicketClick}
            isOver={overId === status}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTicket && (
          <div style={{ width: '320px' }}>
            <TicketCard ticket={activeTicket} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanView;