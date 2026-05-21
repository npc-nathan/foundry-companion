'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
import { rewriteRelayContent } from '@/lib/relay-html';
import CharacterSheet from '@/components/CharacterSheet';
import SystemItemViewer from '@/components/character-sheet/system-item-viewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BookOpen,
  BookText,
  Box,
  FileText,
  Image,
  Swords,
  ScrollText,
  Map,
  Dices,
  FileType,
  Users,
  Package,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Download,
  Edit,
  Save,
  Video,
  X,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────

function imgUrl(path: string | null | undefined): string {
  if (!path) return '/api/relay/download?path=icons/svg/mystery-man.svg&source=data';
  return `/api/relay/download?path=${encodeURIComponent(path)}&source=data`;
}

// ─── Types ──────────────────────────────────────────────────

interface CompendiumPack {
  id: string;
  name: string;
  label: string;
  package: string;
  packageName: string;
  entityType: string;
  path: string;
  private: boolean;
  size: number;
}

interface CompendiumEntry {
  _id: string;
  name: string;
  type: string;
  img: string;
  uuid?: string;
  pack?: string;
  folder: string | null;
  sort: number;
  system?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CompendiumEntryFull {
  _id: string;
  name: string;
  type: string;
  img: string;
  pack?: string;
  folder: string | null;
  sort: number;
  system?: Record<string, unknown>;
  pages?: Array<{ _id: string; name: string; type: string; text?: { content: string } }>;
  ownership: Record<string, number>;
  flags: Record<string, unknown>;
  [key: string]: unknown;
}

// ─── D&D5e Type Mapping ──────────────────────────────────────
/** Map dnd5e subtypes to document category */
function dnd5eDocumentCategory(type: string): 'actor' | 'item' | 'journal' | 'rolltable' | 'other' {
  const t = type.toLowerCase();
  if (['npc', 'vehicle', 'character', 'group', 'loot', 'housing', 'robot', 'ship'].includes(t)) return 'actor';
  if (['weapon', 'equipment', 'consumable', 'tool', 'feat', 'spell', 'backpack', 'class', 'subclass', 'race', 'background', 'profession upgrade'].includes(t)) return 'item';
  if (t === 'journalentry') return 'journal';
  if (t === 'rolltable') return 'rolltable';
  return 'other';
}

// ─── Type Tab Mapping ──────────────────────────────────────

const TYPE_TABS: Record<string, { label: string; types: string[] }> = {
  all: { label: 'All', types: [] },
  weapon: { label: 'Weapons', types: ['weapon', 'ammunition'] },
  armor: { label: 'Armor', types: ['armor', 'shield'] },
  spell: { label: 'Spells', types: ['spell'] },
  npc: { label: 'Monsters', types: ['npc', 'character', 'vehicle', 'group'] },
  item: {
    label: 'Items',
    types: ['consumable', 'loot', 'tool', 'backpack', 'equipment'],
  },
  feat: {
    label: 'Features',
    types: ['feat', 'class', 'subclass', 'background', 'race'],
  },
};

/** Extract structured query tokens from search text */
function parseStructuredQuery(
  text: string,
): { plain: string; filters: Record<string, string> } {
  const filters: Record<string, string> = {};
  const tokens = text.split(/\s+/);
  const plainTokens: string[] = [];
  for (const token of tokens) {
    const match = token.match(/^(\w+):(.+)$/);
    if (match) {
      filters[match[1].toLowerCase()] = match[2].toLowerCase();
    } else {
      plainTokens.push(token);
    }
  }
  return { plain: plainTokens.join(' '), filters };
}

// getPropertyOptions removed — index data doesn't include system fields

/** Filter entries by type tab and search text */
function filterEntries(
  entries: CompendiumEntry[],
  activeTab: string,
  searchText: string,
): CompendiumEntry[] {
  let result = entries;

  // Filter by type tab
  if (activeTab !== 'all') {
    const allowedTypes = TYPE_TABS[activeTab]?.types || [];
    result = result.filter((e) =>
      allowedTypes.includes(e.type?.toLowerCase()),
    );
  }

  // Parse structured query
  const { plain, filters } = parseStructuredQuery(searchText);

  // Apply structured filters
  if (filters.type) {
    result = result.filter(
      (e) => e.type?.toLowerCase() === filters.type,
    );
  }
  if (filters.damage) {
    result = result.filter((e) => {
      const sys = e.system as Record<string, unknown> | undefined;
      const dmg = sys?.damage as Record<string, unknown> | undefined;
      const base = dmg?.base as Record<string, unknown> | undefined;
      const dmgTypes = (base?.types as string[] | undefined) || [];
      return dmgTypes.some((dt) => dt.toLowerCase().includes(filters.damage));
    });
  }
  if (filters.rarity) {
    result = result.filter((e) => {
      const sys = e.system as Record<string, unknown> | undefined;
      const rarity = sys?.rarity as string | undefined;
      return rarity?.toLowerCase() === filters.rarity;
    });
  }
  if (filters.level) {
    const levelNum = parseInt(filters.level, 10);
    if (!isNaN(levelNum)) {
      result = result.filter((e) => {
        const sys = e.system as Record<string, unknown> | undefined;
        return (sys?.level as number) === levelNum;
      });
    }
  }
  if (filters.cr) {
    result = result.filter((e) => {
      const sys = e.system as Record<string, unknown> | undefined;
      const details = sys?.details as Record<string, unknown> | undefined;
      return String(details?.cr) === filters.cr;
    });
  }
  if (filters.school) {
    result = result.filter((e) => {
      const sys = e.system as Record<string, unknown> | undefined;
      const school = sys?.school as Record<string, unknown> | undefined;
      return String(school?.value).toLowerCase() === filters.school;
    });
  }
  if (filters.armortype || filters.armor) {
    const armorFilter = (filters.armortype || filters.armor)!;
    result = result.filter((e) => {
      const sys = e.system as Record<string, unknown> | undefined;
      const armor = sys?.armor as Record<string, unknown> | undefined;
      return String(armor?.type).toLowerCase() === armorFilter;
    });
  }

  // Apply plain text search (name only)
  if (plain.trim()) {
    const q = plain.toLowerCase();
    result = result.filter((e) => e.name.toLowerCase().includes(q));
  }

  return result;
}

/** Format a dnd5e subtype for display */
function formatDnd5eType(type: string): string {
  const t = type.toLowerCase();
  const labels: Record<string, string> = {
    npc: 'NPC', vehicle: 'Vehicle', character: 'Character', group: 'Group',
    feat: 'Feat', weapon: 'Weapon', equipment: 'Equipment', consumable: 'Consumable',
    tool: 'Tool', spell: 'Spell', backpack: 'Container', background: 'Background',
    class: 'Class', subclass: 'Subclass', race: 'Race',
  };
  return labels[t] || type.charAt(0).toUpperCase() + type.slice(1);
}

// ─── Entity Type Icon ────────────────────────────────────────

function EntityTypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  switch (t) {
    case 'actor':
      return <Users className="h-3.5 w-3.5" />;
    case 'item':
      return <Swords className="h-3.5 w-3.5" />;
    case 'journalentry':
      return <BookOpen className="h-3.5 w-3.5" />;
    case 'scene':
      return <Map className="h-3.5 w-3.5" />;
    case 'rolltable':
      return <Dices className="h-3.5 w-3.5" />;
    case 'macro':
      return <FileType className="h-3.5 w-3.5" />;
    case 'cards':
      return <ScrollText className="h-3.5 w-3.5" />;
    default:
      return <Box className="h-3.5 w-3.5" />;
  }
}

function EntityTypeBadge({ type }: { type: string }) {
  const label = formatDnd5eType(type);
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium uppercase leading-none">
      {label}
    </span>
  );
}

// ─── Compendium Journal Viewer (read-only) ────────────────────

interface CompendiumJournalPage {
  _id: string;
  name: string;
  type: string;
  text?: { content: string; format?: number };
  image?: { caption?: string };
  video?: { controls?: boolean; volume?: number };
  src?: string | null;
  sort?: number;
  system?: Record<string, unknown>;
}

function CompendiumJournalViewer({ entry }: { entry: { name?: string; pages?: CompendiumJournalPage[] } }) {
  const pages = entry.pages || [];
  const [activePageIdx, setActivePageIdx] = useState(0);
  const currentPage = pages[activePageIdx];

  if (pages.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        This journal has no pages
      </div>
    );
  }

  const pageTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-3 w-3" aria-hidden="true" />;
      case 'video': return <Video className="h-3 w-3" aria-hidden="true" />;
      case 'pdf': return <FileText className="h-3 w-3" aria-hidden="true" />;
      default: return <BookText className="h-3 w-3" aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Page tabs */}
      <div className="flex items-center border-b overflow-x-auto shrink-0">
        {pages.map((page, idx) => (
          <button
            key={page._id}
            onClick={() => setActivePageIdx(idx)}
            className={`flex items-center gap-1 px-3 py-2 text-xs border-b-2 transition-colors shrink-0 whitespace-nowrap ${
              idx === activePageIdx
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-primary/50'
            }`}
          >
            {pageTypeIcon(page.type)}
            {page.name}
          </button>
        ))}
      </div>

      {/* Page content */}
      {currentPage ? (
        currentPage.type === 'image' ? (
          <div>
            {currentPage.src ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl(currentPage.src)}
                  alt={currentPage.name}
                  className="max-w-full rounded-md"
                />
                {currentPage.image?.caption && (
                  <p className="text-sm text-muted-foreground italic">
                    {currentPage.image.caption}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">No image source</p>
            )}
          </div>
        ) : currentPage.type === 'video' ? (
          <div>
            {currentPage.src ? (
              <video
                src={imgUrl(currentPage.src)}
                controls={currentPage.video?.controls ?? true}
                className="max-w-full rounded-md"
              />
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">No video source</p>
            )}
          </div>
        ) : (
          <>
            {(currentPage.system?.item || currentPage.system?.actor) && (
              <SystemItemViewer
                systemItemUuid={String(currentPage.system?.item || currentPage.system?.actor)}
              />
            )}
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: rewriteRelayContent(currentPage.text?.content || '<p>No content</p>'),
              }}
            />
          </>
        )
      ) : (
        <p className="text-muted-foreground text-sm text-center py-4">Select a page</p>
      )}
    </div>
  );
}

// ─── Compendium Roll Table Viewer ─────────────────────────────

interface RollTableResult {
  _id: string;
  type: string;
  weight: number;
  range: [number, number];
  drawn: boolean;
  name: string;
  img?: string;
  description: string;
  collection?: string;
  resultId?: string;
}

function CompendiumRollTableViewer({
  entry,
  uuid,
}: {
  entry: { name?: string; formula?: string; description?: string; results?: RollTableResult[]; replacement?: boolean; displayRoll?: boolean };
  uuid: string;
}) {
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<{ total: number; formula: string; results: { text: string; img?: string; name?: string }[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();
  const results = entry.results || [];

  const handleRoll = useCallback(async () => {
    setRolling(true);
    try {
      const res = await relay.rollTable(uuid, false);
      const data = res as { success: boolean; result: string };
      if (data?.result) {
        const parsed = JSON.parse(data.result as string);
        setLastRoll(parsed);
      }
    } catch (e) {
      toast.error('Failed to roll table: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setRolling(false);
    }
  }, [uuid]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      await relay.importCompendiumEntry(uuid);
      toast.success('Roll table imported to world');
      queryClient.invalidateQueries({ queryKey: ['rolltables'] });
    } catch (e) {
      toast.error('Failed to import: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setImporting(false);
    }
  }, [uuid, queryClient]);

  return (
    <div className="space-y-3">
      {/* Formula badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {entry.formula && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold">
              <Dices className="h-3 w-3" />
              {entry.formula}
            </span>
          )}
          {entry.replacement !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${entry.replacement ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
              {entry.replacement ? 'Replace' : 'No Replace'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="default" onClick={handleRoll} disabled={rolling} className="h-7 text-xs">
            <Dices className="h-3 w-3 mr-1" />
            {rolling ? 'Rolling...' : 'Roll'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleImport} disabled={importing} className="h-7 text-xs">
            <Download className="h-3 w-3 mr-1" />
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>

      {/* Description */}
      {entry.description ? (
        <div
          className="text-xs text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: rewriteRelayContent(entry.description) }}
        />
      ) : null}

      {/* Last roll result */}
      {lastRoll && (
        <div className="bg-primary/5 border border-primary/10 rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Roll Result</span>
            <span className="text-xs text-muted-foreground">
              {lastRoll.formula} → <strong className="text-foreground">{lastRoll.total}</strong>
            </span>
          </div>
          <div className="space-y-1">
            {lastRoll.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1">
                {r.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgUrl(r.img)} alt="" className="h-4 w-4 rounded" />
                )}
                <span className="font-medium">{r.text || r.name || 'Result'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Table Results</h4>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-2.5 py-1.5 font-medium text-muted-foreground">Range</th>
                  <th className="text-left px-2.5 py-1.5 font-medium text-muted-foreground">Weight</th>
                  <th className="text-left px-2.5 py-1.5 font-medium text-muted-foreground">Result</th>
                  <th className="text-left px-2.5 py-1.5 font-medium text-muted-foreground">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r) => (
                  <tr key={r._id} className={`hover:bg-muted/30 ${r.drawn ? 'opacity-50' : ''}`}>
                    <td className="px-2.5 py-1.5 font-mono text-muted-foreground">
                      {r.range[0]}{r.range[1] !== r.range[0] ? `–${r.range[1]}` : ''}
                    </td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">{r.weight}</td>
                    <td className="px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {r.img && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl(r.img)} alt="" className="h-4 w-4 rounded" />
                        )}
                        <span>{r.description || r.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground uppercase font-medium">
                        {r.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Data Extraction ────────────────────────────────────────

/** Extract array from an execute-js response (result is JSON-stringified array) */
function parseJsResult<T>(data: unknown): T[] {
  if (!data) return [];
  const d = data as { success?: boolean; result?: string } | undefined;
  if (d?.success && typeof d.result === 'string') {
    try {
      return JSON.parse(d.result) as T[];
    } catch {
      return [];
    }
  }
  // Also handle case where result is already an array
  if (Array.isArray(d?.result)) return d.result as T[];
  return [];
}

// ─── Main Page ──────────────────────────────────────────────

export default function CompendiumPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');
  const [searchAllResults, setSearchAllResults] = useState<Record<string, CompendiumEntry[]> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [newEntryName, setNewEntryName] = useState('');
  const [newEntryType, setNewEntryType] = useState('Actor');
  const [newEntryPack, setNewEntryPack] = useState<string | null>(null);

  // Edit state for entry name
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState(false);

  // ─── Queries ──────────────────────────────────────────────

  const { data: packsData, isLoading: packsLoading } = useQuery({
    queryKey: ['compendiums'],
    queryFn: () => relay.getCompendiumPacks(),
    refetchOnMount: true,
  });

  const packs: CompendiumPack[] = useMemo(() => {
    const raw = packsData as { success?: boolean; result?: CompendiumPack[] } | undefined;
    if (raw?.success && Array.isArray(raw.result)) {
      // Deduplicate by pack id (pack name/collection) and filter out private
      const seen = new Set<string>();
      return raw.result.filter((p) => {
        if (p.private || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    }
    return [];
  }, [packsData]);

  // Group packs by package
  const packsByPackage = useMemo(() => {
    const groups: Record<string, CompendiumPack[]> = {};
    for (const p of packs) {
      const key = p.packageName || p.package || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    // Sort packs within each group by label
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.label.localeCompare(b.label));
    }
    return groups;
  }, [packs]);

  // Get the current pack name for the selected entry
  const selectedEntryPack = useMemo(() => {
    if (!selectedUuid) return null;
    // UUID format: Compendium.packName.EntityType.id
    const parts = selectedUuid.split('.');
    if (parts.length >= 3 && parts[0] === 'Compendium') {
      return parts[1];
    }
    return null;
  }, [selectedUuid]);

  // Individual pack content query — use a map of queries
  const [packContentsCache, setPackContentsCache] = useState<Record<string, CompendiumEntry[]>>({});

  const loadPackContents = useCallback(
    async (packName: string) => {
      if (packContentsCache[packName]) return;
      try {
        const data = await relay.getCompendiumPackContents(packName);
        const entries = parseJsResult<CompendiumEntry>(data);
        // Ensure each entry has a fallback img
        for (const e of entries) {
          if (!e.img) e.img = 'icons/svg/mystery-man.svg';
        }
        setPackContentsCache((prev) => ({ ...prev, [packName]: entries }));
      } catch {
        toast.error(`Failed to load pack: ${packName}`);
      }
    },
    [packContentsCache],
  );

  // Toggle pack expansion
  const togglePack = useCallback(
    (packName: string) => {
      setExpandedPacks((prev) => {
        const next = new Set(prev);
        if (next.has(packName)) {
          next.delete(packName);
        } else {
          next.add(packName);
          // Load contents asynchronously
          loadPackContents(packName);
        }
        return next;
      });
    },
    [loadPackContents],
  );

  // Selected entry data
  const { data: entryData, isLoading: entryLoading } = useQuery({
    queryKey: ['compendium-entry', selectedUuid],
    queryFn: () => relay.getCompendiumEntry(selectedUuid!),
    enabled: !!selectedUuid && !selectedUuid.startsWith('search_'),
  });

  const selectedEntry = entryData as { data?: CompendiumEntryFull } | undefined;

  // ─── Mutations ────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () => {
      if (!newEntryPack) throw new Error('No pack selected');
      const entityType = newEntryType.toLowerCase();
      return relay.createCompendiumEntry(newEntryPack, entityType, {
        name: newEntryName,
        img: 'icons/svg/mystery-man.svg',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compendiums'] });
      // Reload pack contents for the affected pack
      if (newEntryPack) {
        setPackContentsCache((prev) => {
          const next = { ...prev };
          delete next[newEntryPack!];
          return next;
        });
        loadPackContents(newEntryPack);
      }
      setShowCreate(false);
      setNewEntryName('');
      toast.success('Entry created in compendium');
    },
    onError: (err) => toast.error(String(err)),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedUuid) throw new Error('No entry selected');
      return relay.updateCompendiumEntry(selectedUuid, { name: editName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compendium-entry', selectedUuid] });
      setEditMode(false);
      toast.success('Entry updated');
    },
    onError: (err) => toast.error(String(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!selectedUuid) throw new Error('No entry selected');
      return relay.deleteCompendiumEntry(selectedUuid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compendiums'] });
      setSelectedUuid(null);
      setShowDelete(false);
      toast.success('Entry deleted from compendium');
    },
    onError: (err) => toast.error(String(err)),
  });

  const importMutation = useMutation({
    mutationFn: () => {
      if (!selectedUuid) throw new Error('No entry selected');
      return relay.importCompendiumEntry(selectedUuid);
    },
    onSuccess: (data) => {
      const result = data as { result?: { name?: string; type?: string } } | undefined;
      const name = (result as { result?: { name?: string } } | undefined)?.result?.name || result?.result?.name;
      setShowImportConfirm(false);
      toast.success(`Imported "${name || selectedEntry?.data?.name || 'entry'}" to world`);
    },
    onError: (err) => toast.error(String(err)),
  });

  // ─── Filtered packs ──────────────────────────────────────

  const filterPacks = useCallback(
    (pack: CompendiumPack) => {
      // Don't filter pack rows by search text — entry-level
      // filtering via filterEntries handles that. When search or
      // type tab is active, auto-expand shows all packs' entries.
      return true;
    },
    [],
  );

  const totalEntries = packs.reduce((sum, p) => sum + p.size, 0);
  const filteredPackCount = packs.length;

  // ─── Select entry ─────────────────────────────────────────

  const selectEntry = useCallback((uuid: string) => {
    setSelectedUuid(uuid);
    setEditMode(false);
  }, []);

  // ─── Enter edit mode ─────────────────────────────────────

  const enterEdit = useCallback(() => {
    if (selectedEntry?.data) {
      setEditName(selectedEntry.data.name);
      setEditMode(true);
    }
  }, [selectedEntry]);

  // ─── Available packs for create dialog ───────────────────

  const packOptions = useMemo(() => {
    const options: { id: string; label: string; entityType: string }[] = [];
    for (const p of packs) {
      options.push({ id: p.id, label: `${p.label} (${p.entityType})`, entityType: p.entityType });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [packs]);

  // When pack changes, auto-set entity type
  const handlePackChange = useCallback(
    (packId: string | null) => {
      if (!packId) return;
      setNewEntryPack(packId);
      const pack = packs.find((p) => p.id === packId);
      if (pack) {
        setNewEntryType(
          pack.entityType.charAt(0).toUpperCase() + pack.entityType.slice(1),
        );
      }
    },
    [packs],
  );

  // ─── Search all packs via single relay call (debounced) ──────

  useEffect(() => {
    const isSearchActive = search.trim().length > 0;
    const isTabActive = activeTab !== 'all';

    if (!isSearchActive && !isTabActive) {
      // Both cleared — clear search results, revert to normal browsing
      setSearchAllResults(null);
      setIsSearching(false);
      return;
    }

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const raw = await relay.searchAllPacks(search, isTabActive ? activeTab : null, 200);
        const data = raw as { success?: boolean; result?: Record<string, unknown[]> };
        const result = data?.result;
        if (result && typeof result === 'object') {
          const parsed: Record<string, CompendiumEntry[]> = {};
          for (const [packId, entries] of Object.entries(result)) {
            if (Array.isArray(entries)) {
              parsed[packId] = entries as CompendiumEntry[];
            }
          }
          setSearchAllResults(parsed);
        } else {
          setSearchAllResults({});
        }
      } catch {
        setSearchAllResults({});
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search, activeTab]);

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight heading-themed heading-accent heading-accent-if-defined">
            Compendiums
          </h1>
          <p className="text-sm text-muted-foreground">{packs.length} packs · {totalEntries} entries</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} disabled={packs.length === 0}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Entry
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* ─── Left Panel: Pack Browser ──────────────────────── */}
        <Card className="w-72 shrink-0 flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter packs & entries by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredPackCount} pack{filteredPackCount !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          {/* Type tab bar */}
          <div className="px-3 pb-2 shrink-0 space-y-1">
            <div className="flex flex-wrap gap-1">
              {Object.entries(TYPE_TABS).map(([key, tab]) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                  }}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    activeTab === key
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-0 flex-1 min-h-0">
            <ScrollArea className="h-full">
              {packsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
              ) : packs.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No compendium packs found
                </div>
              ) : searchAllResults !== null ? (
                <div className="p-2 space-y-1">
                  {isSearching && (
                    <div className="px-2 py-1 text-xs text-muted-foreground animate-pulse">
                      Searching...
                    </div>
                  )}
                  {(() => {
                    const entries = Object.entries(searchAllResults);
                    if (entries.length === 0 && !isSearching) {
                      return (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No matching entries found
                        </div>
                      );
                    }
                    return entries.map(([packId, packEntries]) => {
                      const pack = packs.find((p) => p.id === packId);
                      if (!pack || packEntries.length === 0) return null;
                      return (
                        <div key={packId}>
                          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm">
                            <EntityTypeIcon type={pack.entityType} />
                            <span className="truncate flex-1 text-left">{pack.label}</span>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {packEntries.length}
                            </span>
                          </div>
                          <div className="ml-4 border-l pl-1 space-y-0.5">
                            {packEntries.map((entry) => {
                              const uuid =
                                entry.uuid ||
                                `Compendium.${packId}.${entry.type}.${entry._id}`;
                              return (
                                <button
                                  key={entry._id}
                                  onClick={() => selectEntry(uuid)}
                                  className={`flex items-center gap-2 w-full px-2 py-1 rounded-md text-sm transition-colors ${
                                    selectedUuid === uuid
                                      ? 'bg-accent text-accent-foreground font-medium'
                                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                                  }`}
                                >
                                  <EntityTypeIcon type={entry.type || pack.entityType} />
                                  <span className="truncate flex-1 text-left">{entry.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {Object.entries(packsByPackage).map(([packageName, groupPacks]) => {
                    const filtered = groupPacks.filter(filterPacks);
                    if (filtered.length === 0) return null;
                    return (
                      <div key={packageName}>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="h-3 w-3" />
                          {packageName}
                        </div>
                        {filtered.map((pack) => {
                          const isExpanded = expandedPacks.has(pack.id);
                          const entries = packContentsCache[pack.id] || [];
                          return (
                            <div key={pack.id}>
                              <button
                                onClick={() => togglePack(pack.id)}
                                className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <EntityTypeIcon type={pack.entityType} />
                                <span className="truncate flex-1 text-left">{pack.label}</span>
                                <span className="text-[10px] tabular-nums text-muted-foreground">
                                  {entries.length || pack.size}
                                </span>
                              </button>
                              {isExpanded && (
                                <div className="ml-4 border-l pl-1 space-y-0.5">
                                  {entries.length === 0 ? (
                                    <p className="px-2 py-1 text-xs text-muted-foreground italic">
                                      {packContentsCache[pack.id] !== undefined
                                        ? '(empty)'
                                        : 'Loading...'}
                                    </p>
                                  ) : (() => {
                                    const filteredEntries = filterEntries(entries, activeTab, search);
                                    const totalFiltered = filteredEntries.length;
                                    if (totalFiltered === 0) {
                                      return (
                                        <p className="px-2 py-1 text-xs text-muted-foreground italic">
                                          No matches
                                        </p>
                                      );
                                    }
                                    return (
                                      <>
                                        {totalFiltered < entries.length && (
                                          <p className="px-2 py-0.5 text-[10px] text-muted-foreground">
                                            {totalFiltered} of {entries.length}
                                          </p>
                                        )}
                                        {filteredEntries.map((entry) => {
                                      const uuid = entry.uuid || `Compendium.${pack.id}.${pack.entityType.charAt(0).toUpperCase() + pack.entityType.slice(1)}.${entry._id}`;
                                      return (
                                        <button
                                          key={entry._id}
                                          onClick={() => selectEntry(uuid)}
                                          className={`flex items-center gap-2 w-full px-2 py-1 rounded-md text-sm transition-colors ${
                                            selectedUuid === uuid
                                              ? 'bg-accent text-accent-foreground font-medium'
                                              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                                          }`}
                                        >
                                          <EntityTypeIcon type={entry.type || pack.entityType} />
                                          <span className="truncate flex-1 text-left">
                                            {entry.name}
                                          </span>
                                        </button>
                                      );
                                    })}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ─── Right Panel: Entry Viewer ────────────────────── */}
        <Card className="flex-1 flex flex-col min-w-0">
          {!selectedUuid ? (
            <CardContent className="p-8 text-center text-muted-foreground flex-1 flex items-center justify-center">
              <div>
                <Box className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a compendium entry to view</p>
              </div>
            </CardContent>
          ) : entryLoading ? (
            <CardContent className="p-8 text-center text-muted-foreground flex-1 flex items-center justify-center">
              <p>Loading entry...</p>
            </CardContent>
          ) : selectedEntry?.data ? (
            <>
              {/* Entry header */}
              <CardHeader className="pb-3 shrink-0 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl(selectedEntry.data.img)}
                    alt=""
                    className="h-10 w-10 rounded object-cover border"
                  />
                  <div className="min-w-0">
                    {editMode ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-lg font-bold h-9"
                      />
                    ) : (
                      <CardTitle className="text-lg truncate">
                        {selectedEntry.data.name}
                      </CardTitle>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <EntityTypeBadge type={selectedEntry.data.type || selectedEntryPack || ''} />
                      {selectedEntryPack && (
                        <span className="text-xs text-muted-foreground">
                          {packs.find((p) => p.id === selectedEntryPack)?.label ||
                            selectedEntryPack}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {editMode ? (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditMode(false)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={enterEdit}>
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportConfirm(true)}
                    disabled={importMutation.isPending}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Import to World
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDelete(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              {/* Entry content */}
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {/* Description / Content — pages alone is sufficient to detect journal entries */}
                    {!selectedEntry.data.pages && selectedEntry.data.system?.description ? (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                          Description
                        </h3>
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html:
                              rewriteRelayContent(
                                ((
                                  selectedEntry.data.system as Record<string, unknown>
                                )?.description as Record<string, unknown>)?.value as string ||
                                  'No description',
                              ),
                          }}
                        />
                      </div>
                    ) : null}

                    {/* Entry Metadata */}
                    <div>
                      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                        Details
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">ID:</span>
                          <code className="text-xs">{selectedEntry.data._id}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Type:</span>
                          <EntityTypeBadge type={selectedEntry.data.type || ''} />
                        </div>
                        {selectedEntryPack && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Pack:</span>
                            <span className="text-xs truncate">
                              {packs.find((p) => p.id === selectedEntryPack)?.label ||
                                selectedEntryPack}
                            </span>
                          </div>
                        )}
                        {selectedEntry.data.sort !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Sort:</span>
                            <span className="text-xs">{selectedEntry.data.sort}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* D&D5e specific stats / journal viewer — handle all types */}
                    {((): React.ReactNode => {
                        const cat = dnd5eDocumentCategory(selectedEntry.data.type || '');
                        const sys = selectedEntry.data.system as Record<string, unknown> | undefined;

                        // ── Journal entries (no system field, uses pages) ──
                        if (cat === 'journal' || selectedEntry.data.pages) {
                          return <CompendiumJournalViewer entry={selectedEntry.data} />;
                        }

                        // ── Roll tables (detected by formula field) ──
                        if (selectedEntry.data.formula) {
                          return <CompendiumRollTableViewer entry={selectedEntry.data} uuid={selectedUuid!} />;
                        }

                        // ── Stat helpers (actor & item need system) ──
                        if (!sys) return null;
                        const weightObj = sys.weight as Record<string, unknown> | undefined;
                        const priceObj = sys.price as Record<string, unknown> | undefined;
                        const dmgObj = sys.damage as Record<string, unknown> | undefined;
                        const rangeObj = sys.range as Record<string, unknown> | undefined;

                          if (cat === 'actor') {
                            return <CharacterSheet uuid={selectedUuid!} readOnly />;
                          }

                          if (cat === 'item') {
                            // ── Item stats ──
                            return (
                              <div className="space-y-3">
                                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                                  Item Properties
                                </h3>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  {weightObj?.value !== undefined && (
                                    <div className="bg-muted rounded p-2 text-center">
                                      <span className="block text-muted-foreground">Weight</span>
                                      <span className="font-semibold">{String(weightObj.value)} {String(weightObj.units || 'lb')}</span>
                                    </div>
                                  )}
                                  {priceObj?.value !== undefined && (
                                    <div className="bg-muted rounded p-2 text-center">
                                      <span className="block text-muted-foreground">Price</span>
                                      <span className="font-semibold">{String(priceObj.value)} {String(priceObj.denomination || 'gp')}</span>
                                    </div>
                                  )}
                                  {/* Spell-specific */}
                                  {selectedEntry.data.type?.toLowerCase() === 'spell' ? (() => {
                                    const spellSys = sys;
                                    const level = (spellSys as Record<string, unknown>)?.level ?? 0;
                                    const school = ((spellSys as Record<string, unknown>)?.school as Record<string, unknown> | undefined)?.value as string;
                                    const duration = (spellSys as Record<string, unknown>)?.duration as Record<string, unknown> | undefined;
                                    const spellRange = (spellSys as Record<string, unknown>)?.range as Record<string, unknown> | undefined;
                                    const components = (spellSys as Record<string, unknown>)?.components as Record<string, unknown> | undefined;
                                    const activation = (spellSys as Record<string, unknown>)?.activation as Record<string, unknown> | undefined;
                                    return (
                                      <>
                                        <div className="bg-muted rounded p-2 text-center">
                                          <span className="block text-muted-foreground">Level</span>
                                          <span className="font-semibold">{level === 0 ? 'Cantrip' : String(level)}</span>
                                        </div>
                                        {Boolean(school) && (
                                          <div className="bg-muted rounded p-2 text-center">
                                            <span className="block text-muted-foreground">School</span>
                                            <span className="font-semibold">{school.charAt(0).toUpperCase() + school.slice(1)}</span>
                                          </div>
                                        )}
                                        {(spellRange?.value ?? undefined) !== undefined && (
                                          <div className="bg-muted rounded p-2 text-center">
                                            <span className="block text-muted-foreground">Range</span>
                                            <span className="font-semibold">{String(spellRange!.value)} {String(spellRange!.units || '')}</span>
                                          </div>
                                        )}
                                        {(activation?.type) && (
                                          <div className="bg-muted rounded p-2 text-center">
                                            <span className="block text-muted-foreground">Casting Time</span>
                                            <span className="font-semibold">{String(activation!.value || '')} {String(activation!.type)}</span>
                                          </div>
                                        )}
                                        {(duration?.value ?? undefined) !== undefined && (
                                          <div className="bg-muted rounded p-2 text-center">
                                            <span className="block text-muted-foreground">Duration</span>
                                            <span className="font-semibold">{String(duration!.value)} {String(duration!.units || '')}</span>
                                          </div>
                                        )}
                                        {Boolean(components) && (
                                          <div className="bg-muted rounded p-2 text-center">
                                            <span className="block text-muted-foreground">Components</span>
                                            <span className="font-semibold">
                                              {['vocal', 'somatic', 'material'].filter(c => (components! as Record<string, unknown>)[c]).map(c => c.charAt(0).toUpperCase()).join(', ')}
                                              {(components! as Record<string, unknown>).material ? ` (${(components! as Record<string, unknown>).material})` : ''}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })() : null}
                                  {/* Weapon-specific damage */}
                                  {(dmgObj?.base) ? (() => {
                                    const base = dmgObj!.base as Record<string, unknown>;
                                    return (
                                      <div className="bg-muted rounded p-2 text-center col-span-2">
                                        <span className="block text-muted-foreground">Damage</span>
                                        <span className="font-semibold">
                                          {String(base?.number || '')}d{String(base?.denomination || '')}
                                          {base?.bonus ? ` + ${base.bonus}` : ''}
                                          {((base?.types as string[] | undefined)?.length) ? ` ${(base.types as string[]).join(', ')}` : ''}
                                        </span>
                                      </div>
                                    );
                                  })() : null}
                                  {/* Weapon range */}
                                  {(rangeObj?.value ?? undefined) !== undefined && (
                                    <div className="bg-muted rounded p-2 text-center">
                                      <span className="block text-muted-foreground">Range</span>
                                      <span className="font-semibold">{String(rangeObj!.value)} {String(rangeObj!.units || 'ft')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })() as React.ReactNode}

                    {/* Raw JSON (collapsed) */}
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Raw Data
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto max-h-80 text-xs">
                        {JSON.stringify(selectedEntry.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-8 text-center text-muted-foreground flex-1 flex items-center justify-center">
              <div>
                <Box className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Could not load entry data</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* ─── Create Dialog ─────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Compendium Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                value={newEntryName}
                onChange={(e) => setNewEntryName(e.target.value)}
                placeholder="Entry name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newEntryName.trim() && newEntryPack) {
                    createMutation.mutate();
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Target Pack</label>
              <Select value={newEntryPack || ''} onValueChange={handlePackChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a pack" />
                </SelectTrigger>
                <SelectContent>
                  {packOptions.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      <span className="flex items-center gap-2">
                        {po.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Entity Type</label>
              <Select value={newEntryType} onValueChange={(v) => v && setNewEntryType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Actor', 'Item', 'JournalEntry', 'Scene', 'RollTable', 'Macro'].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newEntryName.trim() || !newEntryPack || createMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────── */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Compendium Entry</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <strong>{selectedEntry?.data?.name || 'this entry'}</strong> from the compendium? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Import Confirmation ──────────────────────────── */}
      <Dialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import to World</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Import <strong>{selectedEntry?.data?.name || 'this entry'}</strong> from the compendium
            into the world? This creates a copy in the world documents that you can edit freely.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
