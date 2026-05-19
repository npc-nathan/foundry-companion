import type { ReactNode } from 'react';
import type { MacroInputPort } from '@/lib/parse-macro-inputs';

export type NodeCategory = 'action' | 'logic' | 'data' | 'macro' | 'module';

export type ActorSource = 'none' | 'piped-token' | 'controlled';

export interface PortDefinition {
  id: string;
  label: string;
  type: 'input' | 'output';
  dataType: 'any' | 'number' | 'string' | 'boolean' | 'actor' | 'token' | 'scene' | 'roll';
}

export type FieldDefType = 'text' | 'number' | 'select' | 'expression';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldDefType;
  selectOptions?: { value: string; label: string }[];
  placeholder?: string;
  expressionAllowed?: boolean;
  displayOrder?: number;
  hideFromPanel?: boolean;
}

export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'actor'
  | 'token'
  | 'scene'
  | 'object'
  | 'roll';

export interface PaletteItem {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  icon?: ReactNode;
  defaultData: Record<string, unknown>;
}

export interface SchemaField {
  key: string;
  label: string;
  type: SchemaFieldType;
  path?: string;
}

export interface OutputPortSchema {
  portId: string;
  portLabel: string;
  portType: SchemaFieldType;
  fields: SchemaField[];
}

export interface CodeGenContext {
  nodeId: string;
  d: Record<string, unknown>;
  indent: string;
  fieldVal: (fieldKey: string, fallback: string) => string;
  dataVar: (portId: string) => string;
  dataForInput: (fieldKey: string) => string | null;
  esc: (s: string) => string;
}

export interface NodeDefinition {
  type: string;
  label: string;
  category: NodeCategory;
  description: string;
  icon: ReactNode;
  /** Module ID if this is a module node (e.g. 'dfreds-convenient-effects') */
  moduleId?: string;
  defaultData: Record<string, unknown>;
  ports: PortDefinition[];
  fields: FieldDefinition[];
  outputSchema?: OutputPortSchema[];
  example?: Record<string, unknown>;
  actorSource: ActorSource;
  codeGen: (ctx: CodeGenContext) => string[];
}

export interface DynamicContentPort {
  portId: string;
  portLabel: string;
  portType: string;
  fields: SchemaField[];
}

export interface DynamicContentNode {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  isConnected: boolean;
  ports: DynamicContentPort[];
}
