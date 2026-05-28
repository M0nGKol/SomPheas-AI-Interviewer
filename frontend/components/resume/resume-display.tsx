'use client';

interface ResumeDisplayProps {
  resumeData: Record<string, unknown>;
  fileName: string;
}

export function ResumeDisplay({ resumeData, fileName }: ResumeDisplayProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">{fileName}</h2>
      <pre className="bg-muted rounded-lg p-4 text-sm overflow-auto whitespace-pre-wrap">
        {JSON.stringify(resumeData, null, 2)}
      </pre>
    </div>
  );
}
