import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { fetchTickets } from "@/lib/api-fixed";
import { ArrowLeft, Bell, Menu, Plus } from "lucide-react";
import { toast } from "sonner";
import InboxSidebar from "@/components/intercom/InboxSidebar";
import IntercomChatView from "@/components/intercom/IntercomChatView";
import TicketDetailsSidebar from "@/components/intercom/TicketDetailsSidebar";

export default function IntercomChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const { data: tickets = [] } = useQuery({
  queryKey: ["tickets"],
  queryFn: fetchTickets,
  refetchInterval: 2000, // ✅ Auto-refresh every 2 seconds
  });

  // ✅ ADDED: Find the ticket that matches this conversation
  const currentTicket = tickets.find(
    (t) => t.intercomConversationId === conversationId
  );

  const handleCreateTicket = async () => {
    if (!conversationId) return;
    
    setIsCreatingTicket(true);
    try {
      toast.loading('Creating ticket...', { id: 'create-ticket' });
      
      const response = await fetch('/api/intercom/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      });

      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }

      const data = await response.json();
      
      toast.success(`Ticket #${data.ticketNumber} created!`, { id: 'create-ticket' });
      
      // Refresh tickets list and navigate to new ticket
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      
      // Small delay to let the query update
      setTimeout(() => {
        navigate(`/tickets/${data.ticketId}`);
      }, 500);
      
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error('Failed to create ticket', { id: 'create-ticket' });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Conversation Selected
          </h2>
          <Button onClick={() => navigate("/tickets")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Left Sidebar - Inbox */}
      {showLeftSidebar && (
        <InboxSidebar
          currentConversationId={conversationId}
          availableTicketConversationIds={tickets
            .filter(t => t.intercomConversationId)
            .map(t => t.intercomConversationId!)
          }
          onConversationSelect={(newConversationId) => {
            const targetTicket = tickets.find(
              (t) => t.intercomConversationId === newConversationId
            );
            if (targetTicket) {
              navigate(`/tickets/${targetTicket.id}`);
            } else {
              navigate(`/intercom-chat/${newConversationId}`);
            }
          }}
        />
      )}

      {/* Main Content - Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/tickets")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tickets
              </Button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
              <h1 className="font-semibold text-lg text-gray-900 dark:text-white">
                Intercom Conversation
              </h1>
              <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                No Ticket
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCreateTicket}
                disabled={isCreatingTicket}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Ticket
              </Button>
              <Button variant="ghost" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">

            <IntercomChatView
            conversationId={conversationId}
            ticketId={currentTicket?.id || ''}
            currentStageId={currentTicket?.pipelineStageId}
            priority={currentTicket?.priority}
            category={currentTicket?.category}
            intercomTicketOwner={currentTicket?.intercomAgent}
            description={currentTicket?.description}
            resolutionSummary={currentTicket?.resolutionSummary}
            contactName={currentTicket?.contact?.name || 'Unknown'}
            contactEmail={currentTicket?.contact?.email || ''}
          />
        </div>
      </div>

      {/* Right Sidebar - Details */}
      <TicketDetailsSidebar
        ticketId={currentTicket?.id || ''}
        conversationId={conversationId}
        opportunity={undefined}
        conversation={undefined}
        contact={undefined}
        messages={[]}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["tickets"] })}
      />
    </div>
  );
}