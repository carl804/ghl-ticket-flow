import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ConversationSummaryProps {
  conversationId: string;
  messages: any[];
  opportunityId: string;
}

export default function ConversationSummary({
  conversationId,
  messages,
  opportunityId,
}: ConversationSummaryProps) {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (messages.length > 0) {
      fetchSummary();
    }
  }, [conversationId, messages.length]);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/intercom/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messages,
          opportunityId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setIsCached(data.cached || false);
      }
    } catch (error) {
      console.error('Failed to fetch AI summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Generating AI Summary...</span>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700/50 overflow-hidden">
      {/* Header - Light: Clean gradient / Dark: Bold gradient */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 dark:border-b dark:border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icon - Light: Solid / Dark: Glowing */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-600 dark:shadow-lg dark:shadow-blue-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">AI Summary</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isCached && (
              <Badge className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 text-xs font-semibold">
                ✓ Cached
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSummary}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsed State - Show full main issue (NO TRUNCATION) */}
      {!isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-900">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Main Issue
              </p>
              {/* NO TRUNCATION - Show full text */}
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {summary.mainIssue}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded State - Full Details */}
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-900 space-y-4">
          {/* Main Issue */}
          <div className="border-l-3 border-blue-500 dark:border-blue-400 pl-4 pr-4 py-3 bg-gradient-to-r from-blue-50/30 to-transparent dark:from-blue-900/20 dark:to-transparent rounded-r-lg">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Main Issue
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-medium">
              {summary.mainIssue}
            </p>
          </div>

          {/* Key Points */}
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
                Key Points
              </p>
              <div className="space-y-2.5">
                {summary.keyPoints.map((point: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border-l border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:border-blue-500/50 transition-all cursor-default"
                  >
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {summary.suggestedActions && summary.suggestedActions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-700 dark:text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
                </svg>
                Suggested Actions
              </p>
              <div className="space-y-2.5">
                {summary.suggestedActions.map((action: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border-l border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:border-purple-500/50 transition-all cursor-default"
                  >
                    <div className="text-purple-500 dark:text-purple-400 font-bold flex-shrink-0 mt-1">→</div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}