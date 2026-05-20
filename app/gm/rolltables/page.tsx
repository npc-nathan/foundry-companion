'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { relay } from '@/lib/relay';
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
import { toast } from 'sonner';
import {
  Dices,
  Download,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  ChevronRight,
  ChevronDown,
  Edit,
  Save,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface RollTableEntry {
  _id: string;
  name: string;
  type?: string;
  uuid?: string;
  formula?: string;
  img?: string;
  description?: string;
  results?: RollResultData[];
  replacement?: boolean;
  displayRoll?: boolean;
  folder?: string | null;
  sort?: number;
}

interface RollResultData {
  _id: string;
  type: 'text' | 'entity' | 'compendium';
  weight: number;
  range: [number, number];
  drawn: boolean;
  name: string;
  img?: string;
  description: string;
  collection?: string;
  resultId?: string;
}

interface FolderNode {
  _id: string;
  name: string;
  type: string;
  children?: FolderNode[];
  entries?: RollTableEntry[];
}

// ─── Entity Type Icon ───────────────────────────────────────

function EntryIcon() {
  return (
    <div className="h-4 w-4 flex items-center justify-center">
      <Dices className="h-3.5 w-3.5 text-primary/70" />
    </div>
  );
}

// ─── Left Panel: Folder Tree ───────────────────────────────

function FolderTreeItem({
  folder,
  depth,
  expandedFolders,
  toggleFolder,
  selectedId,
  onSelect,
}: {
  folder: FolderNode;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  selectedId: string | null;
  onSelect: (entry: RollTableEntry) => void;
}) {
  const isExpanded = expandedFolders.has(folder._id);
  const hasEntries = folder.entries && folder.entries.length > 0;
  const subFolders = folder.children?.filter((c) => c.type === 'folder') || [];

  return (
    <div>
      <button
        onClick={() => toggleFolder(folder._id)}
        className="flex items-center gap-1.5 w-full px-2 py-1 text-xs hover:bg-muted/50 rounded transition-colors text-left"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        {isExpanded ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        )}
        <span className="truncate">{folder.name}</span>
        {hasEntries && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            {folder.entries!.length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div>
          {subFolders.map((child) => (
            <FolderTreeItem
              key={child._id}
              folder={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
          {folder.entries?.map((entry) => (
            <button
              key={entry._id}
              onClick={() => onSelect(entry)}
              className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded transition-colors text-left ${
                selectedId === entry.uuid || selectedId === entry._id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted/50'
              }`}
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              <EntryIcon formula={entry.formula} />
              <span className="truncate">{entry.name}</span>
              {entry.formula && (
                <span className="text-[10px] ml-auto px-1 py-0.5 rounded bg-primary/10 text-primary font-mono">
                  {entry.formula}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Roll Table Viewer ─────────────────────────────────────

function RollTableViewer({
  entry,
  isCompendium,
  onRoll,
  onImport,
  onEdit,
  onDelete,
  rolling,
  lastRoll,
}: {
  entry: RollTableEntry;
  isCompendium: boolean;
  onRoll: () => void;
  onImport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  rolling: boolean;
  lastRoll: { total: number; formula: string; results: { text: string; img?: string }[] } | null;
}) {
  const results = entry.results || [];

  return (
    <div className="space-y-3 text-sm">
      {/* Header: name + formula badge + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dices className="h-5 w-5 text-primary/70" />
          <h2 className="text-lg font-semibold">{entry.name}</h2>
          {entry.formula && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold">
              {entry.formula}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="default" onClick={onRoll} disabled={rolling} className="h-7 text-xs">
            <Dices className="h-3 w-3 mr-1" />
            {rolling ? 'Rolling...' : 'Roll'}
          </Button>
          {isCompendium ? (
            <Button size="sm" variant="outline" onClick={onImport} className="h-7 text-xs">
              <Download className="h-3 w-3 mr-1" />
              Import
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onEdit} className="h-7 text-xs">
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={onDelete} className="h-7 text-xs">
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Settings badges */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`px-2 py-0.5 rounded ${entry.replacement ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
          {entry.replacement ? 'Replace' : 'No Replace'}
        </span>
        <span className={`px-2 py-0.5 rounded ${entry.displayRoll ? 'bg-blue-500/10 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
          {entry.displayRoll ? 'Show Roll in Chat' : 'GM Only'}
        </span>
      </div>

      {/* Description */}
      {entry.description ? (
        <div
          className="text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: entry.description }}
        />
      ) : null}

      {/* Last roll result */}
      {lastRoll && (
        <div className="bg-primary/5 border border-primary/10 rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Roll Result</span>
            <span className="text-sm">
              {lastRoll.formula} → <strong>{lastRoll.total}</strong>
            </span>
          </div>
          <div className="space-y-1">
            {lastRoll.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1">
                {r.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.img} alt="" className="h-4 w-4 rounded" />
                )}
                <span className="font-medium">{r.text || 'Result'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Results ({results.length})
          </h3>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b text-xs">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Range</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Weight</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Result</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {results.map((r) => (
                  <tr key={r._id} className={`hover:bg-muted/30 ${r.drawn ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {r.range[0]}{r.range[1] !== r.range[0] ? `–${r.range[1]}` : ''}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.weight}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {r.img && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.img} alt="" className="h-5 w-5 rounded flex-shrink-0" />
                        )}
                        <span className="font-medium">{r.description || r.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-medium">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.drawn ? (
                        <span className="text-[10px] text-green-600 font-medium">Drawn</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-8">
          This roll table has no results defined
        </div>
      )}

      {/* Raw JSON */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Raw Data
        </summary>
        <pre className="mt-2 p-3 bg-muted rounded-md overflow-x-auto max-h-80 text-xs">
          {JSON.stringify(entry, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function RollTablesPage() {
  const queryClient = useQueryClient();

  // ── State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<RollTableEntry | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<{ total: number; formula: string; results: { text: string; img?: string }[] } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFormula, setEditFormula] = useState('');

  // ── Queries ──
  const { data: structureData, isLoading } = useQuery({
    queryKey: ['rolltables', 'structure'],
    queryFn: () => relay.getRollTables(),
  });

  // ── Extract tables from structure ──
  const worldTables = useMemo(() => {
    const tables: RollTableEntry[] = [];
    const folderList: FolderNode[] = [];

    if (!structureData) return { tables, folders: folderList };

    const d = structureData as Record<string, unknown>;
    const dataBlock = d.data as Record<string, unknown> | undefined;
    if (!dataBlock) return { tables, folders: folderList };

    // Extract unwiled roll tables from flat entities list
    const entitiesRaw = dataBlock.entities as Record<string, unknown> | undefined;
    const flatEntries: RollTableEntry[] = (
      (entitiesRaw?.rolltables as Record<string, unknown>[]) || []
    ).map((r) => ({
      _id: r._id as string,
      name: r.name as string,
      uuid: `RollTable.${r._id as string}`,
      formula: r.formula as string | undefined,
      img: r.img as string | undefined,
      folder: (r.folder as string) ?? null,
      sort: (r.sort as number) ?? 0,
    }));
    tables.push(...flatEntries);

    // Extract folder-assigned roll tables
    const foldersRaw = dataBlock.folders as Record<string, unknown> | undefined;
    if (foldersRaw) {
      for (const [name, f] of Object.entries(foldersRaw)) {
        const folder = f as Record<string, unknown>;
        const node: FolderNode = {
          _id: folder.id as string,
          name,
          type: 'folder',
          children: [],
          entries: [],
        };
        const nested = (folder.entities as Record<string, unknown>[]) || [];
        for (const e of nested) {
          if (e.documentName === 'RollTable') {
            const entry: RollTableEntry = {
              _id: e._id as string,
              name: e.name as string,
              uuid: `RollTable.${e._id as string}`,
              formula: (e as Record<string, unknown>).formula as string | undefined,
              img: e.img as string | undefined,
              folder: node._id,
              sort: (e.sort as number) ?? 0,
            };
            node.entries!.push(entry);
            tables.push(entry);
          }
        }
        if (node.entries!.length > 0 || nested.some((c) => c.type === 'folder')) {
          folderList.push(node);
        }
      }
    }

    // Sort
    for (const f of folderList) {
      f.entries!.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    }
    tables.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    folderList.sort((a, b) => a.name.localeCompare(b.name));

    return { tables, folders: folderList };
  }, [structureData]);

  // ── Select entry ──
  const handleSelect = useCallback(async (entry: RollTableEntry) => {
    setSelectedEntry(entry);
    setLastRoll(null);

    // If entry lacks full data (no formula), fetch it
    if (!entry.formula && entry.uuid) {
      try {
        const res = await relay.getRollTable(entry.uuid);
        const raw = res as Record<string, unknown>;
        // World tables return data nested under .data field
        const nested = (raw.data as Record<string, unknown>) ?? {};
        setSelectedEntry((prev) =>
          prev?.uuid === entry.uuid
            ? {
                ...prev,
                ...(nested as unknown as RollTableEntry),
              }
            : prev
        );
      } catch {
        // Use what we have
      }
    }
  }, []);

  // ── Toggle folders ──
  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Roll ──
  const handleRoll = useCallback(async () => {
    if (!selectedEntry?.uuid) return;
    setRolling(true);
    try {
      const res = await relay.rollTable(selectedEntry.uuid, false);
      const data = res as { success: boolean; result: string };
      if (data?.result) {
        const parsed = JSON.parse(data.result as string);
        setLastRoll(parsed);
      }
    } catch (e) {
      toast.error('Failed to roll: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setRolling(false);
    }
  }, [selectedEntry]);

  // ── Import ──
  const handleImport = useCallback(async () => {
    if (!selectedEntry?.uuid) return;
    try {
      await relay.importCompendiumEntry(selectedEntry.uuid);
      toast.success('Roll table imported to world');
      queryClient.invalidateQueries({ queryKey: ['rolltables'] });
    } catch {
      toast.error('Failed to import');
    }
  }, [selectedEntry, queryClient]);

  // ── Delete ──
  const deleteMutation = useMutation({
    mutationFn: () => relay.deleteRollTable(selectedEntry!.uuid!),
    onSuccess: () => {
      toast.success('Roll table deleted');
      setSelectedEntry(null);
      setShowDelete(false);
      queryClient.invalidateQueries({ queryKey: ['rolltables'] });
    },
    onError: () => toast.error('Failed to delete roll table'),
  });

  // ── Create ──
  const [newName, setNewName] = useState('');
  const [newFormula, setNewFormula] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      relay.createRollTable({ name: newName, formula: newFormula || '1d20' }),
    onSuccess: () => {
      toast.success('Roll table created');
      setShowCreate(false);
      setNewName('');
      setNewFormula('');
      queryClient.invalidateQueries({ queryKey: ['rolltables'] });
    },
    onError: () => toast.error('Failed to create roll table'),
  });

  // ── Edit ──
  const editMutation = useMutation({
    mutationFn: () =>
      relay.updateRollTable(selectedEntry!.uuid!, { name: editName, formula: editFormula }),
    onSuccess: () => {
      toast.success('Roll table updated');
      setShowEdit(false);
      setSelectedEntry((prev) => (prev ? { ...prev, name: editName, formula: editFormula } : null));
      queryClient.invalidateQueries({ queryKey: ['rolltables'] });
    },
    onError: () => toast.error('Failed to update roll table'),
  });

  // ── Filtered search ──
  const filteredWorldTables = useMemo(() => {
    if (!searchQuery) return { tables: worldTables.tables, folders: worldTables.folders };
    const q = searchQuery.toLowerCase();
    return {
      tables: worldTables.tables.filter((t) => t.name.toLowerCase().includes(q)),
      folders: worldTables.folders,
    };
  }, [worldTables, searchQuery]);

  const isCompendium = selectedEntry?.uuid?.startsWith('Compendium.');

  return (
    <div className="flex h-[calc(100vh-theme(spacing.12))] gap-4 p-4">
      {/* ─── Left Panel ─── */}
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Roll Tables</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search roll tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="text-xs text-muted-foreground px-2 py-4 text-center">Loading...</div>
                ) : (
                  <>
                    {/* World roll table folders */}
                    {filteredWorldTables.folders.map((folder) => (
                      <FolderTreeItem
                        key={folder._id}
                        folder={folder}
                        depth={0}
                        expandedFolders={expandedFolders}
                        toggleFolder={toggleFolder}
                        selectedId={selectedEntry?.uuid || selectedEntry?._id || null}
                        onSelect={handleSelect}
                      />
                    ))}

                    {/* Ungrouped world tables */}
                    {filteredWorldTables.tables
                      .filter((t) => !t.folder)
                      .map((entry) => (
                        <button
                          key={entry._id}
                          onClick={() => handleSelect(entry)}
                          className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded transition-colors text-left ${
                            selectedEntry?.uuid === entry.uuid || selectedEntry?._id === entry._id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <EntryIcon formula={entry.formula} />
                          <span className="truncate">{entry.name}</span>
                          {entry.formula && (
                            <span className="text-[10px] ml-auto px-1 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              {entry.formula}
                            </span>
                          )}
                        </button>
                      ))}

                    {/* Ungrouped world tables */}
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ─── Right Panel ─── */}
      <div className="flex-1 flex flex-col gap-3">
        <Card className="flex-1 flex flex-col">
          {selectedEntry ? (
            <ScrollArea className="flex-1">
              <CardContent className="p-4">
                <RollTableViewer
                  entry={selectedEntry}
                  isCompendium={!!isCompendium}
                  onRoll={handleRoll}
                  onImport={handleImport}
                  onEdit={() => {
                    setEditName(selectedEntry.name);
                    setEditFormula(selectedEntry.formula || '');
                    setShowEdit(true);
                  }}
                  onDelete={() => setShowDelete(true)}
                  rolling={rolling}
                  lastRoll={lastRoll}
                />
              </CardContent>
            </ScrollArea>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Dices className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a roll table to view its contents</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* ─── Create Dialog ─── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Roll Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Roll Table"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) createMutation.mutate();
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Formula</label>
              <Input
                value={newFormula}
                onChange={(e) => setNewFormula(e.target.value)}
                placeholder="1d20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Defaults to 1d20 if left blank
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Roll Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim()) editMutation.mutate();
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Formula</label>
              <Input
                value={editFormula}
                onChange={(e) => setEditFormula(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button onClick={() => editMutation.mutate()} disabled={!editName.trim()}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─── */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Roll Table</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{selectedEntry?.name}</strong>? This action cannot be undone.
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
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
