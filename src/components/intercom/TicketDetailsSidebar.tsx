import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Calendar,
  DollarSign,
  Tag,
  FileText,
  CheckCircle2,
  Plus,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  AlertCircle,
  Lightbulb
} from 'lucide-react';

// Date formatting helpers
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface TicketDetailsSidebarProps {
  ticketId: string;
  conversationId: string;
  opportunity?: any;
  conversation?: any;
  contact?: any;
  messages?: any[];
  onUpdate?: () => void;
}

export default function TicketDetailsSidebar({ 
  ticketId, 
  conversationId,
  opportunity,
  conversation,
  contact,
  messages = [],
  onUpdate
}: TicketDetailsSidebarProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Fetch AI Summary
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      fetchAISummary();
    }
  }, [conversationId, messages.length]);

  const fetchAISummary = async () => {
    setIsLoadingSummary(true);
    try {
      const response = await fetch('/api/intercom/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messages,
          opportunityId: ticketId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch AI summary:', error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleSaveDescription = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/ghl/opportunities/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customFields: [{ key: 'description', value: description }] 
        }),
      });
      
      if (response.ok) {
        setIsEditingDescription(false);
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to save description:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveResolution = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/ghl/opportunities/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customFields: [{ key: 'resolution_summary', value: resolution }] 
        }),
      });
      
      if (response.ok) {
        setIsEditingResolution(false);
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to save resolution:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const customer = conversation?.source?.author || {};
  const intercomTicketOwner = opportunity?.customFields?.find(
    (f: any) => f.key === 'intercom_ticket_owner'
  )?.value;
  const priority = opportunity?.customFields?.find(
    (f: any) => f.key === 'priority'
  )?.value;
  const category = opportunity?.customFields?.find(
    (f: any) => f.key === 'category'
  )?.value;

  const sentimentEmoji = {
    positive: '😊',
    neutral: '😐',
    negative: '😟',
    urgent: '🚨'
  };

  const priorityColor = {
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    medium: 'bg-orange-50 text-orange-700 border-orange-200',
    high: 'bg-red-50 text-red-700 border-red-200',
    urgent: 'bg-red-100 text-red-800 border-red-300'
  };

  return (
    <div className="w-80 border-l bg-white dark:bg-gray-950 overflow-y-auto">
      <div className="p-4 space-y-4">
        
        {/* AI Summary */}
        {isLoadingSummary ? (
          <Card className="p-4">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          </Card>
        ) : aiSummary ? (
          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-sm text-indigo-900">AI Summary</h3>
              </div>
              <div className="flex items-center gap-2">
                {aiSummary.cached && (
                  <Badge className="text-[10px] px-1.5 py-0 h-5 bg-green-100 text-green-700 border-green-200">
                    Cached
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="h-6 w-6 p-0"
                >
                  {summaryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Main Issue - Always Visible */}
            <div className="mb-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-indigo-700 mb-1">Main Issue</p>
                  <p className="text-sm text-gray-700">{aiSummary.summary?.mainIssue}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats - Always Visible */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-white">
                {sentimentEmoji[aiSummary.summary?.customerSentiment as keyof typeof sentimentEmoji]} {aiSummary.summary?.customerSentiment}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-white">
                <Clock className="w-3 h-3 mr-1" />
                {aiSummary.summary?.estimatedResolutionTime}
              </Badge>
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${priorityColor[aiSummary.summary?.priority?.toLowerCase() as keyof typeof priorityColor] || 'bg-gray-50'}`}>
                {aiSummary.summary?.priority}
              </Badge>
            </div>

            {/* Expandable Details */}
            {summaryExpanded && (
              <div className="mt-4 space-y-3 pt-3 border-t border-indigo-200">
                {/* Key Points */}
                {aiSummary.summary?.keyPoints && aiSummary.summary.keyPoints.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-3 h-3 text-indigo-600" />
                      <p className="text-xs font-semibold text-indigo-700">Key Points</p>
                    </div>
                    <ul className="space-y-1">
                      {aiSummary.summary.keyPoints.map((point: string, i: number) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Actions */}
                {aiSummary.summary?.suggestedActions && aiSummary.summary.suggestedActions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-3 h-3 text-indigo-600" />
                      <p className="text-xs font-semibold text-indigo-700">Suggested Actions</p>
                    </div>
                    <ul className="space-y-1">
                      {aiSummary.summary.suggestedActions.map((action: string, i: number) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">→</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAISummary}
              disabled={isLoadingSummary}
              className="w-full mt-3 text-xs h-7 text-indigo-700 hover:bg-indigo-100"
            >
              {isLoadingSummary ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-1" />
                  Refresh Summary
                </>
              )}
            </Button>
          </Card>
        ) : null}

        {/* Contact Information */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Contact Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium">{customer.name || 'Unknown'}</div>
              </div>
            </div>
            
            {customer.email && (
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                <a 
                  href={`mailto:${customer.email}`}
                  className="text-blue-600 hover:underline break-all"
                >
                  {customer.email}
                </a>
              </div>
            )}
            
            {contact?.phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                <a 
                  href={`tel:${contact.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
            )}
            
            {contact?.companyName && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                <span>{contact.companyName}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Details */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Details</h3>
          <div className="space-y-3 text-sm">
            
            <div className="flex justify-between items-start">
              <span className="text-gray-500">Intercom Ticket Owner</span>
              <Badge variant="outline">
                {intercomTicketOwner || 'Unassigned'}
              </Badge>
            </div>

            {priority && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Priority</span>
                <Badge variant="outline" className={
                  priority === 'High' || priority === 'Urgent'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : priority === 'Medium'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }>
                  {priority}
                </Badge>
              </div>
            )}

            {category && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Category</span>
                <Badge variant="outline">{category}</Badge>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Value</span>
              <span className="font-medium flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {opportunity?.monetaryValue || 0}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Created</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {opportunity?.createdAt && formatDate(opportunity.createdAt)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Updated</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {opportunity?.updatedAt && formatDate(opportunity.updatedAt)}
              </span>
            </div>
          </div>
        </Card>

        {/* Description */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </h3>
            {!isEditingDescription && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setDescription(opportunity?.customFields?.find((f: any) => f.key === 'description')?.value || '');
                  setIsEditingDescription(true);
                }}
              >
                Edit
              </Button>
            )}
          </div>
          
          {isEditingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDescription} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditingDescription(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {opportunity?.customFields?.find((f: any) => f.key === 'description')?.value || 'No description provided'}
            </p>
          )}
        </Card>

        {/* Resolution Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Resolution Summary
            </h3>
            {!isEditingResolution && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setResolution(opportunity?.customFields?.find((f: any) => f.key === 'resolution_summary')?.value || '');
                  setIsEditingResolution(true);
                }}
              >
                Edit
              </Button>
            )}
          </div>
          
          {isEditingResolution ? (
            <div className="space-y-2">
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Add resolution summary..."
                className="min-h-[100px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveResolution} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditingResolution(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {opportunity?.customFields?.find((f: any) => f.key === 'resolution_summary')?.value || 'No resolution summary yet'}
            </p>
          )}
        </Card>

        {/* Tags */}
        {contact?.tags && contact.tags.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}