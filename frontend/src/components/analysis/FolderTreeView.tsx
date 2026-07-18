import type { FolderNode } from '@devguardian/shared';
import { File, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderTreeViewProps {
  node: FolderNode;
  depth?: number;
}

export function FolderTreeView({ node, depth = 0 }: FolderTreeViewProps) {
  const children = node.children ?? [];

  if (depth === 0) {
    return (
      <div className="font-mono text-xs leading-relaxed">
        <div className="mb-2 flex items-center gap-1.5 font-sans text-sm font-medium text-foreground">
          <Folder className="size-3.5 text-primary" />
          {node.name || '/'}
        </div>
        <ul className="space-y-0.5 border-l border-border pl-3">
          {children.map((child) => (
            <FolderTreeView key={child.path || child.name} node={child} depth={1} />
          ))}
        </ul>
      </div>
    );
  }

  if (node.type === 'file') {
    return (
      <li className="flex items-center gap-1.5 text-muted-foreground">
        <File className="size-3 shrink-0 opacity-60" />
        <span className="truncate">{node.name}</span>
      </li>
    );
  }

  return (
    <li>
      <div className={cn('flex items-center gap-1.5 text-foreground/90')}>
        <Folder className="size-3 shrink-0 text-primary/80" />
        <span>{node.name}</span>
      </div>
      {children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5 border-l border-border pl-3">
          {children.map((child) => (
            <FolderTreeView key={child.path || child.name} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
