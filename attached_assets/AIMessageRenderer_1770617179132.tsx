/**
 * PCB Auto — AI Message Renderer
 * 
 * Parses AI assistant responses and converts [[nav:key]] tokens
 * into tappable NavLink components that navigate to app sections.
 */

import { type ReactNode } from 'react';
import { getNavTarget } from './navMap';

interface NavLinkProps {
  navKey: string;
  onNavigate: (key: string) => void;
}

/**
 * Inline tappable navigation pill.
 * Rendered inside AI response bubbles wherever [[nav:key]] appears.
 */
function NavLink({ navKey, onNavigate }: NavLinkProps) {
  const target = getNavTarget(navKey);
  if (!target) return <span className="text-slate-400">[{navKey}]</span>;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(navKey);
      }}
      className="
        inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5
        text-blue-600 font-semibold text-[13px] leading-tight
        bg-blue-50 hover:bg-blue-100 active:bg-blue-200
        border-b-[1.5px] border-blue-300 hover:border-blue-500
        rounded transition-all duration-150 cursor-pointer
        whitespace-nowrap
      "
      title={`Go to ${target.label}`}
    >
      <span className="text-[11px] opacity-70">→</span>
      {target.label}
    </button>
  );
}

/**
 * Parse a raw AI response string and return React nodes.
 * 
 * Handles:
 * - [[nav:key]] → NavLink component
 * - **bold** → <strong>
 * - \n → <br>
 * - • bullets preserved
 */
export function renderAIMessage(
  raw: string,
  onNavigate: (key: string) => void
): ReactNode[] {
  const nodes: ReactNode[] = [];
  
  // Split by lines first for proper line break handling
  const lines = raw.split('\n');

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      nodes.push(<br key={`br-${lineIdx}`} />);
    }

    // Regex to find [[nav:key]] and **bold** tokens
    const tokenPattern = /(\[\[nav:([a-z0-9-]+)\]\]|\*\*(.+?)\*\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(line)) !== null) {
      // Add text before this match
      if (match.index > lastIndex) {
        nodes.push(
          <span key={`t-${lineIdx}-${lastIndex}`}>
            {line.slice(lastIndex, match.index)}
          </span>
        );
      }

      if (match[2]) {
        // Navigation link: [[nav:key]]
        nodes.push(
          <NavLink
            key={`nav-${lineIdx}-${match.index}`}
            navKey={match[2]}
            onNavigate={onNavigate}
          />
        );
      } else if (match[3]) {
        // Bold text: **text**
        nodes.push(
          <strong key={`b-${lineIdx}-${match.index}`} className="font-semibold">
            {match[3]}
          </strong>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (lastIndex < line.length) {
      nodes.push(
        <span key={`t-${lineIdx}-end`}>
          {line.slice(lastIndex)}
        </span>
      );
    }
  });

  return nodes;
}
