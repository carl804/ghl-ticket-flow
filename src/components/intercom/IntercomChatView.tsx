import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Send, 
  Paperclip, 
  Clock, 
  X as CloseIcon, 
  MessageSquare,
  User,
  Bot,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const AGENT_LIST = [
  { name: 'Aneela', fullName: 'Aneela Karim', intercomId: '6465865' },
  { name: 'Carl', fullName: 'Carl James Salamida', intercomId: '9123839' },
  { name: 'Chloe', fullName: 'Chloe Helton', intercomId: '4310906' },
  { name: 'Christian', fullName: 'Christian Falcon', intercomId: '8815155' },
  { name: 'Jonathan', fullName: 'Jonathan Vicenta', intercomId: '5326930' },
  { name: 'Joyce', fullName: 'Joyce Vicenta', intercomId: '7023191' },
  { name: 'Mark', fullName: 'Mark Helton', intercomId: '1755792' },
];

// Snooze options helper
function getSnoozeOptions() {
  const now = new Date();
  const laterToday = new Date(now);
  laterToday.setHours(now.getHours() + 4);
  
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);
  
  const oneWeek = new Date(now);
  oneWeek.setDate(now.getDate() + 7);
  
  const oneMonth = new Date(now);
  oneMonth.setMonth(now.getMonth() + 1);
  
  return [
    { label: 'Later today', hours: 4 },
    { label: 'Tomorrow', hours: Math.round((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60)) },
    { label: 'Monday', hours: Math.round((nextMonday.getTime() - now.getTime()) / (1000 * 60 * 60)), hide: now.getDay() === 1 },
    { label: 'One week', hours: 168 },
    { label: 'One month', hours: 720 },
  ].filter(opt => !opt.hide);
}

interface IntercomChatViewProps {
  conversationId: string;
  ticketId: string;
  currentAssignee?: string;
  onClose?: () => void;
  onAssignmentChange?: (assignee: string) => void;
}

interface StoredAgent {
  name: string;
  fullName: string;
  intercomId: string;
}

export default function IntercomChatView({ 
  conversationId, 
  ticketId,
  currentAssignee,
  onClose,
  onAssignmentChange 
}: IntercomChatViewProps) {
  const [message, setMessage] = useState('');
  const [isNote, setIsNote] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<StoredAgent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Load stored agent from localStorage
  useEffect(() => {
    const storedAgent = localStorage.getItem('intercomAgent');
    if (storedAgent) {
      try {
        const agent = JSON.parse(storedAgent);
        setSelectedAgent(agent);
        console.log('✅ Loaded agent from storage:', agent.name);
      } catch (e) {
        console.error('Failed to parse stored agent:', e);
      }
    } else {
      // Show agent selector on first use
      setShowAgentSelector(true);
    }
  }, []);

  // Check if ticket is assigned
  const isAssigned = currentAssignee && currentAssignee !== 'Unassigned' && currentAssignee.trim() !== '';

  // Fetch conversation
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['intercom-conversation', conversationId],
    queryFn: async () => {
      const response = await fetch(`/api/intercom/conversation?conversationId=${conversationId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch conversation');
      }
      const data = await response.json();
      return data.conversation;
    },
    refetchInterval: 10000, // Poll every 10 seconds
    retry: 3,
  });

  // Assign to me mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgent) {
        throw new Error('No agent selected');
      }

      // Assign in Intercom
      const intercomResponse = await fetch('/api/intercom/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'assign',
          agentName: selectedAgent.name,
          intercomAdminId: selectedAgent.intercomId,
        }),
      });

      if (!intercomResponse.ok) {
        throw new Error('Failed to assign in Intercom');
      }

      // Add audit log note
      await fetch('/api/intercom/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: `Assigned to ${selectedAgent.name}`,
          isNote: true,
          agentName: selectedAgent.name,
          intercomAdminId: selectedAgent.intercomId,
        }),
      }).catch(err => console.error('Failed to add audit log:', err));

      // Also update in GHL if callback provided
      if (onAssignmentChange) {
        onAssignmentChange(selectedAgent.name);
      }

      return intercomResponse.json();
    },
    onSuccess: () => {
      toast.success(`Assigned to ${selectedAgent?.name}`);
      queryClient.invalidateQueries({ queryKey: ['intercom-conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign ticket');
    },
  });

  // Send reply mutation
  const replyMutation = useMutation({
    mutationFn: async (messageData: { message: string; isNote: boolean }) => {
      if (!selectedAgent) {
        throw new Error('No agent selected');
      }

      const response = await fetch('/api/intercom/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: messageData.message,
          isNote: messageData.isNote,
          agentName: selectedAgent.name,
          intercomAdminId: selectedAgent.intercomId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage('');
      setIsNote(false);
      toast.success(isNote ? 'Note added' : 'Reply sent');
      queryClient.invalidateQueries({ queryKey: ['intercom-conversation', conversationId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });

  // Close conversation mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgent) {
        throw new Error('No agent selected');
      }

      const response = await fetch('/api/intercom/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'close',
          agentName: selectedAgent.name,
          intercomAdminId: selectedAgent.intercomId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to close conversation');
      }

      // Add audit log note
      await fetch('/api/intercom/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: `Conversation closed by ${selectedAgent.name}`,
          isNote: true,
          agentName: selectedAgent.name,
          intercomAdminId: selectedAgent.intercomId,
        }),
      }).catch(err => console.error('Failed to add audit log:', err));

      return response.json();
    },
    onSuccess: () => {
      toast.success('Conversation closed');
      queryClient.invalidateQueries({ queryKey: ['intercom-conversation', conversationId] });
      if (onClose) onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to close conversation');
    },
  });

  // Snooze conversation mutation
  const snoozeMutation = useMutation({
    mutationFn: async ({ hours, label }: { hours: number; label: string }) => {
      if (!selectedAgent) {
        throw new Error('No agent selected');
      }

      const snoozedUntil = Math.floor(Date.now() / 1000) + (hours * 3600);
      const response = await fetch('/api/intercom/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'snooze',
          agentName: selectedAgent.name,
          intercomAdminId: selectedAgent.intercomId,
          snoozedUntil,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to snooze conversation');
      }

      // Add audit log note
      await fetch('/api/intercom/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: `Snoozed for ${label} by ${selectedAgent.name}`,
          isNote: true,
          agentName: selectedAgent.name,
          intercomAdminId: selectedAgent.intercomId,
        }),
      }).catch(err => console.error('Failed to add audit log:', err));

      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Snoozed for ${variables.label}`);
      queryClient.invalidateQueries({ queryKey: ['intercom-conversation', conversationId] });
      setShowSnoozeDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to snooze conversation');
    },
  });

  const handleSaveAgent = (agent: StoredAgent) => {
    localStorage.setItem('intercomAgent', JSON.stringify(agent));
    setSelectedAgent(agent);
    setShowAgentSelector(false);
    toast.success(`Logged in as ${agent.name}`);
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    if (!selectedAgent) {
      toast.error('Please select an agent first');
      return;
    }
    if (!isNote && !isAssigned) {
      toast.error('Please assign the ticket first to reply to customers');
      return;
    }
    replyMutation.mutate({ message, isNote });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Conversation not found</p>
      </div>
    );
  }

  const conversationParts = conversation.conversation_parts?.conversation_parts || [];
  const allMessages = [
    {
      type: 'message',
      author: conversation.source.author,
      body: conversation.source.body,
      created_at: conversation.created_at,
    },
    ...conversationParts.map((part: any) => ({
      type: part.part_type,
      author: part.author,
      body: part.body,
      created_at: part.created_at,
      attachments: part.attachments,
    })),
  ];

  const snoozeOptions = getSnoozeOptions();

  return (
    <>
      {/* Agent Selector Dialog */}
      <Dialog open={showAgentSelector} onOpenChange={setShowAgentSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who are you?</DialogTitle>
            <DialogDescription>
              Select your name to identify yourself when replying to customers in Intercom.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {AGENT_LIST.map((agent) => (
              <Button
                key={agent.intercomId}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleSaveAgent(agent)}
              >
                <User className="h-4 w-4 mr-2" />
                {agent.fullName}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Snooze Options Dialog */}
      <Dialog open={showSnoozeDialog} onOpenChange={setShowSnoozeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snooze conversation</DialogTitle>
            <DialogDescription>
              Choose when to be reminded about this conversation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {snoozeOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                className="w-full justify-start"
                onClick={() => snoozeMutation.mutate({ hours: option.hours, label: option.label })}
                disabled={snoozeMutation.isPending}
              >
                <Clock className="h-4 w-4 mr-2" />
                {option.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {conversation.source.author.name || 'Customer'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {conversation.source.author.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedAgent && (
                <Badge variant="secondary" className="gap-1">
                  <User className="h-3 w-3" />
                  {selectedAgent.name}
                </Badge>
              )}
              <Badge variant={conversation.state === 'closed' ? 'secondary' : 'default'}>
                {conversation.state}
              </Badge>
            </div>
          </div>

          {/* Assignment Warning */}
          {!isAssigned && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>This ticket is unassigned. Assign it to yourself to reply to customers.</span>
                <Button
                  size="sm"
                  onClick={() => assignMutation.mutate()}
                  disabled={assignMutation.isPending || !selectedAgent}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to Me
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {isAssigned && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending || conversation.state === 'closed'}
                className="flex-1"
              >
                <CloseIcon className="h-4 w-4 mr-2" />
                Close
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSnoozeDialog(true)}
                disabled={snoozeMutation.isPending}
                className="flex-1"
              >
                <Clock className="h-4 w-4 mr-2" />
                Snooze
              </Button>
            </div>
          )}
        </div>

        {/* Messages - Apple Messages Style */}
        <div className="flex-1 overflow-y-auto p-6 space-y-1 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
          {allMessages.map((msg, index) => {
            const isCustomer = msg.author.type === 'user' || msg.author.type === 'lead';
            const isNote = msg.type === 'note';
            const messageBody = msg.body || '';
            
            // Skip rendering if completely empty
            if (!messageBody.trim() && (!msg.attachments || msg.attachments.length === 0)) {
              return null;
            }

            // Check if this message is from the same author as the previous one
            const prevMsg = index > 0 ? allMessages[index - 1] : null;
            const isSameAuthor = prevMsg && prevMsg.author.id === msg.author.id && prevMsg.type === msg.type;
            const isFirstInGroup = !isSameAuthor;
            
            // Get initials for avatar
            const authorName = msg.author.name || 'Unknown';
            const initials = authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            
            return (
              <div
                key={index}
                className={`flex gap-2 ${isCustomer ? 'justify-start' : 'justify-end'} ${
                  isFirstInGroup ? 'mt-4' : 'mt-0.5'
                }`}
              >
                {/* Avatar - only show for first message in group */}
                {isCustomer && isFirstInGroup && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                    {initials}
                  </div>
                )}
                {isCustomer && !isFirstInGroup && (
                  <div className="w-7" /> 
                )}

                <div className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'} max-w-[75%]`}>
                  {/* Author name and timestamp - only for first message in group */}
                  {isFirstInGroup && (
                    <div className={`flex items-center gap-2 mb-1 px-1 ${isCustomer ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {authorName}
                      </span>
                      {isNote && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-gray-300 text-gray-600">
                          Note
                        </Badge>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(msg.created_at * 1000), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`
                      px-4 py-2.5 rounded-2xl shadow-sm
                      ${isCustomer 
                        ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm' 
                        : isNote
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border border-yellow-200/50 dark:border-yellow-700/50 rounded-tr-sm'
                        : 'bg-blue-500 text-white rounded-tr-sm'
                      }
                      ${!isFirstInGroup && isCustomer ? 'rounded-tl-2xl' : ''}
                      ${!isFirstInGroup && !isCustomer ? 'rounded-tr-2xl' : ''}
                    `}
                  >
                    {messageBody && (
                      <div
                        className={`text-[15px] leading-relaxed ${isCustomer ? 'prose-gray' : isNote ? 'prose-yellow' : 'prose-white'} prose prose-sm max-w-none [&>p]:my-0 [&>p]:leading-relaxed`}
                        dangerouslySetInnerHTML={{ __html: messageBody }}
                      />
                    )}

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`${messageBody ? 'mt-2' : ''} space-y-1.5`}>
                        {msg.attachments.map((att: any, i: number) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${
                              isCustomer 
                                ? 'bg-gray-300/50 hover:bg-gray-300 dark:bg-gray-700/50 dark:hover:bg-gray-700' 
                                : 'bg-white/20 hover:bg-white/30'
                            }`}
                          >
                            <Paperclip className="h-3 w-3" />
                            <span className="truncate">{att.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar for agent - only show for first message in group */}
                {!isCustomer && isFirstInGroup && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                    {initials}
                  </div>
                )}
                {!isCustomer && !isFirstInGroup && (
                  <div className="w-7" />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box - Always show if agent is selected */}
        {selectedAgent && (
          <div className="p-4 border-t space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant={isNote ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsNote(!isNote)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isNote ? 'Internal Note' : 'Reply to Customer'}
              </Button>
              
              {!isAssigned && !isNote && (
                <p className="text-xs text-muted-foreground">
                  You can add internal notes. Assign the ticket to reply to customers.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isNote ? 'Add internal note...' : isAssigned ? 'Type your reply...' : 'Assign ticket to reply to customers'}
                rows={3}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || replyMutation.isPending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}