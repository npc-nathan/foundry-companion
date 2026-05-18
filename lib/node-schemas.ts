// ─── Re-exports from node-definitions.tsx ──────────────────────
// This file exists for backward compatibility with existing imports.
// All node definitions, schemas, fields, and helpers now live in
// the single source of truth: lib/node-definitions.tsx
//
// New code should import directly from '@/lib/node-definitions'.

export {
  // Types
  type FieldDefType,
  type FieldDefinition as NodeFieldDef,
  type SchemaField,
  type OutputPortSchema as DataPortSchema,
  type NodeDefinition as NodeSchema,
  type SchemaFieldType as FieldType,
  type DynamicContentNode,
  type DynamicContentPort,
  // Helpers
  getNodeSchema,
  getNodeFields,
  getPortFields,
  getScalarPortField,
  buildDynamicContentTree,
} from './node-definitions';
