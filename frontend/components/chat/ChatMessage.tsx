'use client';

import type { AIMessage } from '@/lib/api/ai';

interface ChatMessageProps {
  message: AIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.sender_type === 'AI';
  const isSystem = message.sender_type === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="text-center my-1">
        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-2`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          isAI
            ? 'bg-muted text-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {isAI && (
          <div className="text-xs font-semibold mb-1 text-muted-foreground">AI Assistant</div>
        )}
        {message.content}
      </div>
    </div>
  );
}
