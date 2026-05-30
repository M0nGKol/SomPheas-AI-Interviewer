'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// Exponential backoff: 2s, 4s, 8s, 16s, max 30s
const BACKOFF_BASE_MS = 2000;
const BACKOFF_MAX_MS = 30000;

// Cursor updates are high-frequency — throttle to avoid flooding
const CURSOR_THROTTLE_MS = 80;

type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseInterviewSocketOptions {
  interviewId: number;
  onCodeSync?: (code: string, language: string) => void;
  onSessionStatus?: (status: string) => void;
  onChatMessage?: (content: string, senderType: string) => void;
  onCodeResult?: (result: object) => void;
  onCursorUpdate?: (userId: number | null, line: number, column: number) => void;
  onSessionFlag?: (flagType: string, meta: object) => void;
  onYjsUpdate?: (base64: string) => void;
  onYjsState?: (base64: string) => void;
}

export function useInterviewSocket({
  interviewId,
  onCodeSync,
  onSessionStatus,
  onChatMessage,
  onCodeResult,
  onCursorUpdate,
  onSessionFlag,
  onYjsUpdate,
  onYjsState,
}: UseInterviewSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const everConnectedRef = useRef(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const mountedRef = useRef(true);
  const cursorThrottleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCursor = useRef<{ line: number; column: number } | null>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  };

  const getBackoffDelay = (attempt: number) =>
    Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const token = getToken();
    const url = `${WS_BASE}/api/v1/ws/interviews/${interviewId}${token ? `?token=${token}` : ''}`;

    setSocketStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      const wasReconnect = everConnectedRef.current;
      everConnectedRef.current = true;
      attemptRef.current = 0;
      setSocketStatus('connected');
      ws.send(JSON.stringify({ event: 'session:join' }));
      if (wasReconnect) {
        toast.success('Reconnected!', { id: 'ws-reconnect' });
        ws.send(JSON.stringify({ event: 'session:reconnect' }));
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        const { event: evt } = data;

        if (evt === 'code:sync') {
          onCodeSync?.(data.code, data.language);
        } else if (evt === 'session:status') {
          onSessionStatus?.(data.status);
        } else if (evt === 'chat:message') {
          onChatMessage?.(data.content, data.sender_type);
        } else if (evt === 'code:result') {
          onCodeResult?.(data.result);
        } else if (evt === 'cursor:update') {
          onCursorUpdate?.(data.user_id ?? null, data.line, data.column);
        } else if (evt === 'session:flag') {
          onSessionFlag?.(data.flag_type, data.meta ?? {});
        } else if (evt === 'yjs:update') {
          onYjsUpdate?.(data.update);
        } else if (evt === 'yjs:state') {
          onYjsState?.(data.state);
        } else if (evt === 'session:reconnect') {
          if (data.yjs_state) {
            onYjsState?.(data.yjs_state);
          } else if (data.current_code) {
            onCodeSync?.(data.current_code, data.language ?? 'python');
          }
          if (data.status) onSessionStatus?.(data.status);
        } else if (evt === 'session:join' && data.yjs_state) {
          // Late joiner — apply server's full Yjs snapshot
          onYjsState?.(data.yjs_state);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = (e) => {
      if (!mountedRef.current) return;
      setSocketStatus('disconnected');

      // Don't reconnect on intentional close or auth failure
      if (e.code === 1000 || e.code === 4003 || e.code === 4004) return;

      const delay = getBackoffDelay(attemptRef.current);
      attemptRef.current += 1;

      if (attemptRef.current === 1 && everConnectedRef.current) {
        toast.warning(`Connection lost. Reconnecting in ${Math.round(delay / 1000)}s…`, { id: 'ws-reconnect' });
      }

      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setSocketStatus('error');
    };
  }, [interviewId, onCodeSync, onSessionStatus, onChatMessage, onCodeResult, onCursorUpdate, onSessionFlag, onYjsUpdate, onYjsState]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (cursorThrottleTimer.current) clearTimeout(cursorThrottleTimer.current);
      const ws = wsRef.current;
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'session:leave' }));
          ws.close(1000);
        } else {
          ws.close();
        }
      }
      toast.dismiss('ws-reconnect');
    };
  }, [connect]);

  const sendCodeUpdate = useCallback((code: string, language: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'code:update', code, language }));
    }
  }, []);

  const sendChatMessage = useCallback((content: string, senderType = 'CANDIDATE') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'chat:message', content, sender_type: senderType }));
    }
  }, []);

  const sendCodeResult = useCallback((result: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'code:result', result }));
    }
  }, []);

  const sendSubmit = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'session:submit' }));
    }
  }, []);

  // Throttled cursor update — buffers rapid movements, flushes at CURSOR_THROTTLE_MS
  const sendCursorUpdate = useCallback((line: number, column: number) => {
    pendingCursor.current = { line, column };
    if (cursorThrottleTimer.current) return;
    cursorThrottleTimer.current = setTimeout(() => {
      cursorThrottleTimer.current = null;
      const cursor = pendingCursor.current;
      if (cursor && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: 'cursor:update', line: cursor.line, column: cursor.column }));
      }
    }, CURSOR_THROTTLE_MS);
  }, []);

  const sendSessionFlag = useCallback((flagType: string, meta: object = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'session:flag', flag_type: flagType, meta }));
    }
  }, []);

  const sendYjsUpdate = useCallback((base64: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'yjs:update', update: base64 }));
    }
  }, []);

  return { socketStatus, sendCodeUpdate, sendChatMessage, sendCodeResult, sendSubmit, sendCursorUpdate, sendSessionFlag, sendYjsUpdate };
}
