'use client';

import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { getMonacoLanguage } from './LanguageSelector';

export interface RemoteCursor {
  line: number;    // 1-based
  column: number;  // 1-based
  label?: string;
}

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  onCursorChange?: (line: number, column: number) => void;
  onPasteDetected?: (charsAdded: number) => void;
  remoteCursor?: RemoteCursor | null;
  /** If provided, CodeEditor will call this to bind Yjs MonacoBinding */
  onEditorMount?: (editor: Parameters<OnMount>[0], monaco: Parameters<OnMount>[1]) => void;
}

export function CodeEditor({
  value,
  language,
  onChange,
  readOnly,
  onCursorChange,
  onPasteDetected,
  remoteCursor,
  onEditorMount,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const prevValueRef = useRef(value);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    onEditorMount?.(editor, monaco);

    // Cursor position broadcast
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });

    // Paste detection — compare value before and after paste event
    editor.onDidPaste(() => {
      const newVal = editor.getValue();
      const charsAdded = newVal.length - prevValueRef.current.length;
      if (charsAdded > 50) {
        onPasteDetected?.(charsAdded);
      }
      prevValueRef.current = newVal;
    });
  };

  const handleChange = useCallback(
    (val: string | undefined) => {
      const newVal = val ?? '';
      prevValueRef.current = newVal;
      onChange(newVal);
    },
    [onChange]
  );

  // Render remote cursor as Monaco line decoration
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (!remoteCursor) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    const { line, column, label = 'Interviewer' } = remoteCursor;

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      // Full line highlight
      {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: 'remote-cursor-line',
          overviewRuler: {
            color: '#f97316',
            position: monaco.editor.OverviewRulerLane.Right,
          },
        },
      },
      // Cursor column marker
      {
        range: new monaco.Range(line, column, line, column + 1),
        options: {
          className: 'remote-cursor-caret',
          beforeContentClassName: 'remote-cursor-before',
          hoverMessage: { value: `📍 ${label}` },
        },
      },
    ]);
  }, [remoteCursor]);

  return (
    <>
      <style>{`
        .remote-cursor-line { background: rgba(249,115,22,0.08); }
        .remote-cursor-caret { border-left: 2px solid #f97316; }
        .remote-cursor-before {
          content: '';
          display: inline-block;
          width: 0;
          border-left: 2px solid #f97316;
        }
      `}</style>
      <Editor
        height="100%"
        language={getMonacoLanguage(language)}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          readOnly: readOnly,
          padding: { top: 8, bottom: 8 },
          lineNumbers: 'on',
          folding: false,
          renderLineHighlight: 'line',
          tabSize: 4,
          insertSpaces: true,
        }}
      />
    </>
  );
}
