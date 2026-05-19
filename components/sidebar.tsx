'use client';

import { LogOut, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Users, Cog, MessageSquare, Dice5, ScrollText, Swords, Bug, BookOpen, PuzzleIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { sseManager } from '@/lib/sse';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

const gmNavItems = [
  { label: 'Dashboard', href: '/gm', icon: Cog },
  { label: 'Actors', href: '/gm/actors', icon: Users },
  { label: 'Scenes', href: '/gm/scenes', icon: Swords },
  { label: 'Compendium', href: '/gm/compendium', icon: BookOpen },
  { label: 'Chat', href: '/gm/chat', icon: MessageSquare },
  { label: 'Dice', href: '/gm/dice', icon: Dice5 },
  { label: 'Macros', href: '/gm/macros', icon: PuzzleIcon },
  { label: 'Journals', href: '/gm/journals', icon: ScrollText },
  { label: 'Canvas', href: '/gm/canvas', icon: Swords },
  { label: 'Logs', href: '/gm/logs', icon: Bug },
];

const playerNavItems = [
  { label: 'Character', href: '/player/character', icon: Users },
  { label: 'Chat', href: '/player/chat', icon: MessageSquare },
  { label: 'Dice', href: '/player/dice', icon: Dice5 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { config, reset } = useStore();
  const { theme, setTheme } = useTheme();
  const navItems = config.role === 'gm' ? gmNavItems : playerNavItems;
  const handleDisconnect = () => {
    sseManager.disconnectAll();
    reset();
  };

  return (
    <div data-slot="sidebar" className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-6 bg-panel-header text-panel-header-foreground shadow-[0_2px_0_var(--decorative-accent)]">
        <Link href="/" className="font-heading font-semibold tracking-wide">
          Foundry Companion
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-heading transition-all',
                    active
                      ? 'bg-accent text-accent-foreground font-medium border-l-[3px] border-decorative-accent shadow-[inset_2px_0_0_var(--decorative-accent)]'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-4 space-y-1 border-decorative-accent/20">
        <div className="mb-3 text-xs text-muted-foreground truncate">{config.clientName}</div>
        <ThemeSwitcher />
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={handleDisconnect}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </button>
      </div>
    </div>
  );
}

/**
 * Mobile sidebar using Sheet component
 */
export function MobileSidebar({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger>{children}</SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
