'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Languages with full execution support in the Docker sandbox
const EXECUTABLE_LANGUAGES = ['python', 'javascript'];

const LANGUAGES = [
  { value: 'python',     label: 'Python',     monaco: 'python' },
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { value: 'typescript', label: 'TypeScript', monaco: 'typescript' },
  { value: 'java',       label: 'Java',       monaco: 'java' },
  { value: 'cpp',        label: 'C++',        monaco: 'cpp' },
];

export function getMonacoLanguage(lang: string): string {
  return LANGUAGES.find((l) => l.value === lang)?.monaco ?? 'python';
}

export function canExecuteLanguage(lang: string): boolean {
  return EXECUTABLE_LANGUAGES.includes(lang);
}

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LanguageSelector({ value, onChange, disabled }: LanguageSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-7 w-44 text-xs border-border">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((l) => (
          <SelectItem key={l.value} value={l.value} className="text-xs">
            <span>{l.label}</span>
            {!EXECUTABLE_LANGUAGES.includes(l.value) && (
              <span className="ml-2 text-muted-foreground">(no run)</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
