import { Puzzle } from 'lucide-react';
import type { NodeDefinition } from './types';
import type { MacroInputPort } from '@/lib/parse-macro-inputs';

export const MACRO_NODES: NodeDefinition[] = [
  // ── Run Macro ──────────────────────────────────────────────
  {
    type: 'runMacro',
    label: 'Run Macro',
    category: 'macro',
    description: 'Execute a Foundry macro',
    icon: <Puzzle className="h-3 w-3 text-purple-400" />,
    defaultData: { macroName: '', macroUuid: '', dynamicPorts: [] as MacroInputPort[] },
    actorSource: 'none',
    ports: [{ id: 'macroUuid', label: 'Macro', type: 'input', dataType: 'string' }],
    fields: [
      {
        key: 'macroName',
        label: 'Macro Name',
        type: 'text',
        placeholder: '"Healing Word" or "Fireball"',
        displayOrder: 1,
      },
      {
        key: 'macroUuid',
        label: 'Macro UUID',
        type: 'text',
        placeholder: 'UUID from Foundry',
        displayOrder: 2,
      },
    ],
    codeGen: ({ d, indent, fieldVal, esc }) => {
      const macroName = String(d.macroName || '');
      const dynPorts = (d.dynamicPorts || []) as MacroInputPort[];
      const lines: string[] = [
        indent + '// Run Macro: ' + macroName,
      ];

      // Build args from dynamic ports
      const argEntries: string[] = [];
      for (const port of dynPorts) {
        const val = fieldVal(port.id, '');
        if (val)
          argEntries.push(
            port.id.replace(/[^a-zA-Z0-9_$-]/g, '_') + ': ' + val,
          );
      }

      if (argEntries.length > 0) {
        lines.push(
          indent + 'window.__macroArgs = { ' + argEntries.join(', ') + ' }',
        );
      }

      if (macroName) {
        lines.push(
          indent +
            'await game.macros.getName("' +
            esc(macroName) +
            '")?.execute()',
        );
      }

      if (argEntries.length > 0) {
        lines.push(indent + 'delete window.__macroArgs');
      }

      return lines;
    },
  },
];
