'use client';

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

const dataTypeColors: Record<string, string> = {
  any: 'bg-cyan-600 border-cyan-400 text-cyan-100',
  number: 'bg-blue-600 border-blue-400 text-blue-100',
  string: 'bg-yellow-600 border-yellow-400 text-yellow-100',
  boolean: 'bg-purple-600 border-purple-400 text-purple-100',
  actor: 'bg-emerald-600 border-emerald-400 text-emerald-100',
  token: 'bg-rose-600 border-rose-400 text-rose-100',
  scene: 'bg-teal-600 border-teal-400 text-teal-100',
};

const dataTypeEdgeColors: Record<string, string> = {
  any: '#22d3ee',
  number: '#60a5fa',
  string: '#facc15',
  boolean: '#a78bfa',
  actor: '#34d399',
  token: '#fb7185',
  scene: '#14b8a6',
};

// ─── Helpers ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used to derive DataTypeName type
const dataTypeNames = ['any', 'number', 'string', 'boolean', 'actor', 'token', 'scene'] as const;
type DataTypeName = (typeof dataTypeNames)[number];

function safeDataTypeColor(type: string): string {
  return dataTypeColors[type as DataTypeName] || 'bg-gray-600 border-gray-400 text-gray-100';
}

function safeDataTypeEdgeColor(type: string): string {
  return dataTypeEdgeColors[type as DataTypeName] || '#94a3b8';
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Data type is passed via edge data from onConnect
  const dataType: string = (data as { dataType?: string } | undefined)?.dataType || 'any';
  const isDataEdge = dataType !== 'exec';
  const color = isDataEdge ? safeDataTypeEdgeColor(dataType) : '#6b7280';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : isDataEdge ? 2 : 1.5,
          strokeDasharray: isDataEdge ? '6 3' : 'none',
        }}
        className={cn('transition-all')}
      />
      {isDataEdge && dataType !== 'exec' && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'pointer-events-none absolute z-10 rounded border px-1.5 py-0.5 text-[9px] font-bold leading-tight shadow-sm',
              safeDataTypeColor(dataType),
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {dataType}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Helper: shim cn for this isolated component
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const edgeTypes = {
  custom: CustomEdge,
};
