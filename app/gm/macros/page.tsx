'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { relay } from '@/lib/relay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Play, Save, Trash2, Search, Code2, GitBranch, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── CodeMirror dynamic import ──────────────────────────────
import dynamic from 'next/dynamic'

const CodeEditor = dynamic(
  () => import('@/components/macros/code-editor'),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading editor...</div> }
)

const NodeEditor = dynamic(
  () => import('@/components/macros/node-editor'),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading node editor...</div> }
)

// ─── Types ──────────────────────────────────────────────────
interface Macro {
  _id: string
  name: string
  type: string
  scope: string
  command: string
  img?: string
  folder?: string
  flags?: Record<string, unknown>
}

type Tab = 'code' | 'nodes'

export default function GMMacrosPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('code')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('script')
  const [editScope, setEditScope] = useState('global')
  const [editCommand, setEditCommand] = useState('')
  const [isNew, setIsNew] = useState(false)
  const hasUnsaved = useRef(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['macros'],
    queryFn: () => relay.getMacros(),
    refetchInterval: 30_000,
  })

  const rawMacros: unknown[] = data && 'macros' in data
    ? (data as unknown as { macros: unknown[] }).macros
    : data && 'data' in data
      ? (data as unknown as { data: unknown[] }).data
      : Array.isArray(data) ? data : []
  const macros: Macro[] = rawMacros.map((m) => {
    const macro = m as Record<string, unknown>
    return {
    _id: (macro.uuid as string) || (macro._id as string) || '',
    name: (macro.name as string) || '',
    type: (macro.type as string) || 'script',
    scope: (macro.scope as string) || 'global',
    command: (macro.command as string) || '',
    img: macro.img as string | undefined,
    folder: macro.folder as string | undefined,
    flags: macro.flags as Record<string, unknown> | undefined,
  }})

  const filteredMacros = macros.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedMacro = macros.find((m) => m._id === selectedId)

  // ─── Mutations ──────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        return relay.createMacro({ name: editName, type: editType, scope: editScope, command: editCommand })
      }
      if (!selectedId) return
      return relay.updateMacro(selectedId, { name: editName, type: editType, scope: editScope, command: editCommand })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macros'] })
      hasUnsaved.current = false
      setIsNew(false)
      toast.success(isNew ? 'Macro created' : 'Macro saved')
    },
    onError: () => toast.error('Failed to save macro'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('No macro selected')
      return relay.deleteMacro(selectedId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['macros'] })
      setSelectedId(null)
      setEditCommand('')
      setEditName('')
      setIsNew(false)
      toast.success('Macro deleted')
    },
    onError: () => toast.error('Failed to delete macro'),
  })

  const runMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('No macro selected')
      return relay.executeMacro(selectedId)
    },
    onSuccess: () => toast.success('Macro executed'),
    onError: () => toast.error('Failed to execute macro'),
  })

  // ─── Helpers ────────────────────────────────────────────

  const selectMacro = useCallback((m: Macro) => {
    setSelectedId(m._id)
    setEditName(m.name)
    setEditType(m.type || 'script')
    setEditScope(m.scope || 'global')
    setEditCommand(m.command || '')
    setIsNew(false)
    hasUnsaved.current = false
  }, [])

  const newMacro = useCallback(() => {
    setSelectedId(null)
    setEditName('')
    setEditType('script')
    setEditScope('global')
    setEditCommand('// New macro\n')
    setIsNew(true)
    hasUnsaved.current = false
  }, [])

  // Sync command when CodeMirror changes
  const onCommandChange = useCallback((val: string) => {
    setEditCommand(val)
    hasUnsaved.current = true
  }, [])

  const onFieldChange = useCallback((field: string, val: string) => {
    if (field === 'name') setEditName(val)
    if (field === 'type') setEditType(val)
    if (field === 'scope') setEditScope(val)
    hasUnsaved.current = true
  }, [])

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b px-4">
        <button
          onClick={() => setTab('code')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            tab === 'code' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Code2 className="h-4 w-4" />
          Code Editor
        </button>
        <button
          onClick={() => setTab('nodes')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            tab === 'nodes' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <GitBranch className="h-4 w-4" />
          Node Builder
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {tab === 'code' ? (
          <>
            {/* Left panel: Macro list */}
            <div className="w-72 shrink-0 border-r flex flex-col bg-muted/20">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search macros..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Button onClick={newMacro} size="sm" className="w-full mt-2 gap-1.5">
                  <Plus className="h-4 w-4" />
                  New Macro
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading && (
                  <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>
                )}
                {error && (
                  <div className="p-4 text-sm text-destructive text-center">Failed to load macros</div>
                )}
                {!isLoading && !error && filteredMacros.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground text-center">No macros found</div>
                )}
                {filteredMacros.map((macro) => (
                  <button
                    key={macro._id}
                    onClick={() => selectMacro(macro)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm border-b border-border/50 hover:bg-accent/50 transition-colors',
                      selectedId === macro._id && 'bg-accent border-l-2 border-l-primary'
                    )}
                  >
                    <div className="font-medium truncate">{macro.name || 'Unnamed'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {macro.type} · {macro.scope}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel: Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {(selectedMacro || isNew) ? (
                <>
                  {/* Metadata bar */}
                  <div className="flex items-center gap-3 p-3 border-b bg-muted/10">
                    <div className="flex-1">
                      <Input
                        placeholder="Macro name"
                        value={editName}
                        onChange={(e) => onFieldChange('name', e.target.value)}
                        className="h-9 text-sm font-medium"
                      />
                    </div>
                    <Select value={editType} onValueChange={(v) => v !== null && onFieldChange('type', v)}>
                      <SelectTrigger className="w-28 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="script">Script</SelectItem>
                        <SelectItem value="chat">Chat</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={editScope} onValueChange={(v) => v !== null && onFieldChange('scope', v)}>
                      <SelectTrigger className="w-28 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="actor">Actor</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runMutation.mutate()}
                        disabled={!selectedId || runMutation.isPending}
                        className="gap-1"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Run
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="gap-1"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isNew ? 'Create' : 'Save'}
                      </Button>
                      {!isNew && selectedId && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('Delete this macro?')) deleteMutation.mutate()
                          }}
                          disabled={deleteMutation.isPending}
                          className="gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* CodeMirror editor */}
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor value={editCommand} onChange={onCommandChange} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Terminal className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a macro or create a new one</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Node Builder tab */
          <div className="flex-1 flex flex-col min-h-0">
            <NodeEditor
              currentCode={editCommand}
              onCodeGenerated={onCommandChange}
              macroName={editName}
              macroType={editType}
              macroScope={editScope}
            />
          </div>
        )}
      </div>
    </div>
  )
}
