'use client';

import { Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RunCodeButtonProps {
  onClick: () => void;
  isRunning: boolean;
  disabled?: boolean;
}

export function RunCodeButton({ onClick, isRunning, disabled }: RunCodeButtonProps) {
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={onClick}
      disabled={isRunning || disabled}
      className="h-7 text-xs"
    >
      {isRunning ? (
        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Running...</>
      ) : (
        <><Play className="mr-1.5 h-3.5 w-3.5" />Run</>
      )}
    </Button>
  );
}
