'use client';

import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RunCodeButtonProps {
  onClick: () => void;
  isRunning: boolean;
  disabled?: boolean;
  canExecute?: boolean;
}

export function RunCodeButton({ onClick, isRunning, disabled, canExecute = true }: RunCodeButtonProps) {
  const isDisabled = isRunning || disabled || !canExecute;
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={onClick}
      disabled={isDisabled}
      title={!canExecute ? 'Execution not supported for this language' : undefined}
      className="h-7 text-xs"
    >
      {isRunning ? (
        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Running…</>
      ) : (
        <><Play className="mr-1.5 h-3.5 w-3.5" />{canExecute ? 'Run' : 'Run (N/A)'}</>
      )}
    </Button>
  );
}
