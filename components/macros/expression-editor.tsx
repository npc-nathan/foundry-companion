'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  X,
  FunctionSquare,
  Database,
  ChevronRight,
  ChevronDown,
  FileCode,
  Equal,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus as PlusIcon,
  Hash,
  Type,
  ToggleLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  buildDynamicContentTree,
  getPortFields,
  getScalarPortField,
  type DynamicContentNode,
  type DynamicContentPort,
  type SchemaField,
} from '@/lib/node-schemas'

// ─── ExpressionToCode — convert ExpressionConfig to JS ──

const OPERATOR_TO_JS: Record<string, string> = {
  equals: '===',
  not_equals: '!==',
  greater: '>',
  less: '<',
  greater_equal: '>=',
  less_equal: '<=',
  is_true: '=== true',
  is_false: '=== false',
}

type SiblingNodeData = { id: string; data: Record<string, unknown>; type?: string }
const dataVar = (nodeId: string, portId: string) =>
  `_d_${nodeId.replace(/[^a-zA-Z0-9]/g, '_')}_${portId}`

export function expressionConfigToCode(
  config: ExpressionConfig,
  parentNodeId: string,
  allNodes: SiblingNodeData[]
): string {
  const nodeMap = new Map(allNodes.map((n) => [n.id, n.data]))

  function resolveTerm(term: ExpressionTerm): string {
    if (term.type === 'dynamic' && term.sourceNodeId && term.sourcePortId) {
      const varName = dataVar(term.sourceNodeId, term.sourcePortId)
      if (term.fieldKey) {
        const parts = term.fieldKey.split('.')
        const [first, ...rest] = parts
        if (rest.length === 0) {
          return `${varName}["${first}"]`
        }
        return `${varName}["${first}"]${rest.map((p) => `["${p}"]`).join('')}`
      }
      return varName
    }
    // Literal: auto-detect number vs string
    const val = (term.value || '').trim()
    if (val === '') return '""'
    if (!isNaN(Number(val)) && val !== '') return val
    if (val === 'true') return 'true'
    if (val === 'false') return 'false'
    if (val === 'null') return 'null'
    if (val === 'undefined') return 'undefined'
    const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    return `"${escaped}"`
  }

  function renderOperator(leftCode: string, op: string, rightCode: string): string {
    if (op === 'contains') return `${leftCode}.includes(${rightCode})`
    if (op === 'starts_with') return `${leftCode}.startsWith(${rightCode})`
    if (op === 'ends_with') return `${leftCode}.endsWith(${rightCode})`
    if (op === 'empty') return `!${leftCode} || (typeof ${leftCode} === 'string' && ${leftCode}.trim() === '')`
    if (op === 'not_empty') return `${leftCode} !== null && ${leftCode} !== undefined && ${leftCode} !== ''`
    const jsOp = OPERATOR_TO_JS[op]
    if (jsOp) return `${leftCode} ${jsOp} ${rightCode}`
    return `${leftCode} === ${rightCode}`
  }

  if (config.mode === 'advanced') {
    // Advanced mode: the expression is raw JS
    let expr = config.expression || 'true'
    return expr
  }

  // Simple mode: rows
  if (!config.rows || config.rows.length === 0) return 'true'

  return config.rows
    .map((row, i) => {
      const leftCode = resolveTerm(row.left)
      const rightCode = resolveTerm(row.right)
      const condition = renderOperator(leftCode, row.operator, rightCode)
      if (i === 0) return condition
      const chain = row.chainOperator === 'and not' ? '&& !' : row.chainOperator === 'or' ? '||' : '&&'
      return `${chain} (${condition})`
    })
    .join(' ')
}

// ─── Types ──────────────────────────────────────────────

export type ExpressionTermType = 'dynamic' | 'literal'

export interface ExpressionTerm {
  type: ExpressionTermType
  sourceNodeId?: string
  sourcePortId?: string
  fieldKey?: string
  value?: string
}

export interface ExpressionRow {
  id: string
  left: ExpressionTerm
  operator: string
  right: ExpressionTerm
  chainOperator?: 'and' | 'or' | 'and not'
}

export interface ExpressionConfig {
  mode: 'simple' | 'advanced'
  rows: ExpressionRow[]
  expression: string
}

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'empty', label: 'is empty' },
    { value: 'not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '≠' },
    { value: 'greater', label: '>' },
    { value: 'less', label: '<' },
    { value: 'greater_equal', label: '≥' },
    { value: 'less_equal', label: '≤' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
  ],
  actor: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
  ],
  token: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
  ],
  scene: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
  ],
  object: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'empty', label: 'is empty' },
    { value: 'not_empty', label: 'is not empty' },
  ],
}

const CHAIN_OPTIONS = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
  { value: 'and not', label: 'AND NOT' },
]

const FUNCTIONS = [
  { value: 'equals(a, b)', label: 'equals', args: 'value, compare' },
  { value: 'greater(a, b)', label: 'greater', args: 'value, threshold' },
  { value: 'less(a, b)', label: 'less', args: 'value, threshold' },
  { value: 'contains(str, substr)', label: 'contains', args: 'string, substring' },
  { value: 'starts_with(str, pre)', label: 'starts_with', args: 'string, prefix' },
  { value: 'ends_with(str, suf)', label: 'ends_with', args: 'string, suffix' },
  { value: 'empty(value)', label: 'empty', args: 'value' },
  { value: 'not(a)', label: 'not', args: 'boolean' },
  { value: 'and(a, b)', label: 'and', args: 'a, b' },
  { value: 'or(a, b)', label: 'or', args: 'a, b' },
  { value: 'concat(a, b)', label: 'concat', args: 'a, b' },
  { value: 'length(value)', label: 'length', args: 'value' },
  { value: 'add(a, b)', label: 'add', args: 'a, b' },
  { value: 'subtract(a, b)', label: 'subtract', args: 'a, b' },
  { value: 'multiply(a, b)', label: 'multiply', args: 'a, b' },
  { value: 'if(cond, t, f)', label: 'if', args: 'condition, true_val, false_val' },
]

// ─── Helpers ────────────────────────────────────────────

let rowCounter = 0
function newRowId(): string {
  return `row-${Date.now()}-${++rowCounter}`
}

function defaultRow(): ExpressionRow {
  return {
    id: newRowId(),
    left: { type: 'literal' as const, value: '' },
    operator: 'equals',
    right: { type: 'literal' as const, value: '' },
    chainOperator: 'and',
  }
}

function detectFieldType(fieldKey: string): string {
  if (!fieldKey) return 'object'
  if (fieldKey.endsWith('.value') || fieldKey.endsWith('.max') || fieldKey.endsWith('.temp') || fieldKey.endsWith('.mod')) return 'number'
  if (fieldKey === 'level' || fieldKey === 'hp' || fieldKey === 'maxHp' || fieldKey === 'tempHp') return 'number'
  if (fieldKey === 'x' || fieldKey === 'y' || fieldKey === 'elevation' || fieldKey === 'width' || fieldKey === 'height') return 'number'
  if (fieldKey === 'locked' || fieldKey === 'hidden' || fieldKey === 'active' || fieldKey === 'navigation' || fieldKey === 'tokenVision' || fieldKey === 'fogExploration' || fieldKey === 'globalLight') return 'boolean'
  if (fieldKey === 'name' || fieldKey === 'type' || fieldKey === 'race' || fieldKey === 'class' || fieldKey === 'alignment' || fieldKey === 'size') return 'string'
  return 'string'
}

function getOperatorsForField(fieldKey: string, sourcePortType: string) {
  const type =
    sourcePortType === 'number' ? 'number' :
    sourcePortType === 'boolean' ? 'boolean' :
    sourcePortType === 'actor' || sourcePortType === 'token' || sourcePortType === 'scene' ?
      (fieldKey ? detectFieldType(fieldKey) : 'string') :
    'string'
  return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.string
}

// ─── Component ──────────────────────────────────────────

interface ExpressionEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (config: ExpressionConfig) => void
  initialConfig?: ExpressionConfig
  fieldLabel: string
  fieldDataType?: string
  // Node graph context for dynamic content tree
  allNodes: Array<{ id: string; data: { type: string; label: string } }>
  allEdges: Array<{ source: string; target: string; sourceHandle?: string | null }>
  currentNodeId: string
}

export function ExpressionEditor({
  open,
  onOpenChange,
  onSave,
  initialConfig,
  fieldLabel,
  allNodes,
  allEdges,
  currentNodeId,
}: ExpressionEditorProps) {
  const [mode, setMode] = useState<'simple' | 'advanced'>(initialConfig?.mode || 'simple')
  const [rows, setRows] = useState<ExpressionRow[]>(initialConfig?.rows?.length ? initialConfig.rows : [defaultRow()])
  const [expression, setExpression] = useState(initialConfig?.expression || '')
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})
  const [expandedPorts, setExpandedPorts] = useState<Record<string, boolean>>({})
  const [expandedFunctions, setExpandedFunctions] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'functions'>('content')
  const [activeInsertTarget, setActiveInsertTarget] = useState<{ rowId: string; side: 'left' | 'right' } | null>(null)
  const expressionRef = useRef<HTMLTextAreaElement>(null)

  const dynamicContent = useMemo(
    () => buildDynamicContentTree(allNodes, allEdges, currentNodeId),
    [allNodes, allEdges, currentNodeId]
  )

  // ─── Row management ─────────────────────────────────

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, defaultRow()])
  }, [])

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const updateRow = useCallback((id: string, field: string, value: unknown) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, [field]: value } : r
      )
    )
  }, [])

  const updateRowTerm = useCallback(
    (rowId: string, side: 'left' | 'right', updates: Partial<ExpressionTerm>) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, [side]: { ...r[side], ...updates } } : r
        )
      )
    },
    []
  )

  // ─── Dynamic content insertion ──────────────────────

  function getDefaultTarget(): { rowId: string; side: 'left' | 'right' } {
    return activeInsertTarget || (rows.length > 0 ? { rowId: rows[0].id, side: 'left' } : { rowId: '', side: 'left' })
  }

  function insertField(
    termRef: { rowId: string; side: 'left' | 'right' },
    content: DynamicContentNode,
    port: DynamicContentPort,
    field?: SchemaField
  ): void {
    updateRowTerm(termRef.rowId, termRef.side, {
      type: 'dynamic',
      sourceNodeId: content.nodeId,
      sourcePortId: port.portId,
      fieldKey: field?.key || '',
      value: field?.key
        ? `${content.nodeLabel}_${port.portLabel}${field.key ? `.${field.label}` : ''}`
        : `${content.nodeLabel}_${port.portLabel}`,
    })
  }

  const insertExpressionField = useCallback(
    (content: DynamicContentNode, port: DynamicContentPort, field?: SchemaField) => {
      const ref = field
        ? `@{outputs('${content.nodeId}')['${port.portId}']['${field.key}']}`
        : `@{outputs('${content.nodeId}')['${port.portId}']}`
      const ta = expressionRef.current
      if (ta) {
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const before = expression.substring(0, start)
        const after = expression.substring(end)
        const newVal = before + ref + after
        setExpression(newVal)
        const cursorPos = start + ref.length
        requestAnimationFrame(() => {
          ta.focus()
          ta.setSelectionRange(cursorPos, cursorPos)
        })
      } else {
        setExpression((prev) => prev + ref)
      }
    },
    [expression]
  )

  const insertFunction = useCallback(
    (fn: string) => {
      const snippet = fn.substring(0, fn.indexOf('(') + 1)
      const ta = expressionRef.current
      if (ta) {
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const before = expression.substring(0, start)
        const after = expression.substring(end)
        const newVal = before + snippet + after
        setExpression(newVal)
        const cursorPos = start + snippet.length
        requestAnimationFrame(() => {
          ta.focus()
          ta.setSelectionRange(cursorPos, cursorPos)
        })
      } else {
        setExpression((prev) => prev + snippet)
      }
    },
    [expression]
  )

  // ─── Term rendering ─────────────────────────────────

  function renderTerm(rowId: string, side: 'left' | 'right', term: ExpressionTerm) {
    const isDynamic = term.type === 'dynamic'
    return (
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {isDynamic ? (
          <div className="flex items-center gap-1 bg-cyan-900/30 border border-cyan-500/30 rounded px-1.5 py-0.5 text-xs max-w-[180px]">
            <Database className="h-3 w-3 text-cyan-400 shrink-0" />
            <span className="truncate text-cyan-200">{term.value || 'selected field'}</span>
            <button
              onClick={() => updateRowTerm(rowId, side, { type: 'literal', value: '' })}
              className="text-cyan-400 hover:text-cyan-200 ml-0.5"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ) : (
          <Input
            className="h-7 text-xs flex-1 min-w-0"
            value={term.value ?? ''}
            onChange={(e) => updateRowTerm(rowId, side, { value: e.target.value })}
            placeholder="value"
          />
        )}
        <FieldPickerButton
          rowId={rowId}
          side={side}
          term={term}
          dynamicContent={dynamicContent}
          onSelectField={(content, port, field) =>
            insertField({ rowId, side }, content, port, field)
          }
          onActivate={(rId, s) => setActiveInsertTarget({ rowId: rId, side: s })}
        />
      </div>
    )
  }

  // ─── Preview generation ─────────────────────────────

  const preview = useMemo(() => {
    if (mode === 'advanced') {
      return expression || '(empty expression — always passes)'
    }
    if (rows.length === 0) return 'true'
    return rows
      .map((row, i) => {
        const leftStr = row.left.type === 'dynamic'
          ? `${row.left.sourceNodeId?.slice(0, 8)}/${row.left.fieldKey || row.left.sourcePortId}`
          : (row.left.value || '?')
        const rightStr = row.right.type === 'dynamic'
          ? `${row.right.sourceNodeId?.slice(0, 8)}/${row.right.fieldKey || row.right.sourcePortId}`
          : (row.right.value || '?')
        const opLabel = OPERATORS_BY_TYPE.string.find((o) => o.value === row.operator)?.label || row.operator
        const prefix = i === 0 ? '' : ` ${row.chainOperator?.toUpperCase() || 'AND'} `
        return `${prefix}${leftStr} ${opLabel} ${rightStr}`
      })
      .join('')
  }, [mode, rows, expression])

  // ─── Save ───────────────────────────────────────────

  const handleSave = useCallback(() => {
    const config: ExpressionConfig = {
      mode,
      rows: mode === 'simple' ? rows : [],
      expression: mode === 'advanced' ? expression : '',
    }
    onSave(config)
    onOpenChange(false)
  }, [mode, rows, expression, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} dialogWidth="max-w-5xl">
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-cyan-400" />
            Expression Editor — {fieldLabel}
          </DialogTitle>
          <DialogDescription>
            Build expressions using fields from upstream nodes or type manually. Click fields in the Dynamic Content panel to insert them.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-xs text-muted-foreground">Mode:</Label>
          <div className="flex bg-muted rounded-md p-0.5">
            <button
              onClick={() => setMode('simple')}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                mode === 'simple' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'
              )}
            >
              Simple
            </button>
            <button
              onClick={() => setMode('advanced')}
              className={cn(
                'px-3 py-1 text-xs rounded transition-colors',
                mode === 'advanced' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted-foreground/10'
              )}
            >
              Advanced
            </button>
          </div>
        </div>

        <div className="flex gap-3 flex-1 min-h-0">
          {/* Left: Dynamic Content / Functions panel */}
          <div className="w-72 shrink-0 border rounded-md flex flex-col">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('content')}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
                  activeTab === 'content' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Database className="h-3 w-3 inline mr-1" />
                Content
              </button>
              <button
                onClick={() => setActiveTab('functions')}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
                  activeTab === 'functions' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FunctionSquare className="h-3 w-3 inline mr-1" />
                Functions
              </button>
            </div>

            <ScrollArea className="flex-1 p-2">
              {activeTab === 'content' && (
                dynamicContent.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">
                    No data-producing nodes upstream. Add nodes like Search Actors, Roll Dice, or Get Actor HP to see their fields here.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dynamicContent.map((content) => (
                      <div key={content.nodeId}>
                        <button
                          onClick={() =>
                            setExpandedNodes((p) => ({ ...p, [content.nodeId]: !p[content.nodeId] }))
                          }
                          className={cn(
                            "flex items-center gap-1 w-full text-left text-xs font-medium py-1 px-1 rounded transition-colors",
                            content.isConnected
                              ? "text-cyan-300 hover:text-cyan-200 hover:bg-cyan-900/20"
                              : "text-muted-foreground/40 cursor-not-allowed"
                          )}
                          title={content.isConnected ? "" : "Not connected — add a data edge from this node"}
                        >
                          {expandedNodes[content.nodeId] ? (
                            <ChevronDown className="h-3 w-3 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 shrink-0" />
                          )}
                          <Database className="h-3 w-3 shrink-0" />
                          <span className="truncate">{content.nodeLabel}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">
                            {content.ports.length}
                          </Badge>
                        </button>

                        {expandedNodes[content.nodeId] && (
                          <div className="ml-4 space-y-0.5">
                            {content.ports.map((port) => (
                              <div key={port.portId}>
                                <button
                                  onClick={() =>
                                    setExpandedPorts((p) => ({
                                      ...p,
                                      [content.nodeId + port.portId]: !p[content.nodeId + port.portId],
                                    }))
                                  }
                                  className="flex items-center gap-1 w-full text-left text-[11px] text-muted-foreground hover:text-foreground py-0.5 px-1 rounded hover:bg-accent/30 transition-colors"
                                >
                                  {port.fields.length > 1 || (port.fields.length === 1 && port.fields[0].key !== '') ? (
                                    expandedPorts[content.nodeId + port.portId] ? (
                                      <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                                    )
                                  ) : (
                                    <span className="w-2.5 shrink-0" />
                                  )}
                                  <span
                                    className={cn(
                                      'rounded-full w-2 h-2 shrink-0',
                                      port.portType === 'number' && 'bg-blue-400',
                                      port.portType === 'string' && 'bg-yellow-400',
                                      port.portType === 'boolean' && 'bg-purple-400',
                                      port.portType === 'actor' && 'bg-emerald-400',
                                      port.portType === 'token' && 'bg-rose-400',
                                      port.portType === 'scene' && 'bg-teal-400',
                                      (!port.portType || port.portType === 'object') && 'bg-cyan-400',
                                    )}
                                  />
                                  <span className="truncate">{port.portLabel}</span>
                                </button>

                                {expandedPorts[content.nodeId + port.portId] && (
                                  <div className="ml-4 space-y-0.5">
                                    {port.fields
                                      .filter((f) => f.key !== '') // Skip scalar ports
                                      .map((field) => (
                                        <button
                                          key={field.key}
                                          disabled={!content.isConnected}
                                          onClick={() => {
                                            if (content.isConnected && mode === 'advanced') {
                                              insertExpressionField(content, port, field)
                                            } else if (content.isConnected) {
                                              const target = getDefaultTarget()
                                              if (target.rowId) {
                                                insertField(target, content, port, field)
                                                setActiveInsertTarget(target)
                                              }
                                            }
                                          }}
                                          className={cn(
                                            "flex items-center gap-1 w-full text-left text-[11px] py-0.5 px-1.5 rounded transition-colors",
                                            content.isConnected
                                              ? "text-muted-foreground hover:text-cyan-300 hover:bg-cyan-900/20"
                                              : "text-muted-foreground/30 cursor-not-allowed"
                                          )}
                                        >
                                          {field.type === 'number' && <Hash className="h-2.5 w-2.5 text-blue-400 shrink-0" />}
                                          {field.type === 'string' && <Type className="h-2.5 w-2.5 text-yellow-400 shrink-0" />}
                                          {field.type === 'boolean' && <ToggleLeft className="h-2.5 w-2.5 text-purple-400 shrink-0" />}
                                          {field.type === 'actor' && <Database className="h-2.5 w-2.5 text-emerald-400 shrink-0" />}
                                          <span className="truncate">{field.label}</span>
                                          <span className="text-[9px] text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100">
                                            {field.type}
                                          </span>
                                        </button>
                                      ))}
                                  </div>
                                )}

                                {/* For scalar ports with a single empty-key field, show direct click */}
                                {port.fields.length === 1 && port.fields[0].key === '' && (
                                  <div className="ml-4">
                                    <button
                                      disabled={!content.isConnected}
                                      onClick={() => {
                                        if (!content.isConnected) return
                                        if (mode === 'advanced') {
                                          insertExpressionField(content, port, undefined)
                                        } else {
                                          const target = getDefaultTarget()
                                          if (target.rowId) {
                                            insertField(target, content, port, undefined)
                                            setActiveInsertTarget(target)
                                          }
                                        }
                                      }}
                                      className={cn(
                                        "flex items-center gap-1 w-full text-left text-[11px] py-0.5 px-1.5 rounded transition-colors",
                                        content.isConnected
                                          ? "text-cyan-200/70 hover:text-cyan-200 hover:bg-cyan-900/20"
                                          : "text-muted-foreground/30 cursor-not-allowed"
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'rounded-full w-2 h-2 shrink-0',
                                          port.portType === 'number' && 'bg-blue-400',
                                          port.portType === 'string' && 'bg-yellow-400',
                                          port.portType === 'boolean' && 'bg-purple-400',
                                        )}
                                      />
                                      <span>{port.portLabel} value</span>
                                      <span className="text-[9px] text-muted-foreground/50 ml-auto">{port.portType}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'functions' && (
                <div className="space-y-1">
                  {FUNCTIONS.map((fn) => (
                    <button
                      key={fn.value}
                      onClick={() => {
                        if (mode === 'advanced') {
                          insertFunction(fn.value)
                        }
                      }}
                      className={cn(
                        'flex items-center gap-1.5 w-full text-left text-xs py-1 px-1.5 rounded transition-colors hover:bg-accent/50',
                        mode === 'advanced' ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <FunctionSquare className="h-3 w-3 text-violet-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-muted-foreground">{fn.label}</div>
                        <div className="text-[10px] text-muted-foreground/60 truncate">{fn.args}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Expression builder */}
          <div className="flex-1 flex flex-col min-w-0">
            {mode === 'simple' ? (
              <div className="space-y-2 flex-1">
                <ScrollArea className="max-h-[280px] pr-2">
                  {rows.map((row, i) => (
                    <div key={row.id} className="border rounded-md p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        {i > 0 ? (
                          <Select
                            value={row.chainOperator || 'and'}
                            onValueChange={(v) => updateRow(row.id, 'chainOperator', v)}
                          >
                            <SelectTrigger className="h-6 text-[10px] w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHAIN_OPTIONS.map((co) => (
                                <SelectItem key={co.value} value={co.value} className="text-xs">
                                  {co.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-[10px] text-muted-foreground w-20">When</span>
                        )}
                        <Badge variant="secondary" className="text-[10px] ml-auto">
                          Row {i + 1}
                        </Badge>
                        {rows.length > 1 && (
                          <button
                            onClick={() => removeRow(row.id)}
                            className="text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Left term */}
                        {renderTerm(row.id, 'left', row.left)}

                        {/* Operator */}
                        <Select
                          value={row.operator}
                          onValueChange={(v) => updateRow(row.id, 'operator', v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-24 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getOperatorsForField(
                              row.left.fieldKey || '',
                              dynamicContent.find((dc) => dc.nodeId === row.left.sourceNodeId)
                                ?.ports.find((p) => p.portId === row.left.sourcePortId)?.portType || 'object'
                            ).map((op) => (
                              <SelectItem key={op.value} value={op.value} className="text-xs">
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Right term */}
                        {renderTerm(row.id, 'right', row.right)}
                      </div>
                    </div>
                  ))}
                </ScrollArea>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="w-full gap-1 text-xs h-7"
                >
                  <Plus className="h-3 w-3" />
                  Add Condition Row
                </Button>
              </div>
            ) : (
              /* Advanced mode: raw expression textarea */
              <div className="flex-1 flex flex-col">
                <Label className="text-xs text-muted-foreground mb-1">Expression</Label>
                <textarea
                  ref={expressionRef}
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  className="flex-1 min-h-[200px] font-mono text-xs bg-muted border rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={`equals(@{outputs('node_id')['result']}, 10)`}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const ta = e.currentTarget
                      const start = ta.selectionStart
                      const end = ta.selectionEnd
                      const before = expression.substring(0, start)
                      const after = expression.substring(end)
                      setExpression(before + '  ' + after)
                      requestAnimationFrame(() => {
                        ta.selectionStart = ta.selectionEnd = start + 2
                      })
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {FUNCTIONS.map((fn) => (
                    <button
                      key={fn.value}
                      onClick={() => insertFunction(fn.value)}
                      className="text-[10px] px-1.5 py-0.5 bg-violet-900/30 border border-violet-500/30 rounded text-violet-200 hover:bg-violet-900/50 transition-colors"
                    >
                      {fn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="mt-2 pt-2 border-t">
              <Label className="text-[10px] text-muted-foreground mb-1">Preview:</Label>
              <div className="font-mono text-xs bg-muted rounded p-2 text-cyan-300 min-h-[24px] overflow-x-auto whitespace-nowrap">
                {preview}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t mt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Apply Expression
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Field Picker Button ────────────────────────────────

interface FieldPickerButtonProps {
  rowId: string
  side: 'left' | 'right'
  term: ExpressionTerm
  dynamicContent: DynamicContentNode[]
  onSelectField: (content: DynamicContentNode, port: DynamicContentPort, field?: SchemaField) => void
}

function FieldPickerButton({
  rowId,
  side,
  dynamicContent,
  onSelectField,
  onActivate,
}: FieldPickerButtonProps & { onActivate?: (rowId: string, side: 'left' | 'right') => void }) {
  const [open, setOpen] = useState(false)

  if (dynamicContent.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open)
          onActivate?.(rowId, side)
        }}
        className="p-1 hover:bg-accent/50 rounded text-muted-foreground hover:text-cyan-400 transition-colors"
        title="Pick a field from upstream nodes"
      >
        <Database className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 left-0 z-50 bg-card border rounded-md shadow-lg p-1.5 min-w-[180px] max-w-[220px] max-h-[200px] overflow-y-auto">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
              Upstream Fields
            </div>
            {dynamicContent.map((content) => (
              <div key={content.nodeId}>
                <div className="text-[10px] font-medium text-cyan-300 px-1 py-0.5">
                  {content.nodeLabel}
                </div>
                {content.ports.flatMap((port) =>
                  port.fields
                    .filter((f) => f.key !== '')
                    .map((field) => (
                      <button
                        key={field.key}
                        onClick={() => {
                          onSelectField(content, port, field)
                          setOpen(false)
                        }}
                        className="flex items-center gap-1 w-full text-left text-[10px] py-0.5 px-2 rounded hover:bg-cyan-900/20 text-muted-foreground hover:text-cyan-200 transition-colors"
                      >
                        <span className="truncate">{field.label}</span>
                        <span className="text-[8px] text-muted-foreground/50 ml-auto">{field.type}</span>
                      </button>
                    ))
                )}
                {content.ports.flatMap((port) =>
                  port.fields
                    .filter((f) => f.key === '')
                    .map((f, fi) => (
                      <button
                        key={`scalar-${fi}`}
                        onClick={() => {
                          onSelectField(content, port, undefined)
                          setOpen(false)
                        }}
                        className="flex items-center gap-1 w-full text-left text-[10px] py-0.5 px-2 rounded hover:bg-cyan-900/20 text-muted-foreground hover:text-cyan-200 transition-colors"
                      >
                        <span>{port.portLabel} value</span>
                        <span className="text-[8px] text-muted-foreground/50 ml-auto">{port.portType}</span>
                      </button>
                    ))
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
