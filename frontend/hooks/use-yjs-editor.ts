'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import type * as Monaco from 'monaco-editor';

type SendYjsUpdate = (update: string) => void;

interface UseYjsEditorOptions {
  onUpdate: SendYjsUpdate;
  initialCode: string;
  language: string;
}

export interface Breakpoint {
  line: number;       // 1-based
  author: string;
  comment: string;    // optional inline comment
  color: string;      // e.g. '#ef4444'
}

export interface YjsEditorHandle {
  yText: Y.Text;
  doc: Y.Doc;
  /** Shared breakpoints map: key = `line:author`, value = Breakpoint JSON string */
  yBreakpoints: Y.Map<string>;
  bind: (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => void;
  unbind: () => void;
  applyRemoteUpdate: (base64: string) => void;
  applyStateSnapshot: (base64: string) => void;
}

export function useYjsEditor({ onUpdate, initialCode }: UseYjsEditorOptions): YjsEditorHandle {
  const docRef = useRef<Y.Doc>(new Y.Doc());
  // Store MonacoBinding instance — type is `any` to avoid importing the class at module level
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bindingRef = useRef<any>(null);
  const initializedRef = useRef(false);

  const doc = docRef.current;
  const yText = doc.getText('code');
  // Shared breakpoints: each entry is JSON-serialised Breakpoint
  const yBreakpoints = doc.getMap<string>('breakpoints');

  // Seed Y.Doc with initialCode once when empty
  useEffect(() => {
    if (!initializedRef.current && yText.length === 0 && initialCode) {
      doc.transact(() => {
        yText.insert(0, initialCode);
      });
    }
    initializedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast local Y.Doc updates
  useEffect(() => {
    const handler = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      const b64 = Buffer.from(update).toString('base64');
      onUpdate(b64);
    };
    doc.on('update', handler);
    return () => doc.off('update', handler);
  }, [doc, onUpdate]);

  // Lazy-load MonacoBinding — avoids the `window is not defined` SSR crash
  const bind = useCallback(async (editor: Monaco.editor.IStandaloneCodeEditor) => {
    if (bindingRef.current) return;
    const model = editor.getModel();
    if (!model) return;
    const { MonacoBinding } = await import('y-monaco');
    bindingRef.current = new MonacoBinding(yText, model, new Set([editor]), null);
  }, [yText]);

  const unbind = useCallback(() => {
    bindingRef.current?.destroy();
    bindingRef.current = null;
  }, []);

  const applyRemoteUpdate = useCallback((base64: string) => {
    try {
      Y.applyUpdate(doc, Uint8Array.from(Buffer.from(base64, 'base64')), 'remote');
    } catch (e) {
      console.warn('Failed to apply Yjs update:', e);
    }
  }, [doc]);

  const applyStateSnapshot = useCallback((base64: string) => {
    try {
      Y.applyUpdate(doc, Uint8Array.from(Buffer.from(base64, 'base64')), 'remote');
    } catch (e) {
      console.warn('Failed to apply Yjs state snapshot:', e);
    }
  }, [doc]);

  useEffect(() => {
    return () => {
      unbind();
      doc.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { yText, doc, yBreakpoints, bind, unbind, applyRemoteUpdate, applyStateSnapshot };
}
