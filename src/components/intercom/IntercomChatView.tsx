import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { format, formatDistanceToNow } from 'date-fns';
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
  const [snoozeDuration, setSnoozeDuration] = useState('24');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
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
  const canReply = isAssigned && selectedAgent;

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
    mutationFn: async (hours: number) => {
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
      return response.json();
    },
    onSuccess: () => {
      toast.success(`Conversation snoozed for ${snoozeDuration}h`);
      queryClient.invalidateQueries({ queryKey: ['intercom-conversation', conversationId] });
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
    if (!canReply) {
      toast.error('Please assign the ticket first');
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
                <span>This ticket is unassigned. Assign it to yourself to reply.</span>
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
              
              <div className="flex gap-2 flex-1">
                <Select value={snoozeDuration} onValueChange={setSnoozeDuration}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => snoozeMutation.mutate(parseInt(snoozeDuration))}
                  disabled={snoozeMutation.isPending}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Snooze
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {allMessages.map((msg, index) => {
            const isCustomer = msg.author.type === 'user' || msg.author.type === 'lead';
            const isNote = msg.type === 'note';
            
            return (
              <div
                key={index}
                className={`flex gap-3 ${isCustomer ? '' : 'flex-row-reverse'} ${
                  isNote ? 'opacity-70' : ''
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {isCustomer ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>

                <div className={`flex-1 max-w-[70%] ${isCustomer ? '' : 'items-end'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {msg.author.name || 'Unknown'}
                    </span>
                    {isNote && (
                      <Badge variant="secondary" className="text-xs">
                        Internal Note
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at * 1000), { addSuffix: true })}
                    </span>
                  </div>

                  <div
                    className={`rounded-lg p-3 ${
                      isCustomer
                        ? 'bg-muted'
                        : isNote
                        ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <div
                      className="text-sm whitespace-pre-wrap prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: msg.body }}
                    />

                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.attachments.map((att: any, i: number) => (
                            <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs underline"
                          >
                            <Paperclip className="h-3 w-3" />
                            {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box */}
        <div className="p-4 border-t space-y-3">
          {isAssigned && (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant={isNote ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsNote(!isNote)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {isNote ? 'Internal Note' : 'Reply to Customer'}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAgentSelector(true)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Switch Agent
                </Button>
              </div>

              <div className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isNote ? 'Add internal note...' : 'Type your reply...'}
                  rows={3}
                  className="flex-1"
                  disabled={!canReply}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || replyMutation.isPending || !canReply}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}