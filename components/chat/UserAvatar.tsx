'use client';

import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name: string;
  color?: string;
  online?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const DEFAULT_COLORS = [
  '#60a5fa', '#34d399', '#f472b6', '#fb923c',
  '#a78bfa', '#2dd4bf', '#fbbf24', '#f87171',
  '#818cf8', '#4ade80', '#c084fc', '#f59e0b',
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

export function UserAvatar({ name, color, online, size = 'sm', className }: UserAvatarProps) {
  const bg = color || hashColor(name);
  const initial = name.charAt(0).toUpperCase();
  const dimension = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const fontSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span className={cn('relative inline-flex items-center justify-center', className)}>
      <span
        className={cn(
          dimension,
          fontSize,
          'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        )}
        style={{ backgroundColor: bg }}
      >
        {initial}
      </span>
      {online !== undefined && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
            online ? 'bg-green-500' : 'bg-muted-foreground',
          )}
        />
      )}
    </span>
  );
}
