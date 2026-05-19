'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '@/lib/utils';

const TabsRoot = TabsPrimitive.Root;

function TabsList({
  className,
  ...props
}: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-10 w-full items-center justify-start gap-0.5 rounded-lg bg-muted/50 p-0.5',
        className,
      )}
      {...props}
    />
  );
}

function TabsTab({
  className,
  children,
  ...props
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all outline-none select-none',
        'text-muted-foreground hover:text-foreground',
        'data-selected:bg-background data-selected:text-foreground data-selected:shadow-sm',
        'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-50',
        'cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Tab>
  );
}

function TabsPanel({
  className,
  children,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn(
        'mt-4 outline-none',
        'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
        'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
        'transition-opacity duration-150',
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Panel>
  );
}

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
};
