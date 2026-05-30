/**
 * Lightweight markdown renderer — no extra deps.
 * Handles the subset used in seed problems:
 *   **bold**, `inline code`, ```code blocks```, bullet/numbered lists, blank lines.
 */

import React from 'react';

function inlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

export function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split('\n');
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={key++} className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto my-2 whitespace-pre-wrap">
          {codeLines.join('\n')}
        </pre>
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*] /.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*] /, ''));
        i++;
      }
      nodes.push(
        <ul key={key++} className="list-disc list-inside space-y-0.5 my-1 text-sm">
          {items.map((item, idx) => <li key={idx}>{inlineMarkdown(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\. /, ''));
        i++;
      }
      nodes.push(
        <ol key={key++} className="list-decimal list-inside space-y-0.5 my-1 text-sm">
          {items.map((item, idx) => <li key={idx}>{inlineMarkdown(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      nodes.push(<div key={key++} className="h-2" />);
      i++;
      continue;
    }

    // Normal line
    nodes.push(
      <p key={key++} className="text-sm leading-relaxed">
        {inlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return nodes;
}
