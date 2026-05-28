'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { aiApi, type AIMessage } from '@/lib/api/ai';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui/button';

interface AIChatPanelProps {
  interviewId: number;
  currentCode?: string;
  language?: string;
  lastExecutionResult?: object | null;
  isReadOnly?: boolean;
}

export function AIChatPanel({
  interviewId,
  currentCode,
  language,
  lastExecutionResult,
  isReadOnly = false,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const msgs = await aiApi.getMessages(interviewId);
      setMessages(msgs);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [interviewId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (isSending) return;
    setIsSending(true);
    try {
      const response = await aiApi.sendMessage(interviewId, content, {
        current_code: currentCode,
        language,
        execution_result: lastExecutionResult ?? undefined,
      });
      setMessages((prev) => [...prev, response.user_message, response.ai_message]);
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          AI Assistant
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={fetchMessages}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-xs text-muted-foreground text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchMessages}>Retry</Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground text-center px-2 leading-relaxed">
              Ask the AI assistant for hints, code review, or help understanding the problem.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isSending && (
              <div className="flex justify-start mb-2">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      {!isReadOnly && (
        <ChatInput
          onSend={handleSend}
          disabled={isSending || isLoading}
          placeholder="Ask for a hint or code review..."
        />
      )}
    </div>
  );
}
