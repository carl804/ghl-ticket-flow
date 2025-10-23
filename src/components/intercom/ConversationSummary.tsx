import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  MessageSquare
} from 'lucide-react';

interface ConversationSummaryProps {
  conversationId: string;
  messages: any[];
  opportunityId?: string;
}

interface Summary {
  mainIssue: string;
  customerSentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  keyPoints: string[];
  suggestedActions: string[];
  previousInteractions: number;
  estimatedResolutionTime: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const sentimentConfig = {
  positive: { color: 'bg-green-100 text-green-700 border-green-200', icon: '😊', label: 'Positive' },
  neutral: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '😐', label: 'Neutral' },
  negative: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '😟', label: 'Frustrated' },
  urgent: { color: 'bg-red-100 text-red-700 border-red-200', icon: '🚨', label: 'Urgent' },
};

export default function ConversationSummary({ conversationId, messages, opportunityId }: ConversationSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const generateSummary = async (forceRegenerate = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/intercom/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId, 
          messages,
          opportunityId,
          forceRegenerate
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.summary);
      setIsCached(data.cached || false);
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('Failed to generate summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate on mount
  useEffect(() => {
    if (messages.length > 0) {
      generateSummary();
    }
  }, [conversationId]); // Only run when conversation changes

  if (!summary && !isLoading && !error) {
    return (
      <div className="px-4 py-3 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
        <Button
          onClick={() => generateSummary()}
          size="sm"
          variant="outline"
          className="w-full gap-2 hover:bg-white dark:hover:bg-gray-800"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Generate AI Summary
        </Button>
      </div>
    );
  }

  return (
    <Card className="mx-4 my-3 border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">AI Summary</h3>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />}
            {isCached && !isLoading && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200">
                Cached
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {summary && (
              <Button
                onClick={() => generateSummary(true)}
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                disabled={isLoading}
                title="Force regenerate summary"
              >
                Refresh
              </Button>
            )}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-gray-500">Analyzing conversation...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary Content */}
        {summary && isExpanded && (
          <div className="space-y-3">
            {/* Main Issue */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Main Issue</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{summary.mainIssue}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1 mb-1">
                  <User className="h-3 w-3 text-gray-500" />
                  <p className="text-[10px] font-medium text-gray-500">Sentiment</p>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 h-5 ${sentimentConfig[summary.customerSentiment].color}`}>
                  {sentimentConfig[summary.customerSentiment].icon} {sentimentConfig[summary.customerSentiment].label}
                </Badge>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3 text-gray-500" />
                  <p className="text-[10px] font-medium text-gray-500">Est. Time</p>
                </div>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{summary.estimatedResolutionTime}</p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="h-3 w-3 text-gray-500" />
                  <p className="text-[10px] font-medium text-gray-500">Priority</p>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0 h-5 ${
                  summary.priority === 'urgent' ? 'bg-red-100 text-red-700 border-red-200'
                  : summary.priority === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200'
                  : summary.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  {summary.priority}
                </Badge>
              </div>
            </div>

            {/* Key Points */}
            {summary.keyPoints.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Key Points</p>
                <ul className="space-y-1.5">
                  {summary.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Actions */}
            {summary.suggestedActions.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-indigo-200 dark:border-indigo-900">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">💡 Suggested Actions</p>
                <ul className="space-y-1.5">
                  {summary.suggestedActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <span className="text-indigo-600 dark:text-indigo-400 flex-shrink-0">→</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Collapsed State */}
        {summary && !isExpanded && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="truncate">{summary.mainIssue}</span>
            <Badge className={`text-[10px] px-1.5 py-0 h-4 ${sentimentConfig[summary.customerSentiment].color}`}>
              {sentimentConfig[summary.customerSentiment].icon}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
}