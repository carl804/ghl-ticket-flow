import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
  Tag,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

// Pipeline Stages
const PIPELINE_STAGES = {
  OPEN: '3f3482b8-14c4-4de2-8a3c-4a336d01bb6e',
  IN_PROGRESS: 'bef596b8-d63d-40bd-b59a-5e0e474f1c8f',
  ESCALATED_TO_DEV: '7558330f-4b0e-48fd-af40-ab57f38c4141',
  RESOLVED: '4e24e27c-2e44-435b-bc1b-964e93518f20',
  CLOSED: 'fdbed144-2dd3-48b7-981d-b0869082cc4e',
  DELETED: '4a6eb7bf-51b0-4f4e-ad07-40256b92fe5b'
};

// Custom Field IDs
const CUSTOM_FIELDS = {
  PRIORITY: 'u0oHrYV91ZX8KQMS8Crk',
  CATEGORY: 'BXohaPrmtGLyHJ0wz8F7'
};

// Dropdown Options
const STAGE_OPTIONS = [
  { value: PIPELINE_STAGES.OPEN, label: 'Open' },
  { value: PIPELINE_STAGES.IN_PROGRESS, label: 'In Progress' },
  { value: PIPELINE_STAGES.ESCALATED_TO_DEV, label: 'Escalated to Dev' },
  { value: PIPELINE_STAGES.RESOLVED, label: 'Resolved' },
  { value: PIPELINE_STAGES.CLOSED, label: 'Closed' },
  { value: PIPELINE_STAGES.DELETED, label: 'Deleted' }
];

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const CATEGORY_OPTIONS = ['General Questions', 'Technical Support', 'Billing', 'Feature Request', 'Bug Report'];

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
  intercomTicketOwner?: string;
  currentStageId?: string;
  priority?: string;
  category?: string;
  opportunityId?: string;
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
  intercomTicketOwner,
  currentStageId,
  priority: initialPriority = 'Medium',
  category: initialCategory = 'General Questions',
  opportunityId,
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
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  
  // Dropdown states
  const [currentStage, setCurrentStage] = useState(currentStageId || PIPELINE_STAGES.OPEN);
  const [currentPriority, setCurrentPriority] = useState(initialPriority);
  const [currentCategory, setCurrentCategory] = useState(initialCategory);
  const [isUpdatingField, setIsUpdatingField] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Update GHL ticket field
  const updateTicketField = async (field: 'stage' | 'priority' | 'category', value: string) => {
    setIsUpdatingField(true);
    try {
      const updateData: any = {};
      
      if (field === 'stage') {
        updateData.pipelineStageId = value;
      } else if (field === 'priority') {
        updateData.customFields = [{
          id: CUSTOM_FIELDS.PRIORITY,
          field_value: value
        }];
      } else if (field === 'category') {
        updateData.customFields = [{
          id: CUSTOM_FIELDS.CATEGORY,
          field_value: value
        }];
      }

      // Call GHL API to update
      const response = await fetch(`/api/ghl-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: `/opportunities/${ticketId}`,
          method: 'PUT',
          body: updateData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update ticket');
      }
      
      console.log(`✅ Updated ${field} successfully`);
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
      
      // Invalidate tickets query to refresh
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error: any) {
      console.error(`❌ Failed to update ${field}:`, error);
      toast.error(`Failed to update ${field}: ${error.message}`);
      
      // Revert on error
      if (field === 'stage') setCurrentStage(currentStageId || PIPELINE_STAGES.OPEN);
      if (field === 'priority') setCurrentPriority(initialPriority);
      if (field === 'category') setCurrentCategory(initialCategory);
    } finally {
      setIsUpdatingField(false);
    }
  };

  // Handler functions
  const handleStageChange = async (newStage: string) => {
    setCurrentStage(newStage);
    await updateTicketField('stage', newStage);
  };

  const handlePriorityChange = async (newPriority: string) => {
    setCurrentPriority(newPriority);
    await updateTicketField('priority', newPriority);
  };

  const handleCategoryChange = async (newCategory: string) => {
    setCurrentCategory(newCategory);
    await updateTicketField('category', newCategory);
  };

    // Handle image file selection
  const handleImageAttachment = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please select image files only');
      return;
    }
  
    // Create preview URLs
    const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
    setAttachedImages(prev => [...prev, ...imageFiles]);
    setImagePreviewUrls(prev => [...prev, ...newPreviews]);
    toast.success(`Attached ${imageFiles.length} image(s)`);

  // Remove attached image
  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls]);
  };
  
  // Handle image paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
  
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            handleImageAttachment([file]);
          }
        }
      }
    };
  
    const textarea = messageInputRef.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste as any);
      return () => textarea.removeEventListener('paste', handlePaste as any);
    }
}, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSnoozeDialog(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSendMessage();
      } 
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (isAssigned) closeMutation.mutate();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        setShowCustomerDetails(!showCustomerDetails);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [message, isNote, showCustomerDetails]);

  const isAssigned = intercomTicketOwner && intercomTicketOwner !== 'Unassigned' && intercomTicketOwner.trim() !== '';

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

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgent) throw new Error('No agent selected');

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

      if (!intercomResponse.ok) throw new Error('Failed to assign in Intercom');

      await fetch('/api/intercom/actions', {
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

      if (onAssignmentChange) onAssignmentChange(selectedAgent.name);
      return intercomResponse.json();
    },
    onSuccess: () => {
      toast.success(`Assigned to ${selectedAgent?.name}`);
      queryClient.invalidateQueries({ queryKey: ['intercom-conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to assign ticket'),
  });

  const replyMutation = useMutation({
    mutationFn: async (messageData: { message: string; isNote: boolean; images?: File[] }) => {
      if (!selectedAgent) throw new Error('No agent selected');

      // If there are images, upload them first
      let attachmentUrls: string[] = [];
      if (messageData.images && messageData.images.length > 0) {
        const formData = new FormData();
        messageData.images.forEach((image) => {
          formData.append('files', image);
        });

        const uploadResponse = await fetch('/api/intercom/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload images');
        }

        const uploadData = await uploadResponse.json();
        attachmentUrls = uploadData.urls || [];
      }

      const response = await fetch('/api/intercom/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: messageData.message,
          isNote: messageData.isNote,
          agentName: selectedAgent.name,
          intercomAdminId: selectedAgent.intercomId,
          attachmentUrls,
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
      setAttachedImages([]);
      setImagePreviewUrls([]);
      toast.success(isNote ? 'Note added' : 'Reply sent');
      queryClient.invalidateQueries({ queryKey: ['intercom-conversation', conversationId] });
      messageInputRef.current?.focus();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to send message'),
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgent) throw new Error('No agent selected');

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

      if (!response.ok) throw new Error('Failed to close conversation');

      await fetch('/api/intercom/actions', {
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
    onError: (error: any) => toast.error(error.message || 'Failed to close conversation'),
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ hours, label }: { hours: number; label: string }) => {
      if (!selectedAgent) throw new Error('No agent selected');

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

      if (!response.ok) throw new Error('Failed to snooze conversation');

      await fetch('/api/intercom/actions', {
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
    onError: (error: any) => toast.error(error.message || 'Failed to snooze conversation'),
  });

  const handleSaveAgent = (agent: StoredAgent) => {
    localStorage.setItem('intercomAgent', JSON.stringify(agent));
    setSelectedAgent(agent);
    setShowAgentSelector(false);
    toast.success(`Logged in as ${agent.name}`);
  };

  const handleSendMessage = () => {
    if (!message.trim() && attachedImages.length === 0) return;
    if (!selectedAgent) {
      toast.error('Please select an agent first');
      return;
    }
    if (!isNote && !isAssigned) {
      toast.error('Please assign the ticket first to reply to customers');
      return;
    }
    replyMutation.mutate({ 
      message, 
      isNote,
      images: attachedImages.length > 0 ? attachedImages : undefined
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const snoozeOptions = getSnoozeOptions();

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
      if (diffDays === 0) return format(date, 'h:mm a');
      else if (diffDays < 7) return format(date, 'EEE h:mm a');
      else return format(date, 'EEE, MMM d, h:mm a');
    };

    return hours > 0 ? { hours, label, time: formatSnoozeTime(snoozeUntil) } : null;
  };

  const getFilteredSnoozeOptions = () => {
    if (!snoozeInput.trim()) return snoozeOptions;

    const numberMatch = snoozeInput.match(/^(\d+)$/);
    if (numberMatch) {
      const value = parseInt(numberMatch[1]);
      const now = new Date();
      
      const formatSnoozeTime = (date: Date) => {
        const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return format(date, 'h:mm a');
        else if (diffDays < 7) return format(date, 'EEE h:mm a');
        else return format(date, 'EEE, MMM d, h:mm a');
      };

      return [
        {
          label: `for ${value} minute${value !== 1 ? 's' : ''}`,
          time: formatSnoozeTime(new Date(now.getTime() + value * 60 * 1000)),
          hours: value / 60,
          isCustom: true
        },
        {
          label: `for ${value} hour${value !== 1 ? 's' : ''}`,
          time: formatSnoozeTime(new Date(now.getTime() + value * 60 * 60 * 1000)),
          hours: value,
          isCustom: true
        },
        {
          label: `for ${value} day${value !== 1 ? 's' : ''}`,
          time: formatSnoozeTime(new Date(now.getTime() + value * 24 * 60 * 60 * 1000)),
          hours: value * 24,
          isCustom: true
        },
        {
          label: `for ${value} week${value !== 1 ? 's' : ''}`,
          time: formatSnoozeTime(new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000)),
          hours: value * 168,
          isCustom: true
        }
      ];
    }

    const customDuration = parseSnoozeInput(snoozeInput);
    if (customDuration) {
      return [
        { ...customDuration, isCustom: true },
        ...snoozeOptions.filter(opt => opt.label.toLowerCase().includes(snoozeInput.toLowerCase()))
      ];
    }

    return snoozeOptions.filter(opt => opt.label.toLowerCase().includes(snoozeInput.toLowerCase()));
  };

  const handleSnoozeSubmit = () => {
    const customDuration = parseSnoozeInput(snoozeInput);
    if (customDuration) {
      snoozeMutation.mutate(customDuration);
      setSnoozeInput('');
    }
  };

  const filteredSnoozeOptions = getFilteredSnoozeOptions();

  // Get current stage label for display
  const getCurrentStageLabel = () => {
    return STAGE_OPTIONS.find(opt => opt.value === currentStage)?.label || 'Open';
  };

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
            <DialogDescription>Select your name to identify yourself</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {AGENT_LIST.map((agent) => (
              <Button
                key={agent.intercomId}
                variant="outline"
                className="w-full justify-start h-auto py-3 hover:bg-indigo-50 hover:border-indigo-200"
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

      {/* Snooze Dialog */}
      <Dialog open={showSnoozeDialog} onOpenChange={(open) => {
        setShowSnoozeDialog(open);
        if (!open) setSnoozeInput('');
      }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Snooze conversation</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">Type a duration or choose from presets</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
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
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredSnoozeOptions.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-between h-auto py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:border-indigo-200 dark:hover:border-indigo-700 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  onClick={() => {
                    snoozeMutation.mutate({ hours: option.hours, label: option.label });
                    setSnoozeInput('');
                  }}
                  disabled={snoozeMutation.isPending}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{option.time}</span>
                    {(option as any).isCustom && (
                      <Badge variant="secondary" className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-0">Custom</Badge>
                    )}
                  </div>
                </Button>
              ))}
              {filteredSnoozeOptions.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No matching options</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try "5m", "2h", "3d", or "1w"</p>
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
            <SheetDescription>Information about {customerName}</SheetDescription>
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

      {/* ULTRA-COMPACT MAIN LAYOUT */}
      <div className="flex flex-col h-full bg-gray-50/30">
        {/* Ultra-Compact Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-2 flex items-center gap-3">
            {/* Left side - Customer info */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink">
              <button
                onClick={() => setShowCustomerDetails(true)}
                className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-1.5 py-0.5 transition-colors group min-w-0"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <h3 className="font-semibold text-gray-900 text-xs truncate max-w-[150px]">{customerName}</h3>
                  <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{customerEmail}</p>
                </div>
                <Info className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
              </button>
            </div>

            {/* Middle - Dropdowns (wrap on small screens) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Intercom State Badge (read-only) */}
              <Badge className={`text-[10px] px-1.5 py-0 h-5 whitespace-nowrap ${
                conversation.state === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {conversation.state === 'open' && <span className="w-1 h-1 rounded-full bg-emerald-500 mr-1" />}
                {conversation.state}
              </Badge>

              {/* Stage Dropdown */}
              <Select value={currentStage} onValueChange={handleStageChange} disabled={isUpdatingField}>
                <SelectTrigger className="h-5 text-[10px] px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-700 w-auto gap-1 min-w-[80px]">
                  <SelectValue>{getCurrentStageLabel()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map(stage => (
                    <SelectItem key={stage.value} value={stage.value} className="text-xs">
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority Dropdown */}
              <Select value={currentPriority} onValueChange={handlePriorityChange} disabled={isUpdatingField}>
                <SelectTrigger className={`h-5 text-[10px] px-1.5 py-0 w-auto gap-1 min-w-[70px] ${
                  currentPriority === 'High' || currentPriority === 'Urgent' 
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : currentPriority === 'Medium'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(priority => (
                    <SelectItem key={priority} value={priority} className="text-xs">
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Dropdown */}
              <Select value={currentCategory} onValueChange={handleCategoryChange} disabled={isUpdatingField}>
                <SelectTrigger className="h-5 text-[10px] px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-700 w-auto gap-1 min-w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(category => (
                    <SelectItem key={category} value={category} className="text-xs">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Assignee Badge */}
              {intercomTicketOwner && intercomTicketOwner !== 'Unassigned' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-purple-50 text-purple-700 border-purple-200 whitespace-nowrap">
                  👤 {intercomTicketOwner}
                </Badge>
              )}
            </div>

            {/* Right side - Actions (push to end) */}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              {selectedAgent && (
                <button
                  onClick={() => setShowAgentSelector(true)}
                  className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-medium">
                    {selectedAgent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{selectedAgent.name}</span>
                </button>
              )}

              {isAssigned && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSnoozeDialog(true)}
                    className="gap-1.5 h-7 px-2 text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                    title="Snooze (⌘K)"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Snooze</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeMutation.mutate()}
                    disabled={closeMutation.isPending || conversation.state === 'closed'}
                    className="gap-1.5 h-7 px-2 text-xs bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                    title="Close (⌘W)"
                  >
                    {closeMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden md:inline">Close</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Assignment Alert - Compact */}
          {!isAssigned && (
            <div className="px-4 pb-2">
              <Alert className="bg-amber-50 border-amber-200 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <AlertDescription className="flex items-center justify-between text-amber-800 text-xs">
                  <span>Assign ticket to reply</span>
                  <Button
                    size="sm"
                    onClick={() => assignMutation.mutate()}
                    disabled={assignMutation.isPending || !selectedAgent}
                    className="ml-3 bg-amber-600 hover:bg-amber-700 gap-1.5 h-6 px-2 text-xs"
                  >
                    {assignMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                    Assign
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Messages - MAXIMUM SPACE */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {allMessages.map((msg, index) => {
            const isCustomer = msg.author.type === 'user' || msg.author.type === 'lead';
            const isNote = msg.type === 'note';
            const messageBody = msg.body || '';
            
            if (!messageBody.trim() && (!msg.attachments || msg.attachments.length === 0)) return null;

            const prevMsg = index > 0 ? allMessages[index - 1] : null;
            const isSameAuthor = prevMsg && prevMsg.author.id === msg.author.id && prevMsg.type === msg.type;
            const isFirstInGroup = !isSameAuthor;
            const authorName = msg.author.name || 'Unknown';
            const initials = authorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
            
            return (
              <div key={index} className={`flex gap-3 ${isCustomer ? 'justify-start' : 'justify-end'} ${isFirstInGroup ? 'mt-6' : 'mt-1'}`}>
                {isCustomer && isFirstInGroup && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium shadow-sm flex-shrink-0">
                    {initials}
                  </div>
                )}
                {isCustomer && !isFirstInGroup && <div className="w-8" />}

                <div className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'} max-w-[70%]`}>
                  {isFirstInGroup && (
                    <div className={`flex items-center gap-2 mb-1.5 px-1 ${isCustomer ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span className="text-xs font-semibold text-gray-700">{authorName}</span>
                      {isNote && <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-amber-50 border-amber-200 text-amber-700">Note</Badge>}
                      <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(msg.created_at * 1000), { addSuffix: true })}</span>
                    </div>
                  )}

                  <div className={`px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all ${
                    isCustomer ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-md' 
                    : isNote ? 'bg-amber-50 text-amber-900 border border-amber-200/50 rounded-tr-md'
                    : 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-md'
                  } ${!isFirstInGroup && isCustomer ? 'rounded-tl-2xl' : ''} ${!isFirstInGroup && !isCustomer ? 'rounded-tr-2xl' : ''}
                  [&_a]:text-white [&_a]:underline [&_a]:font-semibold hover:[&_a]:text-white/90`}>
                    {messageBody && (
                      <div className="text-[15px] leading-relaxed prose prose-sm max-w-none [&>p]:my-0" dangerouslySetInnerHTML={{ __html: messageBody }} />
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={`${messageBody ? 'mt-2' : ''} space-y-1.5`}>
                        {msg.attachments.map((att: any, i: number) => (
                          <a key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
                              isCustomer ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/20 hover:bg-white/30 text-white'
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-medium shadow-sm flex-shrink-0">
                    {initials}
                  </div>
                )}
                {!isCustomer && !isFirstInGroup && <div className="w-8" />}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box - Compact */}
        {selectedAgent && (
          <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <Button
                variant={isNote ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsNote(!isNote)}
                className={`h-7 text-xs ${isNote ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
              >
                <MessageSquare className="h-3 w-3 mr-1.5" />
                {isNote ? 'Internal Note' : 'Reply'}
              </Button>
              <div className="text-[10px] text-gray-400">
                <kbd className="px-1 py-0.5 bg-gray-100 border rounded text-[9px]">⌘</kbd>+<kbd className="px-1 py-0.5 bg-gray-100 border rounded text-[9px]">↵</kbd>
              </div>
            </div>

            {/* Image Previews */}
            {imagePreviewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Attachment ${index + 1}`}
                      className="h-20 w-20 object-cover rounded border border-gray-200"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleImageAttachment(Array.from(e.target.files));
                  }
                }}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 w-9 flex-shrink-0"
                title="Attach image"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                ref={messageInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isNote ? 'Add note... (paste images with Ctrl+V)' : isAssigned ? 'Type reply... (paste images with Ctrl+V)' : 'Assign first...'}
                rows={3}
                disabled={!isNote && !isAssigned}
                className="flex-1 resize-none text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={(!message.trim() && attachedImages.length === 0) || replyMutation.isPending || (!isNote && !isAssigned)}
                size="icon"
                className="h-9 w-9 bg-indigo-500 hover:bg-indigo-600 self-end"
              >
                {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}