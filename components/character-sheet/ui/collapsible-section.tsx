'use client';

import type { ReactNode } from 'react';
import { Collapsible } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  count,
  icon,
  defaultOpen = false,
  children,
  className,
}: CollapsibleSectionProps) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen} className={cn('rounded-lg border', className)}>
      <Collapsible.Trigger>
        <span className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="font-medium">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground ml-1">({count})</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-open:rotate-180" />
      </Collapsible.Trigger>
      <Collapsible.Panel>{children}</Collapsible.Panel>
    </Collapsible.Root>
  );
}
