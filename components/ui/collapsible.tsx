'use client';

import { Collapsible as CollapsiblePrimitive } from '@base-ui/react/collapsible';
import { cn } from '@/lib/utils';

const CollapsibleRoot = CollapsiblePrimitive.Root;

function CollapsibleTrigger({
  className,
  children,
  ...props
}: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        'group flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium',
        'hover:bg-muted/40 transition-colors',
        'cursor-pointer select-none',
        'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsiblePanel({
  className,
  children,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-panel"
      className={cn(
        'overflow-hidden',
        'data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-from-top-2',
        'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-2',
        'transition-all duration-200',
        className,
      )}
      {...props}
    >
      <div className="p-3 pt-1">{children}</div>
    </CollapsiblePrimitive.Panel>
  );
}

export const Collapsible = {
  Root: CollapsibleRoot,
  Trigger: CollapsibleTrigger,
  Panel: CollapsiblePanel,
};
