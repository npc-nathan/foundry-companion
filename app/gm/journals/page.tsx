'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  ChevronRight,
  ChevronDown,
  Edit,
  Save,
  X,
  Image,
  Video,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface JournalStub {
  _id: string;
  uuid: string;
  name: string;
  folder: string | null;
  sort: number;
}

interface JournalPage {
  _id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'pdf';
  text?: { content: string; format: number };
  image?: { caption: string };
  video?: { controls: boolean; volume: number };
  src?: string | null;
  sort: number;
}

interface JournalFull {
  _id: string;
  name: string;
  folder: string | null;
  pages: JournalPage[];
  ownership: Record<string, number>;
  sort: number;
  flags: Record<string, unknown>;
}

interface FolderNode {
  id: string;
  uuid: string;
  name: string;
  type: string;
  children: FolderNode[];
  entities: JournalStub[];
}

// ─── Data Extraction ───────────────────────────────────────

function extractJournals(data: unknown): {
  folders: FolderNode[];
  unfiled: JournalStub[];
} {
  const d = data as Record<string, unknown> | undefined;
  const dataBlock = d?.data as Record<string, unknown> | undefined;

  const foldersRaw = dataBlock?.folders as Record<string, unknown> | undefined;
  const entitiesRaw = dataBlock?.entities as Record<string, unknown> | undefined;

  // Read unfiled journals from flat entities list
  const flatEntries: JournalStub[] = (
    (entitiesRaw?.journalentrys as Record<string, unknown>[]) || []
  ).map((j) => ({
    _id: j._id as string,
    uuid: `JournalEntry.${j._id as string}`,
    name: j.name as string,
    folder: (j.folder as string) ?? null,
    sort: (j.sort as number) ?? 0,
  }));

  // Also read folder-assigned journals from inside folders' nested entities arrays
  const folderEntries: JournalStub[] = [];
  if (foldersRaw) {
    for (const f of Object.values(foldersRaw)) {
      const folder = f as Record<string, unknown>;
      const folderId = folder.id as string;
      const nested = (folder.entities as Record<string, unknown>[]) || [];
      for (const e of nested) {
        folderEntries.push({
          _id: e._id as string,
          uuid: `JournalEntry.${e._id as string}`,
          name: e.name as string,
          folder: folderId,
          sort: (e.sort as number) ?? 0,
        });
      }
    }
  }

  // Merge both sources (they should be mutually exclusive)
  const journalEntities = [...flatEntries, ...folderEntries];

  // Build folder tree
  const folderMap = new Map<string, FolderNode>();
  const folderList: FolderNode[] = [];

  if (foldersRaw) {
    for (const [name, f] of Object.entries(foldersRaw)) {
      const folder = f as Record<string, unknown>;
      const node: FolderNode = {
        id: folder.id as string,
        uuid: folder.uuid as string,
        name,
        type: folder.type as string,
        children: [],
        entities: [],
      };
      folderMap.set(node.id, node);
      folderList.push(node);
    }
  }

  // Assign entities to folders
  const unfiled: JournalStub[] = [];
  for (const j of journalEntities) {
    if (j.folder && folderMap.has(j.folder)) {
      folderMap.get(j.folder)!.entities.push(j);
    } else {
      unfiled.push(j);
    }
  }

  // Sort by sort order
  for (const f of folderList) {
    f.entities.sort((a, b) => a.sort - b.sort);
  }
  unfiled.sort((a, b) => a.sort - b.sort);
  folderList.sort((a, b) => a.name.localeCompare(b.name));

  return { folders: folderList, unfiled };
}

// ─── Page Icon ──────────────────────────────────────────────

function PageTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'image':
      // eslint-disable-next-line jsx-a11y/alt-text -- Lucide icon component, not HTML <img>
      return <Image className="h-3 w-3" aria-hidden="true" />;
    case 'video':
      return <Video className="h-3 w-3" />;
    case 'pdf':
      return <FileText className="h-3 w-3" />;
    default:
      return <BookText className="h-3 w-3" />;
  }
}

// ─── Main Page ──────────────────────────────────────────────

export default function JournalsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newJournalName, setNewJournalName] = useState('');
  const [newJournalFolder, setNewJournalFolder] = useState<string | null>(null);

  // Edit state
  const [editName, setEditName] = useState('');
  const [editPageIndex, setEditPageIndex] = useState(0);
  const [editPageName, setEditPageName] = useState('');
  const [editPageContent, setEditPageContent] = useState('');
  const [newPages, setNewPages] = useState<{ name: string; content: string; type: string }[]>([]);
  // Track unsaved edits to existing pages — keyed by page index
  const dirtyPagesRef = useRef<Map<number, { name: string; content: string }>>(new Map());

  // Track pages deleted in edit mode (by _id) — cleared on save or cancel
  const [deletedPageIds, setDeletedPageIds] = useState<string[]>([]);
  const deletedPageIdsRef = useRef<string[]>([]);
  useEffect(() => {
    deletedPageIdsRef.current = deletedPageIds;
  }, [deletedPageIds]);

  // ─── Queries ──────────────────────────────────────────────

  const { data: listData, isLoading } = useQuery({
    queryKey: ['journals'],
    queryFn: () => relay.getJournals(),
  });

  const { data: fullJournal, isLoading: loadingJournal } = useQuery({
    queryKey: ['journal', selectedId],
    queryFn: () => relay.getJournal(selectedId!),
    enabled: !!selectedId,
  });

  const journalData = fullJournal as { data?: JournalFull } | undefined;

  const { folders, unfiled } = useMemo(() => extractJournals(listData), [listData]);

  // ─── Mutations ────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () =>
      relay.createJournal({
        name: newJournalName,
        pages: [{ name: 'Page 1', content: '<p>New journal entry</p>' }],
        ...(newJournalFolder ? { folder: newJournalFolder } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      setShowCreate(false);
      setNewJournalName('');
      toast.success('Journal created');
    },
    onError: (err) => toast.error(String(err)),
  });

  // ─── Fix the saveMutation ────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No journal selected');
      const journal = journalData?.data;
      if (!journal) throw new Error('Journal data not loaded');

      const deletedIds = [...deletedPageIdsRef.current];

      // Capture current page's edit if editing an existing page
      if (editPageIndex < journal.pages.length) {
        dirtyPagesRef.current.set(editPageIndex, {
          name: editPageName,
          content: editPageContent,
        });
      }

      // Capture current page if editing a pending new page
      const pendingPageIndex = editPageIndex - journal.pages.length;
      const pendingNewPages =
        pendingPageIndex >= 0 && pendingPageIndex < newPages.length
          ? newPages.map((p, i) =>
              i === pendingPageIndex ? { ...p, name: editPageName, content: editPageContent } : p,
            )
          : [...newPages];

      // Build final pages list: filter deleted, then apply dirty edits by renderable index
      const existingPages = journal.pages.filter((p) => !deletedIds.includes(p._id));
      const finalExisting = existingPages.map((page, idx) => {
        const dirty = dirtyPagesRef.current.get(idx);
        if (dirty) {
          return {
            ...page,
            name: dirty.name,
            text: { content: dirty.content, format: page.text?.format ?? 1 },
          };
        }
        return page;
      });

      // Append new pages
      const finalPages = [
        ...finalExisting,
        ...pendingNewPages.map((np) => ({
          name: np.name,
          type: np.type || 'text',
          text: { content: np.content, format: 1 },
          sort: finalExisting.length,
        })),
      ];

      // Delete marked pages via execute-js (Foundry requires this)
      const extractedUuid = selectedId.replace('JournalEntry.', '');
      for (const pageId of deletedIds) {
        const result = await relay.executeJs(
          `const j = game.journal.get("${extractedUuid}"); await j.deleteEmbeddedDocuments("JournalEntryPage", ["${pageId}"]); return j.pages.size;`,
        );
        const resultData = result as { success?: boolean; error?: string };
        if (resultData.success === false) {
          throw new Error(`Failed to delete page: ${resultData.error}`);
        }
      }

      // Update the journal
      return relay.updateJournal(selectedId, {
        name: editName,
        pages: finalPages,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      setViewMode('view');
      setNewPages([]);
      setDeletedPageIds([]);
      dirtyPagesRef.current.clear();
      toast.success('Journal saved');
    },
    onError: (err) => toast.error(String(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => relay.deleteJournal(selectedId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      setSelectedId(null);
      setShowDelete(false);
      toast.success('Journal deleted');
    },
    onError: (err) => toast.error(String(err)),
  });

  // ─── Filtered lists ───────────────────────────────────────

  const filterJournals = (list: JournalStub[]) =>
    search ? list.filter((j) => j.name.toLowerCase().includes(search.toLowerCase())) : list;

  const allJournalsFlat = useMemo(() => {
    const result: JournalStub[] = [];
    for (const f of folders) {
      result.push(...f.entities);
    }
    result.push(...unfiled);
    return result;
  }, [folders, unfiled]);

  const filteredCount = search
    ? allJournalsFlat.filter((j) => j.name.toLowerCase().includes(search.toLowerCase())).length
    : allJournalsFlat.length;

  // ─── Select journal ───────────────────────────────────────

  const selectJournal = useCallback((id: string) => {
    setSelectedId(id);
    setViewMode('view');
    setEditPageIndex(0);
  }, []);

  // ─── Switch to edit mode ──────────────────────────────────

  const enterEdit = useCallback(() => {
    const j = journalData?.data;
    if (!j) return;
    setDeletedPageIds([]);
    setEditName(j.name);
    const page = j.pages.at(editPageIndex);
    if (page) {
      setEditPageName(page.name);
      setEditPageContent(page.text?.content || '');
    } else if (editPageIndex >= j.pages.length) {
      // Restore pending new page state
      const npIndex = editPageIndex - j.pages.length;
      const np = newPages.at(npIndex);
      if (np) {
        setEditPageName(np.name);
        setEditPageContent(np.content);
      }
    }
    setViewMode('edit');
  }, [journalData, editPageIndex, newPages]);

  // ─── Folder toggle ────────────────────────────────────────

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Get available folder IDs for create dialog ──────────

  const folderOptions = useMemo(() => folders.map((f) => ({ id: f.id, name: f.name })), [folders]);

  // ─── Render ───────────────────────────────────────────────

  // Compute selected journal from the filtered list
  const selectedJournal = journalData?.data;
  const pages = useMemo(() => selectedJournal?.pages || [], [selectedJournal]);
  const renderablePages = useMemo(() => {
    if (viewMode === 'edit') {
      const existing = pages.filter((p) => !deletedPageIds.includes(p._id));
      return [
        ...existing,
        ...newPages.map((np, i) => ({
          ...np,
          _id: `pending_${i}`,
          text: { content: np.content, format: 1 as const },
          type: np.type as 'text',
          title: { show: true, level: 1 },
          image: {},
          video: { controls: true, volume: 0.5 },
          src: null,
          ownership: {},
          sort: existing.length + i,
        })),
      ];
    }
    return pages;
  }, [pages, newPages, viewMode, deletedPageIds]);
  const currentPage = renderablePages.at(editPageIndex);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight heading-themed heading-accent heading-accent-if-defined">Journals</h1>
          <p className="text-sm text-muted-foreground">{allJournalsFlat.length} entries</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Journal
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* ─── Left Panel: Journal List ──────────────────────── */}
        <Card className="w-72 shrink-0 flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter journals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredCount} journal{filteredCount !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            <ScrollArea className="h-full">
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
              ) : folders.length === 0 && unfiled.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No journals found
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {/* Folders */}
                  {folders.map((folder) => {
                    const filteredEntities = filterJournals(folder.entities);
                    const isExpanded = expandedFolders.has(folder.id);
                    return (
                      <div key={folder.id}>
                        <button
                          onClick={() => toggleFolder(folder.id)}
                          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent text-muted-foreground"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {isExpanded ? (
                            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <Folder className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="truncate flex-1 text-left">{folder.name}</span>
                          <span className="text-[10px] tabular-nums">
                            {filteredEntities.length}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="ml-3 border-l pl-1 space-y-0.5">
                            {filteredEntities.length === 0 ? (
                              <p className="px-2 py-1 text-xs text-muted-foreground italic">
                                (empty)
                              </p>
                            ) : (
                              filteredEntities.map((j) => (
                                <button
                                  key={j._id}
                                  onClick={() => selectJournal(j.uuid)}
                                  className={`flex items-center gap-2 w-full px-2 py-1 rounded-md text-sm transition-colors ${
                                    selectedId === j.uuid
                                      ? 'bg-accent text-accent-foreground font-medium'
                                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                                  }`}
                                >
                                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{j.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Unfiled */}
                  {unfiled.length > 0 && (
                    <div className="pt-2">
                      <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Unfiled
                      </div>
                      {filterJournals(unfiled).map((j) => (
                        <button
                          key={j._id}
                          onClick={() => selectJournal(j.uuid)}
                          className={`flex items-center gap-2 w-full px-2 py-1 rounded-md text-sm transition-colors ${
                            selectedId === j.uuid
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                          }`}
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{j.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ─── Right Panel: Journal Reader/Editor ──────────── */}
        <Card className="flex-1 flex flex-col min-w-0">
          {!selectedJournal ? (
            <CardContent className="p-8 text-center text-muted-foreground flex-1 flex items-center justify-center">
              <div>
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a journal to view</p>
              </div>
            </CardContent>
          ) : loadingJournal ? (
            <CardContent className="p-8 text-center text-muted-foreground flex-1 flex items-center justify-center">
              <p>Loading journal...</p>
            </CardContent>
          ) : (
            <>
              {/* Journal header */}
              <CardHeader className="pb-3 shrink-0 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {viewMode === 'edit' ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-lg font-bold h-9"
                    />
                  ) : (
                    <CardTitle className="text-lg truncate">{selectedJournal.name}</CardTitle>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {pages.length} page{pages.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {viewMode === 'view' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={enterEdit}
                      disabled={!selectedJournal}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewMode('view');
                          setDeletedPageIds([]);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
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

              {/* Page tabs */}
              {pages.length > 0 && (
                <div className="px-6 shrink-0">
                  <div className="flex items-center gap-1 border-b overflow-x-auto">
                    {renderablePages.map((page, i) => (
                      <button
                        key={page._id}
                        onClick={() => {
                          // ── Save current page edits ──
                          if (editPageIndex < pages.length) {
                            // Existing page — save to dirtyPages
                            dirtyPagesRef.current.set(editPageIndex, {
                              name: editPageName,
                              content: editPageContent,
                            });
                          } else {
                            // New page — save to newPages
                            setNewPages((prev) => {
                              const npIdx = editPageIndex - pages.length;
                              return prev.map((p, i) =>
                                i === npIdx
                                  ? { ...p, name: editPageName, content: editPageContent }
                                  : p,
                              );
                            });
                          }
                          // ── Switch to target page ──
                          setEditPageIndex(i);
                          // ── Load target page's data into edit fields ──
                          if (i < pages.length) {
                            const dirty = dirtyPagesRef.current.get(i);
                            if (dirty) {
                              setEditPageName(dirty.name);
                              setEditPageContent(dirty.content);
                            } else {
                              const tp = pages.at(i);
                              setEditPageName(tp?.name || '');
                              setEditPageContent(tp?.text?.content || '');
                            }
                          } else {
                            const npIdx = i - pages.length;
                            const np = newPages.at(npIdx);
                            if (np) {
                              setEditPageName(np.name);
                              setEditPageContent(np.content);
                            } else {
                              setEditPageName(`Page ${i + 1}`);
                              setEditPageContent('<p>New page</p>');
                            }
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors shrink-0 ${
                          editPageIndex === i
                            ? 'border-primary text-foreground font-medium'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <PageTypeIcon type={page.type} />
                        <span className="truncate max-w-24">{page.name}</span>
                        {viewMode === 'edit' && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              // ── Delete page ──
                              if (i < pages.length) {
                                // Existing page — mark for deletion
                                const page = pages.at(i);
                                if (page) {
                                  const pid = page._id;
                                  setDeletedPageIds((prev) => [...prev, pid]);
                                  // If we just deleted the current page, adjust index
                                  if (editPageIndex === i) {
                                    const remainingCount = renderablePages.length - 1;
                                    if (remainingCount > 0) {
                                      setEditPageIndex(Math.min(i, remainingCount - 1));
                                    }
                                  } else if (editPageIndex > i) {
                                    setEditPageIndex((prev) => prev - 1);
                                  }
                                }
                              } else {
                                // Pending new page — just remove
                                const npIdx = i - pages.length;
                                setNewPages((prev) => {
                                  const next = [...prev];
                                  next.splice(npIdx, 1);
                                  return next;
                                });
                                // Adjust index
                                if (editPageIndex === i) {
                                  const newTotal = pages.length + newPages.length - 1;
                                  setEditPageIndex(newTotal > 0 ? Math.min(i, newTotal - 1) : 0);
                                } else if (editPageIndex > i) {
                                  setEditPageIndex((prev) => prev - 1);
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                e.currentTarget.click();
                              }
                            }}
                            className="ml-0.5 p-0.5 rounded cursor-pointer hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors inline-flex items-center"
                            title="Delete page"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    ))}
                    {viewMode === 'edit' && (
                      <button
                        onClick={() => {
                          const npIndex = pages.length + newPages.length;
                          const name = `Page ${npIndex + 1}`;
                          setNewPages((prev) => [
                            ...prev,
                            { name, content: '<p>New page</p>', type: 'text' },
                          ]);
                          setEditPageIndex(npIndex);
                          setEditPageName(name);
                          setEditPageContent('<p>New page</p>');
                        }}
                        className="flex items-center gap-1 px-2 py-2 text-xs border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors shrink-0"
                        title="Add page"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Page content */}
              <CardContent className="p-0 flex-1 min-h-0">
                <ScrollArea className="h-full">
                  {currentPage && editPageIndex < pages.length ? (
                    viewMode === 'edit' ? (
                      <div className="p-4 space-y-3">
                        <Input
                          value={editPageName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditPageName(val);
                            dirtyPagesRef.current.set(editPageIndex, {
                              name: val,
                              content: editPageContent,
                            });
                          }}
                          placeholder="Page title"
                          className="font-medium"
                        />
                        <textarea
                          value={editPageContent}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditPageContent(val);
                            dirtyPagesRef.current.set(editPageIndex, {
                              name: editPageName,
                              content: val,
                            });
                          }}
                          className="w-full h-[400px] font-mono text-sm p-3 rounded-md border bg-background resize-y"
                          placeholder="HTML content..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Edit page content as HTML. Supported: paragraphs, lists, tables, images,
                          links.
                        </p>
                      </div>
                    ) : currentPage.type === 'image' ? (
                      <div className="p-4">
                        {currentPage.src ? (
                          <div className="space-y-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={currentPage.src}
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
                          <p className="text-muted-foreground text-sm p-4 text-center">
                            No image source
                          </p>
                        )}
                      </div>
                    ) : currentPage.type === 'video' ? (
                      <div className="p-4">
                        {currentPage.src ? (
                          <video
                            src={currentPage.src}
                            controls={currentPage.video?.controls ?? true}
                            className="max-w-full rounded-md"
                          />
                        ) : (
                          <p className="text-muted-foreground text-sm p-4 text-center">
                            No video source
                          </p>
                        )}
                      </div>
                    ) : (
                      <div
                        className="p-4 prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: currentPage.text?.content || '<p>No content</p>',
                        }}
                      />
                    )
                  ) : editPageIndex >= pages.length && viewMode === 'edit' ? (
                    <div className="p-4 space-y-3">
                      <Input
                        value={editPageName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditPageName(val);
                          const npIdx = editPageIndex - pages.length;
                          setNewPages((prev) => {
                            return prev.map((p, i) => (i === npIdx ? { ...p, name: val } : p));
                          });
                        }}
                        placeholder="Page title"
                        className="font-medium"
                      />
                      <textarea
                        value={editPageContent}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditPageContent(val);
                          const npIdx = editPageIndex - pages.length;
                          setNewPages((prev) => {
                            return prev.map((p, i) => (i === npIdx ? { ...p, content: val } : p));
                          });
                        }}
                        className="w-full h-[400px] font-mono text-sm p-3 rounded-md border bg-background resize-y"
                        placeholder="HTML content..."
                      />
                      <p className="text-xs text-muted-foreground">New page — save to persist.</p>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground space-y-3">
                      <p>No pages in this journal</p>
                      {viewMode === 'edit' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const name = 'Page 1';
                            setNewPages((prev) => [
                              ...prev,
                              { name, content: '<p>New page</p>', type: 'text' },
                            ]);
                            setEditPageIndex(0);
                            setEditPageName(name);
                            setEditPageContent('<p>New page</p>');
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Page
                        </Button>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* ─── Create Dialog ─────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                value={newJournalName}
                onChange={(e) => setNewJournalName(e.target.value)}
                placeholder="Journal name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newJournalName.trim()) {
                    createMutation.mutate();
                  }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Folder (optional)</label>
              <Select value={newJournalFolder} onValueChange={(v) => setNewJournalFolder(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No folder</SelectItem>
                  {folderOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
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
              disabled={!newJournalName.trim() || createMutation.isPending}
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
            <DialogTitle>Delete Journal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <strong>{selectedJournal?.name || 'this journal'}</strong>? This action cannot be
            undone.
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
    </div>
  );
}
