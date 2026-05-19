import type { ThemeDefinition, SavedTheme } from './types';
import { presetThemes } from './presets';

const CUSTOM_THEMES_KEY = 'foundry-custom-themes';

/**
 * Get all available themes (built-in presets + user custom themes from localStorage).
 */
export function getAllThemes(): SavedTheme[] {
  const presets: SavedTheme[] = Object.entries(presetThemes).map(([id, def]) => ({
    id,
    name: def.name,
    description: def.description,
    builtin: true,
  }));

  const custom = getCustomThemes();
  return [...presets, ...custom];
}

/**
 * Get a theme definition by ID — checks built-in presets first, then custom.
 */
export function getThemeById(id: string): ThemeDefinition | undefined {
  if (presetThemes[id]) return presetThemes[id];
  const custom = getCustomThemes().find((t) => t.id === id);
  return custom?.definition;
}

/**
 * Load custom themes from localStorage.
 */
export function getCustomThemes(): SavedTheme[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedTheme[];
  } catch {
    return [];
  }
}

/**
 * Save a custom theme to localStorage.
 */
export function saveCustomTheme(definition: ThemeDefinition): SavedTheme {
  const saved: SavedTheme = {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    builtin: false,
    definition,
  };

  const themes = getCustomThemes().filter((t) => t.id !== definition.id);
  themes.push(saved);
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  return saved;
}

/**
 * Delete a custom theme from localStorage.
 */
export function deleteCustomTheme(id: string): void {
  const themes = getCustomThemes().filter((t) => t.id !== id);
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
}

/**
 * Export a theme definition as a downloadable JSON file.
 */
export function exportThemeAsJson(definition: ThemeDefinition): void {
  const blob = new Blob([JSON.stringify(definition, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foundry-theme-${definition.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validate a raw JSON object as a valid ThemeDefinition.
 * Returns { valid: true, definition } or { valid: false, error: string }.
 */
export function validateThemeJson(json: unknown): {
  valid: boolean;
  definition?: ThemeDefinition;
  error?: string;
} {
  if (!json || typeof json !== 'object') {
    return { valid: false, error: 'Invalid JSON: expected an object' };
  }

  const obj = json as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id) {
    return { valid: false, error: 'Missing or invalid "id" field (must be a non-empty string)' };
  }
  if (typeof obj.name !== 'string' || !obj.name) {
    return { valid: false, error: 'Missing or invalid "name" field (must be a non-empty string)' };
  }
  if (!obj.light || typeof obj.light !== 'object') {
    return { valid: false, error: 'Missing or invalid "light" field (must be an object)' };
  }
  if (!obj.dark || typeof obj.dark !== 'object') {
    return { valid: false, error: 'Missing or invalid "dark" field (must be an object)' };
  }

  // Ensure light and dark have at least the essential variables
  const light = obj.light as Record<string, unknown>;
  const dark = obj.dark as Record<string, unknown>;
  const required = ['--background', '--foreground', '--primary', '--primary-foreground'];

  for (const key of required) {
    if (typeof light[key] !== 'string') {
      return { valid: false, error: `Missing required CSS variable "${key}" in "light" palette` };
    }
    if (typeof dark[key] !== 'string') {
      return { valid: false, error: `Missing required CSS variable "${key}" in "dark" palette` };
    }
  }

  return { valid: true, definition: obj as unknown as ThemeDefinition };
}

/**
 * Import a theme from a JSON file via file input element.
 * Returns a promise that resolves with the validated theme definition, or rejects with an error.
 */
export function importThemeFromFile(file: File): Promise<ThemeDefinition> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const result = validateThemeJson(json);
        if (!result.valid || !result.definition) {
          reject(new Error(result.error || 'Invalid theme file'));
          return;
        }
        resolve(result.definition);
      } catch {
        reject(new Error('Failed to parse JSON — check file syntax'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Generate a unique custom theme ID from a name (e.g. "My Theme" → "my-theme").
 * Appends a suffix if the ID already exists.
 */
export function generateThemeId(name: string, existing: Set<string> = new Set()): string {
  let id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (!id) id = 'custom';

  let final = id;
  let counter = 1;
  while (existing.has(final)) {
    final = `${id}-${counter}`;
    counter++;
  }
  return final;
}
