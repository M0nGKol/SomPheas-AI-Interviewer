'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY = 3000;

type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseInterviewSocketOptions {
  interviewId: number;
  onCodeSync?: (code: string, language: string) => void;
  onSessionStatus?: (status: string) => void;
  onChatMessage?: (content: string, senderType: string) => void;
  onCodeResult?: (result: object) => void;
}

export function useInterviewSocket({
  interviewId,
  onCodeSync,
  onSessionStatus,
  onChatMessage,
  onCodeResult,
}: UseInterviewSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const mountedRef = useRef(true);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  };

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const token = getToken();
    const url = `${WS_BASE}/api/v1/ws/interviews/${interviewId}${token ? `?token=${token}` : ''}`;

    setSocketStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setSocketStatus('connected');
      ws.send(JSON.stringify({ event: 'session:join' }));
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
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setSocketStatus('disconnected');
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setSocketStatus('error');
    };
  }, [interviewId, onCodeSync, onSessionStatus, onChatMessage, onCodeResult]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      const ws = wsRef.current;
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'session:leave' }));
        }
        ws.close();
      }
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

  return { socketStatus, sendCodeUpdate, sendChatMessage, sendCodeResult, sendSubmit };
}
