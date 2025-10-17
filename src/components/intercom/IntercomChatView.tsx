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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Send, 
  Paperclip, 
  Clock, 
  X as CloseIcon, 
  MessageSquare,
  User,
  AlertCircle,
  UserPlus,
  Search,
  ChevronRight,
  Info,
  Mail,
  Phone,
  Tag,
  Archive,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

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

  const formatSnoozeTime = (date: Date) => {
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return format(date, 'h:mm a');
    } else if (diffDays < 7) {
      return format(date, 'EEE h:mm a');
    } else {
      return format(date, 'EEE, MMM d, h:mm a');
    }
  };
  
  return [
    { 
      label: 'for 5 minutes',
      time: formatSnoozeTime(new Date(now.getTime() + 5 * 60 * 1000)),
      hours: 5 / 60 
    },
    { 
      label: 'for 4 hours',
      time: formatSnoozeTime(laterToday),
      hours: 4 
    },
    { 
      label: 'for 1 day',
      time: formatSnoozeTime(tomorrow),
      hours: Math.round((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60)) 
    },
    { 
      label: 'for 1 week',
      time: formatSnoozeTime(nextMonday),
      hours: Math.round((nextMonday.getTime() - now.getTime()) / (1000 * 60 * 60)),
      hide: now.getDay() === 1 
    },
    { 
      label: 'for 1 week',
      time: formatSnoozeTime(oneWeek),
      hours: 168 
    },
    { 
      label: 'for 1 month',
      time: formatSnoozeTime(oneMonth),
      hours: 720 
    },
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
  const [snoozeInput, setSnoozeInput] = useState('');
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<StoredAgent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
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
      setShowAgentSelector(true);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSnoozeDialog(true);
      }
      // Cmd/Ctrl + Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
      }
      // Cmd/Ctrl + W to close
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (isAssigned) closeMutation.mutate();
      }
      // Cmd/Ctrl + I for customer info
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        setShowCustomerDetails(!showCustomerDetails);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [message, isNote, showCustomerDetails]);

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
    refetchInterval: 10000,
    retry: 3,
  });

  // Assign to me mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgent) {
        throw new Error('No agent selected');
      }

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
      messageInputRef.current?.focus();
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

      await fetch('/api/intercom/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: `Snoozed ${label} by ${selectedAgent.name}`,
          isNote: true,
          agentName: selectedAgent.name,
          intercomAdminId: selectedAgent.intercomId,
        }),
      }).catch(err => console.error('Failed to add audit log:', err));

      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Snoozed ${variables.label}`);
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
    if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const snoozeOptions = getSnoozeOptions();

  // Parse snooze input for custom duration
  const parseSnoozeInput = (input: string): { hours: number; label: string; time: string } | null => {
    const match = input.match(/^(\d+)\s*(m|h|d|w|min|mins|minute|minutes|hour|hours|day|days|week|weeks)?$/i);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || 'h';

    let hours = 0;
    let label = '';
    const now = new Date();
    let snoozeUntil = new Date(now);

    if (unit.startsWith('m')) {
      hours = value / 60;
      label = `for ${value} minute${value !== 1 ? 's' : ''}`;
      snoozeUntil.setMinutes(now.getMinutes() + value);
    } else if (unit.startsWith('h')) {
      hours = value;
      label = `for ${value} hour${value !== 1 ? 's' : ''}`;
      snoozeUntil.setHours(now.getHours() + value);
    } else if (unit.startsWith('d')) {
      hours = value * 24;
      label = `for ${value} day${value !== 1 ? 's' : ''}`;
      snoozeUntil.setDate(now.getDate() + value);
    } else if (unit.startsWith('w')) {
      hours = value * 168;
      label = `for ${value} week${value !== 1 ? 's' : ''}`;
      snoozeUntil.setDate(now.getDate() + (value * 7));
    }

    const formatSnoozeTime = (date: Date) => {
      const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return format(date, 'h:mm a');
      } else if (diffDays < 7) {
        return format(date, 'EEE h:mm a');
      } else {
        return format(date, 'EEE, MMM d, h:mm a');
      }
    };

    return hours > 0 ? { hours, label, time: formatSnoozeTime(snoozeUntil) } : null;
  };

  // Get filtered snooze suggestions based on input
  const getFilteredSnoozeOptions = () => {
    if (!snoozeInput.trim()) return snoozeOptions;

    const numberMatch = snoozeInput.match(/^(\d+)$/);
    if (numberMatch) {
      const value = parseInt(numberMatch[1]);
      const now = new Date();
      
      const formatSnoozeTime = (date: Date) => {
        const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          return format(date, 'h:mm a');
        } else if (diffDays < 7) {
          return format(date, 'EEE h:mm a');
        } else {
          return format(date, 'EEE, MMM d, h:mm a');
        }
      };

      const suggestions = [];
      
      const minuteDate = new Date(now.getTime() + value * 60 * 1000);
      suggestions.push({
        label: `for ${value} minute${value !== 1 ? 's' : ''}`,
        time: formatSnoozeTime(minuteDate),
        hours: value / 60,
        isCustom: true
      });

      const hourDate = new Date(now.getTime() + value * 60 * 60 * 1000);
      suggestions.push({
        label: `for ${value} hour${value !== 1 ? 's' : ''}`,
        time: formatSnoozeTime(hourDate),
        hours: value,
        isCustom: true
      });

      const dayDate = new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      suggestions.push({
        label: `for ${value} day${value !== 1 ? 's' : ''}`,
        time: formatSnoozeTime(dayDate),
        hours: value * 24,
        isCustom: true
      });

      const weekDate = new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      suggestions.push({
        label: `for ${value} week${value !== 1 ? 's' : ''}`,
        time: formatSnoozeTime(weekDate),
        hours: value * 168,
        isCustom: true
      });

      return suggestions;
    }

    const customDuration = parseSnoozeInput(snoozeInput);
    if (customDuration) {
      return [
        { ...customDuration, isCustom: true },
        ...snoozeOptions.filter(opt => 
          opt.label.toLowerCase().includes(snoozeInput.toLowerCase())
        )
      ];
    }

    return snoozeOptions.filter(opt => 
      opt.label.toLowerCase().includes(snoozeInput.toLowerCase())
    );
  };

  const handleSnoozeSubmit = () => {
    const customDuration = parseSnoozeInput(snoozeInput);
    if (customDuration) {
      snoozeMutation.mutate(customDuration);
      setSnoozeInput('');
    }
  };

  const filteredSnoozeOptions = getFilteredSnoozeOptions();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50/50">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-gray-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50/50">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-500">Conversation not found</p>
        </div>
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

  const customerName = conversation.source.author.name || 'Customer';
  const customerEmail = conversation.source.author.email;
  const initials = customerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      {/* Agent Selector Dialog */}
      <Dialog open={showAgentSelector} onOpenChange={setShowAgentSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Who are you?</DialogTitle>
            <DialogDescription>
              Select your name to identify yourself when replying to customers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {AGENT_LIST.map((agent) => (
              <Button
                key={agent.intercomId}
                variant="outline"
                className="w-full justify-start h-auto py-3 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                onClick={() => handleSaveAgent(agent)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-sm font-medium mr-3">
                  {agent.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium">{agent.fullName}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Snooze Options Dialog */}
      <Dialog open={showSnoozeDialog} onOpenChange={(open) => {
        setShowSnoozeDialog(open);
        if (!open) setSnoozeInput('');
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Snooze conversation</DialogTitle>
            <DialogDescription>
              Type a duration or choose from presets
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={snoozeInput}
                onChange={(e) => setSnoozeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && parseSnoozeInput(snoozeInput)) {
                    handleSnoozeSubmit();
                  }
                }}
                placeholder="Type duration... (5m, 2h, 3d, 1w)"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredSnoozeOptions.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-between h-auto py-3 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                  onClick={() => {
                    snoozeMutation.mutate({ hours: option.hours, label: option.label });
                    setSnoozeInput('');
                  }}
                  disabled={snoozeMutation.isPending}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{option.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{option.time}</span>
                    {(option as any).isCustom && (
                      <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 border-0">Custom</Badge>
                    )}
                  </div>
                </Button>
              ))}
              
              {filteredSnoozeOptions.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No matching options</p>
                  <p className="text-xs text-gray-400 mt-1">Try formats like "5m", "2h", "3d", or "1w"</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Details Sidebar */}
      <Sheet open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Customer Details</SheetTitle>
            <SheetDescription>
              Information about {customerName}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-medium">
                {initials}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{customerName}</h3>
                <p className="text-sm text-gray-500">{customerEmail}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-900 mt-0.5">{customerEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">Customer</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversation</p>
                  <p className="text-sm text-gray-900 mt-0.5 capitalize">{conversation.state}</p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-col h-full bg-gray-50/30">
        {/* Compact Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          {/* Main Header Row */}
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <ChevronRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back</span>
              </button>

              <div className="h-6 w-px bg-gray-200" />

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => setShowCustomerDetails(true)}
                  className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1 -ml-2 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{customerName}</h3>
                    <p className="text-xs text-gray-500 truncate">{customerEmail}</p>
                  </div>
                  <Info className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Badge 
                  variant={conversation.state === 'open' ? 'default' : 'secondary'} 
                  className={`text-xs font-medium ${
                    conversation.state === 'open' 
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {conversation.state === 'open' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />}
                  {conversation.state}
                </Badge>
                <Badge variant="outline" className="text-xs font-medium bg-amber-50 text-amber-700 border-amber-200">
                  Medium
                </Badge>
                <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                  General Questions
                </Badge>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 ml-4">
              {selectedAgent && (
                <button
                  onClick={() => setShowAgentSelector(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                    {selectedAgent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{selectedAgent.name}</span>
                </button>
              )}

              {isAssigned && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSnoozeDialog(true)}
                    disabled={snoozeMutation.isPending}
                    className="gap-2 hover:bg-gray-100"
                    title="Snooze (⌘K)"
                  >
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Snooze</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => closeMutation.mutate()}
                    disabled={closeMutation.isPending || conversation.state === 'closed'}
                    className="gap-2 hover:bg-gray-100"
                    title="Close (⌘W)"
                  >
                    {closeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Close</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Assignment Alert */}
          {!isAssigned && (
            <div className="px-6 pb-3">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="flex items-center justify-between text-amber-800">
                  <span className="text-sm">This ticket is unassigned. Assign it to reply to customers.</span>
                  <Button
                    size="sm"
                    onClick={() => assignMutation.mutate()}
                    disabled={assignMutation.isPending || !selectedAgent}
                    className="ml-4 bg-amber-600 hover:bg-amber-700 text-white gap-2"
                  >
                    {assignMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <UserPlus className="h-3 w-3" />
                    )}
                    Assign to Me
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
          {allMessages.map((msg, index) => {
            const isCustomer = msg.author.type === 'user' || msg.author.type === 'lead';
            const isNote = msg.type === 'note';
            const messageBody = msg.body || '';
            
            if (!messageBody.trim() && (!msg.attachments || msg.attachments.length === 0)) {
              return null;
            }

            const prevMsg = index > 0 ? allMessages[index - 1] : null;
            const isSameAuthor = prevMsg && prevMsg.author.id === msg.author.id && prevMsg.type === msg.type;
            const isFirstInGroup = !isSameAuthor;
            
            const authorName = msg.author.name || 'Unknown';
            const initials = authorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
            
            return (
              <div
                key={index}
                className={`flex gap-3 ${isCustomer ? 'justify-start' : 'justify-end'} ${
                  isFirstInGroup ? 'mt-6' : 'mt-1'
                }`}
              >
                {isCustomer && isFirstInGroup && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                    {initials}
                  </div>
                )}
                {isCustomer && !isFirstInGroup && <div className="w-8" />}

                <div className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'} max-w-[70%]`}>
                  {isFirstInGroup && (
                    <div className={`flex items-center gap-2 mb-1.5 px-1 ${isCustomer ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span className="text-xs font-semibold text-gray-700">
                        {authorName}
                      </span>
                      {isNote && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-amber-50 border-amber-200 text-amber-700">
                          Note
                        </Badge>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(msg.created_at * 1000), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  <div
                    className={`
                      px-4 py-3 rounded-2xl shadow-sm transition-all hover:shadow-md
                      ${isCustomer 
                        ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-md' 
                        : isNote
                        ? 'bg-amber-50 text-amber-900 border border-amber-200/50 rounded-tr-md'
                        : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-md'
                      }
                      ${!isFirstInGroup && isCustomer ? 'rounded-tl-2xl' : ''}
                      ${!isFirstInGroup && !isCustomer ? 'rounded-tr-2xl' : ''}
                      [&_a]:text-white [&_a]:underline [&_a]:font-semibold hover:[&_a]:text-white/90
                    `}
                  >
                    {messageBody && (
                      <div
                        className="text-[15px] leading-relaxed prose prose-sm max-w-none [&>p]:my-0 [&>p]:leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: messageBody }}
                      />
                    )}

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`${messageBody ? 'mt-2' : ''} space-y-1.5`}>
                        {msg.attachments.map((att: any, i: number) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                              isCustomer 
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                                : 'bg-white/20 hover:bg-white/30 text-white'
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

                {!isCustomer && isFirstInGroup && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                    {initials}
                  </div>
                )}
                {!isCustomer && !isFirstInGroup && <div className="w-8" />}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box */}
        {selectedAgent && (
          <div className="border-t border-gray-200 bg-white px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={isNote ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsNote(!isNote)}
                  className={isNote ? 'bg-amber-500 hover:bg-amber-600' : ''}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {isNote ? 'Internal Note' : 'Reply to Customer'}
                </Button>
                
                {!isAssigned && !isNote && (
                  <p className="text-xs text-amber-600 font-medium">
                    Assign ticket to reply to customers
                  </p>
                )}
              </div>

              <div className="text-xs text-gray-400">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono">Enter</kbd> to send
              </div>
            </div>

            <div className="flex gap-3">
              <Textarea
                ref={messageInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isNote ? 'Add internal note...' : isAssigned ? 'Type your reply...' : 'Assign ticket first...'}
                rows={3}
                disabled={!isNote && !isAssigned}
                className="flex-1 resize-none border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || replyMutation.isPending || (!isNote && !isAssigned)}
                size="icon"
                className="h-10 w-10 bg-indigo-500 hover:bg-indigo-600 self-end"
              >
                {replyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}