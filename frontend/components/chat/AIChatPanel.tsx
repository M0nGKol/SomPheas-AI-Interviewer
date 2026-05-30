'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { aiApi, streamMessage, type AIMessage } from '@/lib/api/ai';
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

// Temporary streaming message shown while AI is typing
const STREAMING_ID = -1;

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
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const msgs = await aiApi.getMessages(interviewId);
      setMessages(msgs);
    } catch {
      setLoadError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [interviewId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = async (content: string) => {
    if (isSending) return;
    setSendError(null);
    setIsSending(true);
    setStreamingText('');

    // Optimistically add the user message
    const tempUserMsg: AIMessage = {
      id: -2,
      interview_id: interviewId,
      sender_id: null,
      sender_type: 'CANDIDATE',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      await streamMessage(
        interviewId,
        content,
        { current_code: currentCode, language, execution_result: lastExecutionResult ?? undefined },
        (chunk) => {
          setStreamingText((prev) => (prev ?? '') + chunk);
        },
        (aiMessage) => {
          // Replace streaming placeholder with persisted message
          setStreamingText(null);
          setMessages((prev) => {
            // Replace temp user message with real IDs if needed, then add AI message
            const withoutTemp = prev.filter((m) => m.id !== -2);
            return [...withoutTemp, { ...tempUserMsg, id: aiMessage.id - 1 }, aiMessage as AIMessage];
          });
        },
        (err) => {
          setSendError(`AI unavailable: ${err}. Please retry.`);
          setStreamingText(null);
          setMessages((prev) => prev.filter((m) => m.id !== -2));
        },
      );
    } catch (err) {
      setSendError('Failed to send message. Please try again.');
      setStreamingText(null);
      setMessages((prev) => prev.filter((m) => m.id !== -2));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            AI Assistant
          </span>
          {isSending && (
            <span className="text-xs text-primary animate-pulse">typing…</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={fetchMessages}
          disabled={isLoading || isSending}
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
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-xs text-muted-foreground text-center">{loadError}</p>
            <Button variant="outline" size="sm" onClick={fetchMessages}>Retry</Button>
          </div>
        ) : messages.length === 0 && !streamingText ? (
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

            {/* Live streaming bubble */}
            {streamingText !== null && (
              <div className="flex justify-start mb-2">
                <div className="bg-muted rounded-lg px-3 py-2 max-w-[90%] text-xs whitespace-pre-wrap">
                  {streamingText || <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
              </div>
            )}

            {/* Inline send error with retry */}
            {sendError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 mt-2">
                <AlertCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-destructive">{sendError}</p>
                  <button
                    className="text-xs text-primary underline mt-1"
                    onClick={() => { setSendError(null); }}
                  >
                    Dismiss
                  </button>
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
          placeholder="Ask for a hint or code review…"
        />
      )}
    </div>
  );
}
