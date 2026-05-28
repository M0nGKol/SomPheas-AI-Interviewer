'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wifi, WifiOff } from 'lucide-react';

import { interviewsApi, type Interview } from '@/lib/api/interviews';
import { codeApi, type CodeRunResponse } from '@/lib/api/code';
import type { Problem } from '@/lib/api/problems';
import { useInterviewSocket } from '@/hooks/use-interview-socket';

import { InterviewHeader } from './InterviewHeader';
import { ProblemPanel } from './ProblemPanel';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { LanguageSelector } from '@/components/editor/LanguageSelector';
import { RunCodeButton } from '@/components/editor/RunCodeButton';
import { OutputConsole } from '@/components/editor/OutputConsole';
import { AIChatPanel } from '@/components/chat/AIChatPanel';

const AUTOSAVE_DEBOUNCE_MS = 2000;
const WS_CODE_DEBOUNCE_MS = 1000;

interface InterviewRoomProps {
  interview: Interview;
  problem: Problem | null | undefined;
  problemLoading: boolean;
  initialCode: string;
}

export function InterviewRoom({ interview, problem, problemLoading, initialCode }: InterviewRoomProps) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(interview.language ?? 'python');
  const [output, setOutput] = useState<CodeRunResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsCodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  codeRef.current = code;
  languageRef.current = language;

  const isActive = interview.status === 'IN_PROGRESS';
  const isReadOnly = !isActive;

  // WebSocket integration
  const { socketStatus, sendCodeUpdate, sendCodeResult } = useInterviewSocket({
    interviewId: interview.id,
    onCodeSync: useCallback((syncedCode: string, syncedLang: string) => {
      // Only apply remote sync if not currently editing (simple approach)
      setCode(syncedCode);
      setLanguage(syncedLang);
    }, []),
    onSessionStatus: useCallback((newStatus: string) => {
      if (newStatus === 'SUBMITTED' || newStatus === 'COMPLETED') {
        queryClient.invalidateQueries({ queryKey: ['interview', interview.id] });
      }
    }, [interview.id, queryClient]),
  });

  const submitMutation = useMutation({
    mutationFn: () => interviewsApi.submit(interview.id, code),
    onSuccess: (updated) => {
      queryClient.setQueryData(['interview', interview.id], updated);
      toast.success('Interview submitted successfully!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    setSaveStatus('unsaved');

    // Autosave to DB
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      if (!isActive) return;
      try {
        setSaveStatus('saving');
        await codeApi.saveCode(interview.id, { language: languageRef.current, code: newCode });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    // Broadcast via WebSocket (debounced)
    if (wsCodeTimer.current) clearTimeout(wsCodeTimer.current);
    wsCodeTimer.current = setTimeout(() => {
      if (isActive) sendCodeUpdate(newCode, languageRef.current);
    }, WS_CODE_DEBOUNCE_MS);
  }, [interview.id, isActive, sendCodeUpdate]);

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
  }, []);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput(null);
    try {
      const result = await codeApi.runCode(interview.id, { language, code });
      setOutput(result);
      sendCodeResult(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to run code');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = () => {
    if (!confirm('Submit your solution? This will mark the interview as submitted.')) return;
    submitMutation.mutate();
  };

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (wsCodeTimer.current) clearTimeout(wsCodeTimer.current);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <InterviewHeader
        interview={interview}
        onSubmit={handleSubmit}
        isSubmitting={submitMutation.isPending}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left: Problem panel */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Problem
          </div>
          <div className="flex-1 overflow-y-auto">
            <ProblemPanel problem={problem} loading={problemLoading} />
          </div>
        </div>

        {/* Center: Editor + Output */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Editor toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-zinc-950 shrink-0">
            <LanguageSelector
              value={language}
              onChange={handleLanguageChange}
              disabled={isReadOnly}
            />
            <div className="ml-auto flex items-center gap-2">
              {/* WS status indicator */}
              {socketStatus === 'connected' ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-muted-foreground" />
              )}
              {isActive && (
                <span className="text-xs text-muted-foreground">
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : '● Unsaved'}
                </span>
              )}
              <RunCodeButton onClick={handleRun} isRunning={isRunning} disabled={isReadOnly} />
            </div>
          </div>

          {/* Editor + Output pane split */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <CodeEditor
                value={code}
                language={language}
                onChange={handleCodeChange}
                readOnly={isReadOnly}
              />
            </div>
            <div className="h-48 shrink-0 border-t border-border">
              <OutputConsole output={output} isRunning={isRunning} />
            </div>
          </div>
        </div>

        {/* Right: AI Chat */}
        <div className="w-72 shrink-0 border-l border-border flex flex-col min-h-0">
          <AIChatPanel
            interviewId={interview.id}
            currentCode={code}
            language={language}
            lastExecutionResult={output}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
