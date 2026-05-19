'use client';

import { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { ThemeManager } from './ThemeManager';
import { cn } from '@/lib/utils';

export function ThemeSwitcher() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const themePreset = useStore((s) => s.ui.themePreset);
  const setThemePreset = useStore((s) => s.setThemePreset);
  const { theme, setTheme } = useTheme();

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors"
        >
          <Palette className="h-4 w-4 shrink-0" />
          <span className="truncate">{themePreset === 'default' ? 'Theme' : themePreset === 'dnd' ? 'D&D Style' : themePreset === 'cyberpunk' ? 'Cyberpunk' : themePreset === 'warhammer' ? 'Warhammer' : themePreset === 'pathfinder' ? 'Pathfinder' : themePreset}</span>
        </button>

        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-56 z-50 rounded-lg border bg-popover text-popover-foreground shadow-lg">
            <div className="p-1">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Theme Presets</div>

              <ThemePresetItem
                label="Default"
                description="Clean neutral theme"
                active={themePreset === 'default'}
                onClick={() => { setThemePreset('default'); setMenuOpen(false); }}
              />
              <ThemePresetItem
                label="D&D Style"
                description="Parchment, leather, gold"
                active={themePreset === 'dnd'}
                onClick={() => { setThemePreset('dnd'); setMenuOpen(false); }}
              />
              <ThemePresetItem
                label="Cyberpunk"
                description="Neon & chrome"
                active={themePreset === 'cyberpunk'}
                onClick={() => { setThemePreset('cyberpunk'); setMenuOpen(false); }}
              />
              <ThemePresetItem
                label="Warhammer"
                description="Grimdark gothic"
                active={themePreset === 'warhammer'}
                onClick={() => { setThemePreset('warhammer'); setMenuOpen(false); }}
              />
              <ThemePresetItem
                label="Pathfinder"
                description="Heraldic fantasy"
                active={themePreset === 'pathfinder'}
                onClick={() => { setThemePreset('pathfinder'); setMenuOpen(false); }}
              />

              <div className="border-t my-1" />

              <button
                onClick={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </button>

              <div className="border-t my-1" />

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setManagerOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                Manage Themes…
              </button>
            </div>
          </div>
        )}
      </div>

      <ThemeManager open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}

function ThemePresetItem({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors',
        active && 'bg-accent/50',
      )}
    >
      <div className="text-left">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      {active && <Check className="h-4 w-4 shrink-0 ml-2" />}
    </button>
  );
}
