'use client';

import { Terminal, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { CodeRunResponse } from '@/lib/api/code';

interface OutputConsoleProps {
  output: CodeRunResponse | null;
  isRunning: boolean;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  SUCCESS:      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  ERROR:        <XCircle className="h-3.5 w-3.5 text-red-500" />,
  RUNTIME_ERROR:<XCircle className="h-3.5 w-3.5 text-red-500" />,
  TIMEOUT:      <Clock className="h-3.5 w-3.5 text-yellow-500" />,
};

export function OutputConsole({ output, isRunning }: OutputConsoleProps) {
  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 font-mono text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 shrink-0">
        <Terminal className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-zinc-400 font-sans font-medium text-xs">Output</span>
        {output && (
          <div className="ml-auto flex items-center gap-2">
            {STATUS_ICONS[output.status] ?? <AlertTriangle className="h-3.5 w-3.5 text-zinc-400" />}
            <span className="text-zinc-400">{output.status}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">{output.runtime_ms}ms</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isRunning && (
          <p className="text-zinc-400 animate-pulse">Running...</p>
        )}

        {!isRunning && !output && (
          <p className="text-zinc-600">Click Run to execute your code.</p>
        )}

        {!isRunning && output && (
          <>
            {output.stdout && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">stdout</p>
                <pre className="whitespace-pre-wrap text-zinc-100">{output.stdout}</pre>
              </div>
            )}
            {output.stderr && (
              <div>
                <p className="text-zinc-500 text-xs mb-1">stderr</p>
                <pre className="whitespace-pre-wrap text-red-400">{output.stderr}</pre>
              </div>
            )}
            {!output.stdout && !output.stderr && (
              <p className="text-zinc-500">(no output)</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
