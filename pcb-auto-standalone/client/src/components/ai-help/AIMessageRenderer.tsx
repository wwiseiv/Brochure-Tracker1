import { type ReactNode } from 'react';
import { getNavTarget } from './navMap';

interface NavLinkProps {
  navKey: string;
  onNavigate: (key: string) => void;
}

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
        bg-blue-50 hover-elevate active-elevate-2
        border-b-[1.5px] border-blue-300 hover:border-blue-500
        rounded transition-all duration-150 cursor-pointer
        whitespace-nowrap overflow-visible
      "
      title={`Go to ${target.label}`}
      data-testid={`navlink-${navKey}`}
    >
      <span className="text-[11px] opacity-70">&rarr;</span>
      {target.label}
    </button>
  );
}

export function renderAIMessage(
  raw: string,
  onNavigate: (key: string) => void
): ReactNode[] {
  const nodes: ReactNode[] = [];

  const lines = raw.split('\n');

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      nodes.push(<br key={`br-${lineIdx}`} />);
    }

    const tokenPattern = /(\[\[nav:([a-z0-9-]+)\]\]|\*\*(.+?)\*\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(
          <span key={`t-${lineIdx}-${lastIndex}`}>
            {line.slice(lastIndex, match.index)}
          </span>
        );
      }

      if (match[2]) {
        nodes.push(
          <NavLink
            key={`nav-${lineIdx}-${match.index}`}
            navKey={match[2]}
            onNavigate={onNavigate}
          />
        );
      } else if (match[3]) {
        nodes.push(
          <strong key={`b-${lineIdx}-${match.index}`} className="font-semibold">
            {match[3]}
          </strong>
        );
      }

      lastIndex = match.index + match[0].length;
    }

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
