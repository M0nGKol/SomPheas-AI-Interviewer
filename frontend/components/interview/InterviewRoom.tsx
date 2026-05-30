'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wifi, WifiOff, AlertTriangle, Video, VideoOff, Monitor, MonitorOff, Bug } from 'lucide-react';

import { interviewsApi, type Interview, type LiveKitTokenResponse } from '@/lib/api/interviews';
import { codeApi, type CodeRunResponse } from '@/lib/api/code';
import type { Problem } from '@/lib/api/problems';
import { useInterviewSocket } from '@/hooks/use-interview-socket';
import { useYjsEditor } from '@/hooks/use-yjs-editor';

import { InterviewHeader } from './InterviewHeader';
import { ProblemPanel } from './ProblemPanel';
import { CodeEditor, type RemoteCursor } from '@/components/editor/CodeEditor';
import { LanguageSelector, canExecuteLanguage } from '@/components/editor/LanguageSelector';
import { RunCodeButton } from '@/components/editor/RunCodeButton';
import { OutputConsole } from '@/components/editor/OutputConsole';
import { AIChatPanel } from '@/components/chat/AIChatPanel';
import { VoiceVideoRoom } from './voice-video-simple';
import { DebugPanel, useDebugDecorations } from './DebugPanel';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth-store';

const AUTOSAVE_DEBOUNCE_MS = 2000;

// ---------------------------------------------------------------------------
// Screen Share Preview — small floating thumbnail of the local screen stream
// ---------------------------------------------------------------------------
function ScreenSharePreview({ stream, onStop }: { stream: MediaStream; onStop: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="absolute bottom-4 left-4 z-50 rounded-xl overflow-hidden shadow-2xl border border-border bg-background w-56">
      <div className="flex items-center justify-between px-2 py-1 bg-muted text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Monitor className="h-3 w-3 text-green-500" />
          Screen sharing
        </span>
        <button onClick={onStop} className="hover:text-destructive transition-colors text-xs">
          Stop
        </button>
      </div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full aspect-video object-contain bg-black"
      />
    </div>
  );
}
const WS_CODE_DEBOUNCE_MS = 1000;

interface InterviewRoomProps {
  interview: Interview;
  problem: Problem | null | undefined;
  problemLoading: boolean;
  initialCode: string;
}

export function InterviewRoom({ interview, problem, problemLoading, initialCode }: InterviewRoomProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(interview.language ?? 'python');
  const [output, setOutput] = useState<CodeRunResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [remoteCursor, setRemoteCursor] = useState<RemoteCursor | null>(null);
  const [flagCount, setFlagCount] = useState(0);

  // Video call state
  const [videoSession, setVideoSession] = useState<LiveKitTokenResponse | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoEditorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef = useRef<any>(null);

  // Screen sharing state
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  // Holds a ref to the LiveKit Room instance once video is connected
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const livekitRoomRef = useRef<any>(null);

  const isActive = interview.status === 'IN_PROGRESS';

  // Ref bridge: lets useYjsEditor call sendYjsUpdate before the socket hook runs
  const sendYjsUpdateRef = useRef<((b64: string) => void) | null>(null);

  // Yjs collaborative editing
  const yjsEditor = useYjsEditor({
    initialCode,
    language,
    onUpdate: useCallback((base64: string) => {
      if (isActive) sendYjsUpdateRef.current?.(base64);
    }, [isActive]),
  });
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsCodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  codeRef.current = code;
  languageRef.current = language;

  const isReadOnly = !isActive;

  // WebSocket integration
  const { socketStatus, sendCodeUpdate, sendCodeResult, sendCursorUpdate, sendSessionFlag, sendYjsUpdate } = useInterviewSocket({
    interviewId: interview.id,
    onCodeSync: useCallback((syncedCode: string, syncedLang: string) => {
      setCode(syncedCode);
      setLanguage(syncedLang);
    }, []),
    onSessionStatus: useCallback((newStatus: string) => {
      if (newStatus === 'SUBMITTED' || newStatus === 'COMPLETED') {
        queryClient.invalidateQueries({ queryKey: ['interview', interview.id] });
      }
    }, [interview.id, queryClient]),
    onCursorUpdate: useCallback((_userId: number | null, line: number, column: number) => {
      setRemoteCursor({ line, column, label: 'Interviewer' });
    }, []),
    onSessionFlag: useCallback((flagType: string) => {
      setFlagCount((n) => n + 1);
      toast.warning(`⚠️ ${flagType === 'LARGE_PASTE' ? 'Large paste detected' : 'Suspicious activity detected'}`, {
        id: `flag-${Date.now()}`,
        duration: 4000,
      });
    }, []),
    onYjsUpdate: yjsEditor.applyRemoteUpdate,
    onYjsState: yjsEditor.applyStateSnapshot,
  });

  // Keep the ref in sync so yjsEditor.onUpdate can call sendYjsUpdate
  useEffect(() => {
    sendYjsUpdateRef.current = sendYjsUpdate;
  }, [sendYjsUpdate]);

  // Apply breakpoint decorations. We pass the refs' current values; the hook
  // sets up its own Y.observe so decorations update reactively when breakpoints change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useDebugDecorations(yjsEditor.yBreakpoints, monacoEditorRef.current, monacoRef.current);

  // Capture the Monaco editor instance when CodeEditor mounts
  const handleEditorMount = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (editor: any, monaco: any) => {
      monacoEditorRef.current = editor;
      monacoRef.current = monaco;
      await yjsEditor.bind(editor, monaco);
    },
    [yjsEditor],
  );

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

  const handleCursorChange = useCallback((line: number, column: number) => {
    if (isActive) sendCursorUpdate(line, column);
  }, [isActive, sendCursorUpdate]);

  const handlePasteDetected = useCallback((charsAdded: number) => {
    if (isActive) {
      sendSessionFlag('LARGE_PASTE', { chars_added: charsAdded });
    }
  }, [isActive, sendSessionFlag]);

  // Screen sharing
  const handleToggleScreenShare = async () => {
    if (isSharing) {
      // Stop sharing
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      // Unpublish from LiveKit room if connected
      if (livekitRoomRef.current) {
        try {
          const { LocalVideoTrack } = await import('livekit-client');
          const publications = livekitRoomRef.current.localParticipant?.videoTrackPublications;
          publications?.forEach((pub: { source: string; track?: { kind: string }; stop?: () => void; unpublish?: () => void }) => {
            if (pub.source === 'screen_share') {
              pub.stop?.();
            }
          });
        } catch { /* ignore */ }
      }
      setIsSharing(false);
      toast.info('Screen sharing stopped');
      return;
    }

    try {
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      screenTrackRef.current = track;
      setScreenStream(stream);

      // If LiveKit room is available, publish the screen track
      if (livekitRoomRef.current) {
        try {
          const { LocalVideoTrack, Track } = await import('livekit-client');
          const lkTrack = new LocalVideoTrack(track, undefined, false);
          await livekitRoomRef.current.localParticipant.publishTrack(lkTrack, {
            source: Track.Source.ScreenShare,
            name: 'screen',
          });
        } catch (publishErr) {
          logger: console.warn('LiveKit screen publish failed:', publishErr);
        }
      }

      setIsSharing(true);
      toast.success('Screen sharing started');

      // Auto-stop when user clicks "Stop sharing" in browser UI
      track.addEventListener('ended', () => {
        setIsSharing(false);
        setScreenStream(null);
        screenTrackRef.current = null;
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        toast.error('Could not start screen sharing');
      }
    }
  };

  // Start / stop video call
  const handleToggleVideo = async () => {
    if (videoOpen) {
      setVideoOpen(false);
      return;
    }
    if (videoSession) {
      setVideoOpen(true);
      return;
    }
    setVideoLoading(true);
    try {
      const session = await interviewsApi.getLiveKitToken(interview.id);
      setVideoSession(session);
      setVideoOpen(true);
    } catch {
      toast.error('Could not start video call. Check LiveKit configuration.');
    } finally {
      setVideoLoading(false);
    }
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

      <div className="flex-1 flex min-h-0 relative">
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
              {flagCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-orange-400 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  {flagCount} flag{flagCount !== 1 ? 's' : ''}
                </span>
              )}
              {/* Debug mode toggle */}
              <Button
                variant={debugMode ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-1.5 text-xs"
                onClick={() => setDebugMode((v) => !v)}
                title="Collaborative debugging"
              >
                <Bug className="h-3.5 w-3.5" />
                {debugMode ? 'Debug On' : 'Debug'}
              </Button>
              {/* Screen share toggle */}
              <Button
                variant={isSharing ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-1.5 text-xs"
                onClick={handleToggleScreenShare}
                title={isSharing ? 'Stop screen sharing' : 'Share screen'}
              >
                {isSharing ? (
                  <MonitorOff className="h-3.5 w-3.5" />
                ) : (
                  <Monitor className="h-3.5 w-3.5" />
                )}
                {isSharing ? 'Stop Share' : 'Share'}
              </Button>
              {/* Video call toggle */}
              <Button
                variant={videoOpen ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 gap-1.5 text-xs"
                onClick={handleToggleVideo}
                disabled={videoLoading}
              >
                {videoLoading ? (
                  <Wifi className="h-3.5 w-3.5 animate-pulse" />
                ) : videoOpen ? (
                  <VideoOff className="h-3.5 w-3.5" />
                ) : (
                  <Video className="h-3.5 w-3.5" />
                )}
                {videoOpen ? 'End Video' : 'Video'}
              </Button>
              <RunCodeButton onClick={handleRun} isRunning={isRunning} disabled={isReadOnly} canExecute={canExecuteLanguage(language)} />
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
                onCursorChange={handleCursorChange}
                onPasteDetected={handlePasteDetected}
                remoteCursor={remoteCursor}
                onEditorMount={handleEditorMount}
              />
            </div>
            <div className="h-48 shrink-0 border-t border-border">
              <OutputConsole output={output} isRunning={isRunning} />
            </div>
          </div>
        </div>

        {/* Right: AI Chat + optional Debug panel */}
        <div className="flex shrink-0 border-l border-border min-h-0">
          {debugMode && (
            <div className="w-56 shrink-0 border-r border-border flex flex-col min-h-0 overflow-hidden">
              <DebugPanel
                yBreakpoints={yjsEditor.yBreakpoints}
                editor={monacoEditorRef.current}
                monaco={monacoRef.current}
                author={user?.full_name || user?.email || 'You'}
                enabled={debugMode}
              />
            </div>
          )}
          <div className="w-72 shrink-0 flex flex-col min-h-0">
            <AIChatPanel
              interviewId={interview.id}
              currentCode={code}
              language={language}
              lastExecutionResult={output}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>

        {/* Screen share local preview — shown when sharing */}
        {isSharing && screenStream && (
          <ScreenSharePreview stream={screenStream} onStop={handleToggleScreenShare} />
        )}

        {/* Floating video panel — shown when videoOpen */}
        {videoOpen && videoSession && (
          <div className="absolute bottom-4 right-80 z-50 w-80 rounded-xl overflow-hidden shadow-2xl border border-border bg-background">
            <VoiceVideoRoom
              token={videoSession.livekit_token}
              serverUrl={videoSession.livekit_url}
              roomName={videoSession.room_name}
              userName="Me"
              onDisconnect={() => setVideoOpen(false)}
              onError={(err) => {
                toast.error(`Video error: ${err.message}`);
                setVideoOpen(false);
              }}
              onRoomReady={(room) => { livekitRoomRef.current = room; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
