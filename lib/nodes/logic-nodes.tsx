import { Blocks } from 'lucide-react';
import type { NodeDefinition } from './types';

export const LOGIC_NODES: NodeDefinition[] = [
  // ── Condition ──────────────────────────────────────────────
  {
    type: 'condition',
    label: 'Condition',
    category: 'logic',
    description: 'If/else branching',
    icon: <Blocks className="h-3 w-3 text-amber-400" />,
    defaultData: { condition: 'true', compareField: 'name', compareValue: '' },
    actorSource: 'none',
    ports: [
      { id: 'result', label: 'Result', type: 'output', dataType: 'boolean' },
      { id: 'condition', label: 'Expression', type: 'input', dataType: 'string' },
      { id: 'trueTarget', label: 'True Branch', type: 'output', dataType: 'any' },
      { id: 'falseTarget', label: 'False Branch', type: 'output', dataType: 'any' },
    ],
    fields: [
      {
        key: 'condition',
        label: 'Expression',
        type: 'text',
        placeholder: 'Or use the fx button to build conditions',
        expressionAllowed: true,
        displayOrder: 1,
      },
    ],
    outputSchema: [
      {
        portId: 'result',
        portLabel: 'Result',
        portType: 'boolean',
        fields: [{ key: '', label: 'Condition Result', type: 'boolean', path: '' }],
      },
    ],
    example: { result: true },
    codeGen: ({ indent, fieldVal, dataForInput }) => {
      const pipedVar = dataForInput('condition');
      const cond = pipedVar || fieldVal('condition', 'true');
      return [
        indent + '// Condition -> e.g. if (rollTotal > 10) { ... } else { ... }',
        indent + 'if (' + cond + ') {',
      ];
    },
  },

  // ── Variable ───────────────────────────────────────────────
  {
    type: 'variable',
    label: 'Variable',
    category: 'data',
    description: 'Set or get a variable',
    icon: <Blocks className="h-3 w-3 text-green-400" />,
    defaultData: { name: 'myVar', value: '' },
    actorSource: 'none',
    ports: [{ id: 'value', label: 'Value', type: 'output', dataType: 'any' }],
    fields: [
      {
        key: 'name',
        label: 'Variable Name',
        type: 'text',
        placeholder: 'myVar',
        displayOrder: 1,
      },
      {
        key: 'value',
        label: 'Value',
        type: 'expression',
        placeholder: '42 or "hello" or rollResult',
        expressionAllowed: true,
        displayOrder: 2,
      },
    ],
    outputSchema: [
      {
        portId: 'value',
        portLabel: 'Value',
        portType: 'object',
        fields: [{ key: '', label: 'Variable Value', type: 'object', path: '' }],
      },
    ],
    example: { value: '42' },
    codeGen: ({ d, indent, dataVar }) => {
      const varName = String(d.name || 'myVar');
      const varValue = String(d.value || '');
      const safeValue = varValue || 'undefined';
      return [
        indent + '// Variable: ' + varName + ' -> e.g. const ' + varName + ' = 42',
        indent + 'const ' + varName + ' = ' + safeValue,
        indent + 'const ' + dataVar('value') + ' = ' + varName,
      ];
    },
  },
];
