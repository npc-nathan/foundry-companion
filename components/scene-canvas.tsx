// filepath: components/scene-canvas.tsx
'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { relay } from '@/lib/relay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Crosshair,
  Swords,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  Target,
  Move,
  Navigation,
  Shield,
  Footprints,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────

interface SceneData {
  _id: string
  name: string
  width: number
  height: number
  padding: number
  backgroundColor: string
  active: boolean
  tokenVision: boolean
  grid: {
    size: number
    type: number // 0=gridless, 1=square, 2=hexR, 3=hexC
    distance: number
    units: string
    color: string
    alpha: number
    style: string
  }
  initial?: {
    x: number | null
    y: number | null
    scale: number | null
  }
  background?: {
    src: string | null
  }
}

interface TokenData {
  _id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  alpha: number
  hidden: boolean
  locked: boolean
  actorId?: string
  actorLink?: boolean
  disposition: number // -1=hostile, 0=neutral, 1=friendly
  texture?: {
    src?: string
    scaleX?: number
    scaleY?: number
    rotation?: number
  }
  sight?: {
    enabled: boolean
    range: number
    angle: number
  }
  elevation: number
  sort: number
  displayName: number
  bar1?: { attribute?: string }
  bar2?: { attribute?: string }
}

interface WallData {
  _id: string
  c?: [number, number][] // coordinates [[x1,y1],[x2,y2]] — optional, some walls may not have it
  door: number // 0=no door, 1=door, 2=secret door
  ds: number // door state 0=closed, 1=open, 2=locked
  move: number // movement type: 0=block, 1=no-block
  sense: number // sight: 0=block, 1=unblock
  dir: number // direction
}

interface MeasurementResult {
  distance: number
  gridSpaces: number
  units: string
}

type CanvasTool = 'select' | 'target' | 'move' | 'measure' | 'ping'

interface CanvasViewport {
  x: number // center x in scene pixels
  y: number // center y in scene pixels
  scale: number // 1 = fits width, 2 = 2x zoom, etc
}

// ─── Constants ──────────────────────────────────────────────

const DISPOSITION_COLORS: Record<number, string> = {
  [-1]: '#ef4444', // hostile - red
  0: '#fbbf24', // neutral - yellow
  1: '#22c55e', // friendly - green
}

const DISPOSITION_BORDER: Record<number, string> = {
  [-1]: 'border-red-500',
  0: 'border-yellow-500',
  1: 'border-green-500',
}

const DISPOSITION_RING: Record<number, string> = {
  [-1]: '#ef444488',
  0: '#fbbf2488',
  1: '#22c55e88',
}

// ─── Helpers ────────────────────────────────────────────────

function tokenImageUrl(textureSrc?: string): string | null {
  if (!textureSrc) return null
  // Skip data URIs and full URLs — only relay-proxy Foundry paths
  if (textureSrc.startsWith('data:') || textureSrc.startsWith('http')) return null
  // Strip cache-busting query params from the path (Foundry appends ?timestamp)
  const withoutCacheBuster = textureSrc.split('?')[0]
  const clean = withoutCacheBuster.startsWith('/') ? withoutCacheBuster.slice(1) : withoutCacheBuster
  return `/api/relay/download?path=${encodeURIComponent(clean)}&source=data`
}

function sceneBackgroundUrl(scene: SceneData): string | null {
  if (scene?.background?.src) {
    const clean = scene.background.src.startsWith('/') ? scene.background.src.slice(1) : scene.background.src
    return `/api/relay/download?path=${encodeURIComponent(clean)}`
  }
  return null
}

// ─── Sub-components ─────────────────────────────────────────

function ToolBar({
  activeTool,
  onToolChange,
  viewport,
  onZoomIn,
  onZoomOut,
  onResetView,
  onRefresh,
  isRefreshing,
  showGrid,
  onToggleGrid,
  showLabels,
  onToggleLabels,
  selectedToken,
  onClearSelection,
}: {
  activeTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  viewport: CanvasViewport
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onRefresh: () => void
  isRefreshing: boolean | undefined
  showGrid: boolean
  onToggleGrid: () => void
  showLabels: boolean
  onToggleLabels: () => void
  selectedToken: TokenData | null
  onClearSelection: () => void
}) {
  const tools: { id: CanvasTool; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Select', icon: <Hand className="h-4 w-4" /> },
    { id: 'target', label: 'Target', icon: <Crosshair className="h-4 w-4" /> },
    { id: 'move', label: 'Move', icon: <Move className="h-4 w-4" /> },
    { id: 'measure', label: 'Measure', icon: <Footprints className="h-4 w-4" /> },
  ]

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Tool selection */}
      {tools.map((t) => (
        <Button
          key={t.id}
          variant={activeTool === t.id ? 'default' : 'outline'}
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onToolChange(t.id)}
        >
          {t.icon}
          <span className="ml-1 hidden sm:inline">{t.label}</span>
        </Button>
      ))}

      <div className="w-px h-6 bg-border mx-1" />

      {/* Zoom controls */}
      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground min-w-[3rem] text-center tabular-nums">
        {Math.round(viewport.scale * 100)}%
      </span>
      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onResetView}>
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Display toggles */}
      <Button
        variant={showGrid ? 'default' : 'outline'}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onToggleGrid}
        title="Toggle grid"
      >
        <Navigation className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={showLabels ? 'default' : 'outline'}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onToggleLabels}
        title="Toggle labels"
      >
        {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Refresh canvas"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
      </Button>

      {/* Selected token info */}
      {selectedToken && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <Badge variant="secondary" className="text-xs gap-1">
            <Users className="h-3 w-3" />
            {selectedToken.name || 'Unnamed'}
            <button onClick={onClearSelection} className="ml-1 hover:text-destructive">
              ×
            </button>
          </Badge>
        </>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────

interface SceneCanvasProps {
  scene?: SceneData | null
  tokens: TokenData[]
  walls?: WallData[]
  isLoading?: boolean
  isTokensLoading?: boolean
  error?: string | null
  onRefreshScene: () => void
  onRefreshTokens: () => void
  onTokenMove: (tokenId: string, x: number, y: number) => Promise<void>
  onTargetToken: (tokenId: string) => Promise<void>
  onMeasureDistance?: (result: MeasurementResult) => void
  isPlayer?: boolean
}

export function SceneCanvas({
  scene,
  tokens,
  walls = [],
  isLoading,
  isTokensLoading,
  error,
  onRefreshScene,
  onRefreshTokens,
  onTokenMove,
  onTargetToken,
  onMeasureDistance,
  isPlayer = false,
}: SceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<SVGSVGElement>(null)

  // ─── Viewport State ─────────────────────────────────────
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const panOriginRef = useRef({ x: 0, y: 0 })

  // ─── UI State ───────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<CanvasTool>('select')
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null)
  const [targetedTokens, setTargetedTokens] = useState<Set<string>>(new Set())
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [measureResult, setMeasureResult] = useState<MeasurementResult | null>(null)

  // ─── Computed dimensions ────────────────────────────────
const sceneDim = useMemo(() => {
    if (!scene) return { width: 1000, height: 1000, padding: 0.25 }
    return {
      width: scene.width,
      height: scene.height,
      padding: scene.padding ?? 0.25,
    }
  }, [scene?.width, scene?.height, scene?.padding])

  const gridSize = scene?.grid?.size ?? 100
  const gridDistance = scene?.grid?.distance ?? 5
  const gridUnits = scene?.grid?.units ?? 'ft'

  // Initialize viewport to fit scene into container using ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const computeScale = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (cw === 0 || ch === 0) return
      const sw = sceneDim.width * (1 + sceneDim.padding * 2)
      const sh = sceneDim.height * (1 + sceneDim.padding * 2)
      const scale = Math.min(cw / sw, ch / sh, 1) * 0.95
      setViewport((prev) => ({ ...prev, scale }))
    }

    computeScale()

    const observer = new ResizeObserver(computeScale)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sceneDim.width, sceneDim.height, sceneDim.padding])

  // ─── Zoom controls ──────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => ({ ...prev, scale: Math.min(prev.scale * 1.3, 5) }))
  }, [])

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => ({ ...prev, scale: Math.max(prev.scale / 1.3, 0.1) }))
  }, [])

  const handleResetView = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const cw = el.clientWidth
    const ch = el.clientHeight
    if (cw === 0 || ch === 0) return
    const sw = sceneDim.width * (1 + sceneDim.padding * 2)
    const sh = sceneDim.height * (1 + sceneDim.padding * 2)
    const scale = Math.min(cw / sw, ch / sh, 1) * 0.95
    setViewport({ x: 0, y: 0, scale })
  }, [sceneDim])

  // ─── Panning (middle mouse or space+drag) ───────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && activeTool === 'select' && !selectedToken)) {
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
        panOriginRef.current = { x: viewport.x, y: viewport.y }
      }
    },
    [activeTool, selectedToken, viewport.x, viewport.y]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.x
        const dy = e.clientY - panStart.y
        setViewport((prev) => ({
          ...prev,
          x: panOriginRef.current.x + dx / prev.scale,
          y: panOriginRef.current.y + dy / prev.scale,
        }))
      }

      if (isDragging && selectedToken) {
        // Update drag visual
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const canvasX = (e.clientX - rect.left) / viewport.scale + viewport.x - sceneDim.width * sceneDim.padding
          const canvasY = (e.clientY - rect.top) / viewport.scale + viewport.y - sceneDim.height * sceneDim.padding
          // We don't update state here for performance — just track offset
        }
      }
    },
    [isPanning, isDragging, selectedToken, viewport, sceneDim, panStart]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false)
      }
      if (isDragging && selectedToken) {
        setIsDragging(false)
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const canvasX = (e.clientX - rect.left) / viewport.scale + viewport.x - sceneDim.width * sceneDim.padding
          const canvasY = (e.clientY - rect.top) / viewport.scale + viewport.y - sceneDim.height * sceneDim.padding
          onTokenMove(selectedToken._id, canvasX - dragOffset.x, canvasY - dragOffset.y)
        }
      }
    },
    [isPanning, isDragging, selectedToken, viewport, sceneDim, dragOffset, onTokenMove]
  )

  // ─── Token Interaction ──────────────────────────────────
  const handleTokenClick = useCallback(
    (token: TokenData, e: React.MouseEvent) => {
      e.stopPropagation()
      switch (activeTool) {
        case 'select': {
          setSelectedToken(token)
          break
        }
        case 'target': {
          setTargetedTokens((prev) => {
            const next = new Set(prev)
            if (next.has(token._id)) {
              next.delete(token._id)
            } else {
              next.add(token._id)
            }
            return next
          })
          onTargetToken(token._id)
          break
        }
        case 'move': {
          setSelectedToken(token)
          setIsDragging(true)
          // Calculate offset from token center
          const rect = canvasRef.current?.getBoundingClientRect()
          if (rect) {
            const canvasX = (e.clientX - rect.left) / viewport.scale + viewport.x - sceneDim.width * sceneDim.padding
            const canvasY = (e.clientY - rect.top) / viewport.scale + viewport.y - sceneDim.height * sceneDim.padding
            setDragOffset({ x: canvasX - token.x, y: canvasY - token.y })
          }
          break
        }
        case 'measure': {
          setMeasurePoints((prev) => {
            if (prev.length >= 2) return [{ x: token.x, y: token.y }]
            return [...prev, { x: token.x, y: token.y }]
          })
          break
        }
      }
    },
    [activeTool, viewport, sceneDim, onTargetToken]
  )

  const handleCanvasClick = useCallback(() => {
    if (activeTool === 'select') {
      setSelectedToken(null)
    }
  }, [activeTool])

  // ─── Canvas coordinate transform ────────────────────────
  const sceneToScreen = useCallback(
    (sx: number, sy: number) => {
      const padding = sceneDim.padding
      const container = containerRef.current
      if (!container) return { left: 0, top: 0, width: 0, height: 0 }
      const cw = container.clientWidth
      const ch = container.clientHeight
      const sw = sceneDim.width
      const sh = sceneDim.height
      const effectiveWidth = sw * (1 + padding * 2)
      const effectiveHeight = sh * (1 + padding * 2)

      // Fit centered
      const sx_ = (sx + sw * padding - viewport.x) * viewport.scale
      const sy_ = (sy + sh * padding - viewport.y) * viewport.scale

      return {
        left: cw / 2 - (effectiveWidth * viewport.scale) / 2 + sx_,
        top: ch / 2 - (effectiveHeight * viewport.scale) / 2 + sy_,
      }
    },
    [viewport, sceneDim]
  )

  const screenToScene = useCallback(
    (cx: number, cy: number) => {
      const container = containerRef.current
      if (!container) return { x: 0, y: 0 }
      const rect = container.getBoundingClientRect()
      const lx = cx - rect.left
      const ly = cy - rect.top
      const cw = container.clientWidth
      const ch = container.clientHeight
      const padding = sceneDim.padding
      const sw = sceneDim.width
      const sh = sceneDim.height
      const effectiveWidth = sw * (1 + padding * 2)
      const effectiveHeight = sh * (1 + padding * 2)

      const sx = (lx - cw / 2 + (effectiveWidth * viewport.scale) / 2) / viewport.scale + viewport.x
      const sy = (ly - ch / 2 + (effectiveHeight * viewport.scale) / 2) / viewport.scale + viewport.y

      return { x: sx - sw * padding, y: sy - sh * padding }
    },
    [viewport, sceneDim]
  )

  // ─── Measure distance ───────────────────────────────────
  useEffect(() => {
    if (measurePoints.length === 2) {
      const [p1, p2] = measurePoints
      relay
        .measureDistance({
          originX: Math.round(p1.x),
          originY: Math.round(p1.y),
          targetX: Math.round(p2.x),
          targetY: Math.round(p2.y),
        })
        .then((result) => {
          const r = result as { data?: MeasurementResult }
          if (r.data) {
            setMeasureResult(r.data)
            onMeasureDistance?.(r.data)
          }
        })
        .catch(() => {
          // Fallback: rough grid-based estimate
          const dx = (p2.x - p1.x) / gridSize
          const dy = (p2.y - p1.y) / gridSize
          const gridSpaces = Math.sqrt(dx * dx + dy * dy)
          const dist = gridSpaces * gridDistance
          setMeasureResult({ distance: dist, gridSpaces: Math.round(gridSpaces), units: gridUnits })
        })
    }
  }, [measurePoints, gridSize, gridDistance, gridUnits, onMeasureDistance])

  // ─── Tooltip for measure result ─────────────────────────
  const showMeasureResult = measurePoints.length === 2 && measureResult

  // ─── Render grid lines ──────────────────────────────────
  const renderGrid = useCallback(() => {
    if (!showGrid || !scene) return null
    const lines: React.ReactNode[] = []
    const cols = Math.ceil(sceneDim.width / gridSize)
    const rows = Math.ceil(sceneDim.height / gridSize)
    const gridColor = scene.grid.color || '#ffffff'
    const gridAlpha = scene.grid.alpha ?? 0.2

    // Vertical lines
    for (let i = 0; i <= cols; i++) {
      const x = i * gridSize
      const from = sceneToScreen(x, 0)
      const to = sceneToScreen(x, sceneDim.height)
      lines.push(
        <line
          key={`gv-${i}`}
          x1={from.left}
          y1={from.top}
          x2={to.left}
          y2={to.top}
          stroke={gridColor}
          strokeOpacity={gridAlpha}
          strokeWidth={1 / viewport.scale}
        />
      )
    }

    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      const y = i * gridSize
      const from = sceneToScreen(0, y)
      const to = sceneToScreen(sceneDim.width, y)
      lines.push(
        <line
          key={`gh-${i}`}
          x1={from.left}
          y1={from.top}
          x2={to.left}
          y2={to.top}
          stroke={gridColor}
          strokeOpacity={gridAlpha}
          strokeWidth={1 / viewport.scale}
        />
      )
    }

    return lines
  }, [showGrid, scene, sceneDim, gridSize, viewport.scale, sceneToScreen])

  // ─── Render walls ───────────────────────────────────────
  const renderWalls = useCallback(() => {
    if (!walls.length) return null
    return walls.map((wall) => {
      if (!wall?.c || wall.c.length < 2) return null
      const [x1, y1] = wall.c[0]
      const [x2, y2] = wall.c[1]
      const from = sceneToScreen(x1, y1)
      const to = sceneToScreen(x2, y2)

      let strokeColor = '#ffffff'
      let strokeWidth = 2 / viewport.scale
      let strokeDasharray: string | undefined

      if (wall.move === 1 && wall.sense === 1) return null // terrain — invisible
      if (wall.move === 0 && wall.sense === 1) {
        strokeColor = '#60a5fa' // movement block only — blue
        strokeDasharray = `${4 / viewport.scale} ${3 / viewport.scale}`
      } else if (wall.move === 1 && wall.sense === 0) {
        strokeColor = '#fbbf24' // sight block only — yellow
        strokeDasharray = `${2 / viewport.scale} ${4 / viewport.scale}`
      } else {
        strokeColor = '#ef4444' // full block — red
      }

      // Door
      if (wall.door > 0) {
        const doorClosed = wall.ds === 0 || wall.ds === 2
        strokeColor = doorClosed ? '#22c55e' : '#f59e0b'
        strokeWidth = 3 / viewport.scale
      }

      return (
        <line
          key={wall._id}
          x1={from.left}
          y1={from.top}
          x2={to.left}
          y2={to.top}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          opacity={0.6}
        />
      )
    })
  }, [walls, viewport.scale, sceneToScreen])

  // ─── Render tokens ───────────────────────────────────────
  const renderTokens = useCallback(() => {
    return tokens.map((token) => {
      const screenPos = sceneToScreen(token.x, token.y)
      const tokenWidth = token.width * gridSize * viewport.scale
      const tokenHeight = token.height * gridSize * viewport.scale
      const isSelected = selectedToken?._id === token._id
      const isTargeted = targetedTokens.has(token._id)

      const imgUrl = tokenImageUrl(token.texture?.src)

      return (
        <g key={token._id}>
          {/* Targeting ring */}
          {isTargeted && (
            <circle
              cx={screenPos.left}
              cy={screenPos.top}
              r={Math.max(tokenWidth, tokenHeight) * 0.7 + 4 / viewport.scale}
              fill="none"
              stroke="#ef4444"
              strokeWidth={3 / viewport.scale}
              strokeDasharray={`${6 / viewport.scale} ${4 / viewport.scale}`}
              opacity={0.8}
            >
              <animate attributeName="strokeDashoffset" from={0} to={-100} dur="1s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Selection ring */}
          {isSelected && (
            <circle
              cx={screenPos.left}
              cy={screenPos.top}
              r={Math.max(tokenWidth, tokenHeight) * 0.7 + 4 / viewport.scale}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={3 / viewport.scale}
            />
          )}

          {/* Token body */}
          <g
            style={{ cursor: 'pointer', opacity: token.hidden ? 0.4 : 1 }}
            onClick={(e) => handleTokenClick(token, e)}
            onMouseDown={(e) => {
              if (activeTool === 'move') {
                e.stopPropagation()
                setSelectedToken(token)
                setIsDragging(true)
                const rect = canvasRef.current?.getBoundingClientRect()
                if (rect) {
                  const canvasX = (e.clientX - rect.left) / viewport.scale + viewport.x - sceneDim.width * sceneDim.padding
                  const canvasY = (e.clientY - rect.top) / viewport.scale + viewport.y - sceneDim.height * sceneDim.padding
                  setDragOffset({ x: canvasX - token.x, y: canvasY - token.y })
                }
              }
            }}
          >
            {/* Token image or circle */}
            {imgUrl && tokenWidth > 10 ? (
              <image
                href={imgUrl}
                style={{ pointerEvents: 'none' }}
                x={screenPos.left - tokenWidth / 2}
                y={screenPos.top - tokenHeight / 2}
                width={tokenWidth}
                height={tokenHeight}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#img-clip-${token._id})`}
              />
            ) : (
              <circle
                cx={screenPos.left}
                cy={screenPos.top}
                r={Math.min(tokenWidth, tokenHeight) / 2}
                fill={DISPOSITION_COLORS[token.disposition] || '#888'}
                stroke={token.hidden ? '#666' : '#fff'}
                strokeWidth={1.5 / viewport.scale}
              />
            )}

            {/* Disposition border ring */}
            <circle
              cx={screenPos.left}
              cy={screenPos.top}
              r={Math.min(tokenWidth, tokenHeight) / 2 + 2 / viewport.scale}
              fill="none"
              stroke={DISPOSITION_RING[token.disposition] || '#88888844'}
              strokeWidth={2 / viewport.scale}
            />

            {/* Label */}
            {showLabels && (token.name || token.displayName > 0) && (
              <text
                x={screenPos.left}
                y={screenPos.top + tokenHeight / 2 + 14 / viewport.scale}
                textAnchor="middle"
                fill="#fff"
                fontSize={`${12 / viewport.scale}px`}
                fontWeight="500"
                stroke="#000"
                strokeWidth={0.5 / viewport.scale}
                paintOrder="stroke"
                style={{ pointerEvents: 'none' }}
              >
                {token.name?.slice(0, 20) || '???'}
              </text>
            )}

            {/* Hidden indicator */}
            {token.hidden && (
              <text
                x={screenPos.left}
                y={screenPos.top}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize={`${14 / viewport.scale}px`}
                style={{ pointerEvents: 'none' }}
              >
                👁
              </text>
            )}
          </g>
        </g>
      )
    })
  }, [
    tokens,
    selectedToken,
    targetedTokens,
    activeTool,
    showLabels,
    viewport,
    sceneDim,
    gridSize,
    sceneToScreen,
    handleTokenClick,
  ])

  // ─── Measure line ────────────────────────────────────────
  const renderMeasure = useCallback(() => {
    if (measurePoints.length < 1) return null
    const points = measurePoints.map((p) => sceneToScreen(p.x, p.y))

    // First point
    const p1 = points[0]
    const p2 = points.length > 1 ? points[1] : null

    return (
      <g>
        {/* Point indicators */}
        {points.map((p, i) => (
          <circle
            key={`mp-${i}`}
            cx={p.left}
            cy={p.top}
            r={6 / viewport.scale}
            fill="#fbbf24"
            stroke="#000"
            strokeWidth={1 / viewport.scale}
            opacity={0.9}
          />
        ))}

        {/* Line between points */}
        {p2 && (
          <>
            <line
              x1={p1.left}
              y1={p1.top}
              x2={p2.left}
              y2={p2.top}
              stroke="#fbbf24"
              strokeWidth={2 / viewport.scale}
              strokeDasharray={`${6 / viewport.scale} ${4 / viewport.scale}`}
              opacity={0.7}
            />
            {/* Distance label */}
            {measureResult && (
              <text
                x={(p1.left + p2.left) / 2}
                y={(p1.top + p2.top) / 2 - 8 / viewport.scale}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize={`${12 / viewport.scale}px`}
                fontWeight="bold"
                stroke="#000"
                strokeWidth={0.5 / viewport.scale}
                paintOrder="stroke"
              >
                {measureResult.distance.toFixed(1)} {measureResult.units}
                <tspan fontSize={`${9 / viewport.scale}px`} fill="#fbbf2499">
                  {' '}
                  ({measureResult.gridSpaces} sq)
                </tspan>
              </text>
            )}
          </>
        )}
      </g>
    )
  }, [measurePoints, measureResult, viewport.scale, sceneToScreen])

  // ─── Keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMeasurePoints([])
        setMeasureResult(null)
        setSelectedToken(null)
        setTargetedTokens(new Set())
      }
      if (e.key === 'z' || e.key === 'Z') handleZoomIn()
      if (e.key === 'x' || e.key === 'X') handleZoomOut()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleZoomIn, handleZoomOut])

  // ─── Loading state ──────────────────────────────────────
  if (isLoading || !scene) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{isLoading ? 'Loading scene…' : 'No active scene'}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const bgUrl = sceneBackgroundUrl(scene)

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Toolbar */}
      <ToolBar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        viewport={viewport}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onRefresh={() => {
          onRefreshScene()
          onRefreshTokens()
        }}
        isRefreshing={isTokensLoading}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((g) => !g)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((l) => !l)}
        selectedToken={selectedToken}
        onClearSelection={() => setSelectedToken(null)}
      />

      {/* Canvas container */}
      <div
        ref={containerRef}
        className={cn(
          'relative flex-1 overflow-hidden rounded-lg border bg-muted/20',
          isPanning && 'cursor-grabbing',
          !isPanning && activeTool === 'select' && 'cursor-default',
          !isPanning && activeTool === 'target' && 'cursor-crosshair',
          !isPanning && activeTool === 'move' && 'cursor-grab',
          !isPanning && activeTool === 'measure' && 'cursor-crosshair'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsPanning(false)
          setIsDragging(false)
        }}
        onClick={handleCanvasClick}
      >
        {/* Scene background */}
        <svg
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          {bgUrl && (
            <image
              href={bgUrl}
              x={sceneToScreen(0, 0).left}
              y={sceneToScreen(0, 0).top}
              width={sceneDim.width * viewport.scale}
              height={sceneDim.height * viewport.scale}
              preserveAspectRatio="xMidYMid slice"
              opacity={0.9}
            />
          )}

          {/* Background color fill */}
          <rect
            x={sceneToScreen(0, 0).left}
            y={sceneToScreen(0, 0).top}
            width={sceneDim.width * viewport.scale}
            height={sceneDim.height * viewport.scale}
            fill={scene.backgroundColor || '#999999'}
            opacity={0.3}
          />

          {/* Grid */}
          {renderGrid()}

          {/* Walls */}
          {renderWalls()}

          {/* Measurement */}
          {renderMeasure()}
        </svg>

        {/* Token overlays — SVG layer on top for clicking */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'all' }}
        >
          {renderTokens()}
        </svg>

        {/* Active tool indicator */}
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline" className="text-[10px] text-muted-foreground bg-background/80">
            {activeTool === 'select' && '🖐 Select'}
            {activeTool === 'target' && '🎯 Click tokens to target'}
            {activeTool === 'move' && '✋ Drag tokens to move'}
            {activeTool === 'measure' && '📏 Click two points to measure'}
          </Badge>
        </div>

        {/* Token count & scene name */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <Badge variant="secondary" className="text-[10px] bg-background/80">
            {tokens.length} tokens
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-background/80">
            {scene.name}
          </Badge>
        </div>

        {/* Canvas error state (no scene data) */}
        {!scene && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-sm">No active scene</p>
              <p className="text-xs text-muted-foreground/60">
                Open a scene in Foundry VTT to see it here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}