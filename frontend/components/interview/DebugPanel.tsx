'use client';

/**
 * DebugPanel — collaborative breakpoints and inline comments via Yjs.
 *
 * Interviewers (or candidates) can:
 *  - Click gutter line numbers in Monaco to place/remove a breakpoint
 *  - Add a comment to any breakpoint
 *  - All changes sync in real-time to the other participant via the shared Y.Map
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { Bug, Trash2, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Breakpoint } from '@/hooks/use-yjs-editor';

// Colours to cycle through for different authors
const AUTHOR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
function authorColor(author: string): string {
  let hash = 0;
  for (let i = 0; i < author.length; i++) hash = (hash * 31 + author.charCodeAt(i)) & 0xffff;
  return AUTHOR_COLORS[hash % AUTHOR_COLORS.length];
}

interface DebugPanelProps {
  yBreakpoints: Y.Map<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monaco: any | null;
  author: string;       // display name of the current user
  enabled: boolean;     // debug mode toggle
}

export function useDebugDecorations(
  yBreakpoints: Y.Map<string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  monaco: any | null,
) {
  const decorationsRef = useRef<string[]>([]);

  const refresh = useCallback(() => {
    if (!editor || !monaco) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newDecorations: any[] = [];

    yBreakpoints.forEach((raw) => {
      try {
        const bp: Breakpoint = JSON.parse(raw);
        // Red gutter dot
        newDecorations.push({
          range: new monaco.Range(bp.line, 1, bp.line, 1),
          options: {
            isWholeLine: true,
            className: 'yjs-breakpoint-line',
            glyphMarginClassName: 'yjs-breakpoint-glyph',
            glyphMarginHoverMessage: {
              value: `**Breakpoint** by *${bp.author}*${bp.comment ? `\n\n${bp.comment}` : ''}`,
            },
            overviewRuler: { color: bp.color, position: monaco.editor.OverviewRulerLane.Left },
          },
        });
        // Inline comment decoration
        if (bp.comment) {
          newDecorations.push({
            range: new monaco.Range(bp.line, 1, bp.line, 1),
            options: {
              after: {
                content: `  // 🔴 ${bp.author}: ${bp.comment}`,
                inlineClassName: 'yjs-breakpoint-comment',
              },
            },
          });
        }
      } catch { /* invalid JSON */ }
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [yBreakpoints, editor, monaco]);

  useEffect(() => {
    if (!yBreakpoints) return;
    yBreakpoints.observe(refresh);
    refresh();
    return () => yBreakpoints.unobserve(refresh);
  }, [yBreakpoints, refresh]);

  // Inject CSS once
  useEffect(() => {
    const id = 'yjs-debug-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .yjs-breakpoint-line { background: rgba(239, 68, 68, 0.08) !important; }
      .yjs-breakpoint-glyph::before {
        content: '●';
        color: #ef4444;
        font-size: 14px;
        line-height: 1;
      }
      .yjs-breakpoint-comment {
        color: #ef4444;
        font-style: italic;
        opacity: 0.85;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

export function DebugPanel({ yBreakpoints, editor, monaco, author, enabled }: DebugPanelProps) {
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  // Sync local state from Yjs map
  useEffect(() => {
    const sync = () => {
      const bps: Breakpoint[] = [];
      yBreakpoints.forEach((raw) => {
        try { bps.push(JSON.parse(raw)); } catch { /* skip */ }
      });
      setBreakpoints(bps.sort((a, b) => a.line - b.line));
    };
    yBreakpoints.observe(sync);
    sync();
    return () => yBreakpoints.unobserve(sync);
  }, [yBreakpoints]);

  // Click on gutter to toggle breakpoint
  useEffect(() => {
    if (!editor || !enabled) return;
    const disposable = editor.onMouseDown((e) => {
      // Only react to gutter margin clicks
      if (
        e.target.type !== 2 /* GUTTER_GLYPH_MARGIN */ &&
        e.target.type !== 3 /* GUTTER_LINE_NUMBERS */
      ) return;
      const line = e.target.position?.lineNumber;
      if (!line) return;
      const key = `${line}:${author}`;
      if (yBreakpoints.has(key)) {
        yBreakpoints.delete(key);
      } else {
        const bp: Breakpoint = { line, author, comment: '', color: authorColor(author) };
        yBreakpoints.set(key, JSON.stringify(bp));
      }
    });
    return () => disposable.dispose();
  }, [editor, enabled, author, yBreakpoints]);

  const removeBreakpoint = (key: string) => {
    yBreakpoints.delete(key);
    if (editingKey === key) setEditingKey(null);
  };

  const saveComment = (key: string) => {
    const raw = yBreakpoints.get(key);
    if (!raw) return;
    const bp: Breakpoint = JSON.parse(raw);
    bp.comment = commentDraft;
    yBreakpoints.set(key, JSON.stringify(bp));
    setEditingKey(null);
    setCommentDraft('');
  };

  const clearAll = () => {
    // Only remove breakpoints by the current author
    const ownKeys: string[] = [];
    yBreakpoints.forEach((_, key) => {
      if (key.endsWith(`:${author}`)) ownKeys.push(key);
    });
    ownKeys.forEach((k) => yBreakpoints.delete(k));
  };

  if (!enabled) return null;

  return (
    <div className="flex flex-col h-full border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Bug className="h-3.5 w-3.5" />
          Debug ({breakpoints.length})
        </div>
        {breakpoints.some((b) => b.author === author) && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={clearAll}>
            Clear mine
          </Button>
        )}
      </div>

      {/* Hint */}
      <p className="px-3 py-2 text-xs text-muted-foreground border-b border-border shrink-0">
        Click a line number in the editor to add a breakpoint.
      </p>

      {/* Breakpoint list */}
      <div className="flex-1 overflow-y-auto">
        {breakpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground gap-2">
            <Bug className="h-8 w-8 opacity-30" />
            <p className="text-xs">No breakpoints yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {breakpoints.map((bp) => {
              const key = `${bp.line}:${bp.author}`;
              const isEditing = editingKey === key;
              const isOwn = bp.author === author;
              return (
                <li key={key} className="px-3 py-2 text-xs group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="shrink-0 h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: bp.color }}
                      />
                      <span className="font-mono font-semibold">L{bp.line}</span>
                      <span className="text-muted-foreground truncate">{bp.author}</span>
                    </div>
                    <div className={cn('flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity', isEditing && 'opacity-100')}>
                      {isOwn && (
                        <button
                          onClick={() => {
                            setEditingKey(isEditing ? null : key);
                            setCommentDraft(bp.comment);
                          }}
                          className="hover:text-primary transition-colors"
                          title="Add comment"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isOwn && (
                        <button
                          onClick={() => removeBreakpoint(key)}
                          className="hover:text-destructive transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {bp.comment && !isEditing && (
                    <p className="mt-1 pl-4 text-muted-foreground italic truncate">{bp.comment}</p>
                  )}
                  {isEditing && (
                    <div className="mt-1.5 flex gap-1">
                      <Input
                        className="h-6 text-xs"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Add comment…"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveComment(key); if (e.key === 'Escape') setEditingKey(null); }}
                        autoFocus
                      />
                      <Button size="sm" className="h-6 px-2 text-xs" onClick={() => saveComment(key)}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingKey(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
