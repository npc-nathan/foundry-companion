'use client';

import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Info, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { getAllThemes, getThemeById, exportThemeAsJson, deleteCustomTheme, importThemeFromFile, saveCustomTheme } from '@/lib/theme/registry';
import { applyTheme } from '@/lib/theme/apply-theme';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ThemeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeManager({ open, onOpenChange }: ThemeManagerProps) {
  const themePreset = useStore((s) => s.ui.themePreset);
  const setThemePreset = useStore((s) => s.setThemePreset);
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const allThemes = getAllThemes();

  const handlePreview = (id: string) => {
    const def = getThemeById(id);
    if (def) {
      applyTheme(def, theme === 'dark');
      setThemePreset(id);
    }
  };

  const handleExport = (id: string) => {
    const def = getThemeById(id);
    if (def) exportThemeAsJson(def);
  };

  const handleDelete = (id: string) => {
    deleteCustomTheme(id);
    // Re-render by forcing a state update
    setImportError(null);
    // If the deleted theme was active, reset to default
    if (themePreset === id) {
      handlePreview('default');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const definition = await importThemeFromFile(file);
      // Check for duplicate IDs
      const existing = allThemes.find((t) => t.id === definition.id);
      if (existing) {
        setImportError(`A theme with ID "${definition.id}" already exists. Rename or delete it first.`);
        return;
      }
      saveCustomTheme(definition);
      handlePreview(definition.id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    }
    // Reset input so the same file can be re-imported
    e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Theme Manager</DialogTitle>
          <DialogDescription>
            Browse presets, import custom themes, or export your current setup.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileSelected}
        />

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="gap-2"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Preview Dark' : 'Preview Light'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            className="gap-2 ml-auto"
          >
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>
        </div>

        {importError && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-3">
            {importError}
          </div>
        )}

        <div className="space-y-2">
          {allThemes.map((t) => {
            const isActive = t.id === themePreset;
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.name}</span>
                    {t.builtin ? (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Built-in
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Custom
                      </Badge>
                    )}
                    {isActive && (
                      <Badge className="text-[10px] px-1.5 py-0">Active</Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {t.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePreview(t.id)}
                    className="h-8 px-3 text-xs"
                  >
                    {isActive ? 'Applied' : 'Apply'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExport(t.id)}
                    className="h-8 w-8"
                    title="Export as JSON"
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {!t.builtin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(t.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Delete theme"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Custom themes are stored in your browser&apos;s localStorage.
            Export them to back up or share with others. Import a .json file
            exported from this app or created manually following the theme schema.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
