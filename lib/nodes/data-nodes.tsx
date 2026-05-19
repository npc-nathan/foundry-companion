import { Search, Target, Image } from 'lucide-react';
import type { NodeDefinition } from './types';
import { safeJsKey } from './helpers';
import { ACTOR_FIELDS, TOKEN_FIELDS, SCENE_FIELDS } from './schema-fields';

export const DATA_NODES: NodeDefinition[] = [
  // ── Search Actors ──────────────────────────────────────────
  {
    type: 'searchActors',
    label: 'Search Actors',
    category: 'action',
    description: 'Search for an actor by name',
    icon: <Search className="h-3 w-3 text-sky-400" />,
    defaultData: { actorQuery: '' },
    actorSource: 'none',
    ports: [{ id: 'actor', label: 'Actor', type: 'output', dataType: 'actor' }],
    fields: [
      {
        key: 'actorQuery',
        label: 'Actor Name',
        type: 'expression',
        placeholder: 'e.g. "Gandalf" or "Goblin #3"',
        expressionAllowed: true,
        displayOrder: 1,
      },
    ],
    outputSchema: [
      {
        portId: 'actor',
        portLabel: 'Actor',
        portType: 'actor',
        fields: ACTOR_FIELDS,
      },
    ],
    example: { name: 'Gandalf', type: 'npc', level: 20, hp: 85, maxHp: 85, armorClass: 15 },
    codeGen: ({ d, indent, dataVar, esc }) => {
      const query = String(d.actorQuery || '');
      const nodeName = safeJsKey(String(d.nodeName || 'searchActors'));
      return [
        indent + '// Search Actors',
        indent +
          'const ' +
          dataVar('actor') +
          ' = __args?.' +
          nodeName +
          ' || ' +
          (query
            ? 'game.actors.getName("' +
              esc(query) +
              '") || canvas.tokens.placeables.find(t => t.name === "' +
              esc(query) +
              '")?.actor'
            : 'game.user.targets.first()?.actor'),
      ];
    },
  },

  // ── Search Targets ─────────────────────────────────────────
  {
    type: 'searchTargets',
    label: 'Search Targets',
    category: 'action',
    description: 'Get currently targeted tokens',
    icon: <Target className="h-3 w-3 text-rose-400" />,
    defaultData: {},
    actorSource: 'none',
    ports: [{ id: 'target', label: 'Target', type: 'output', dataType: 'token' }],
    fields: [],
    outputSchema: [
      {
        portId: 'target',
        portLabel: 'Target',
        portType: 'token',
        fields: [
          ...TOKEN_FIELDS,
          { key: 'actor', label: 'Actor (nested)', type: 'actor' },
        ],
      },
    ],
    example: { name: 'Goblin Archer', x: 1200, y: 800, elevation: 0 },
    codeGen: ({ indent, dataVar, d }) => {
      const nodeName = safeJsKey(String(d.nodeName || 'searchTargets'));
      return [
        indent + '// Search Targets',
        indent +
          'const ' +
          dataVar('target') +
          ' = __args?.' +
          nodeName +
          ' || game.user.targets.first() || token',
      ];
    },
  },

  // ── Search Scenes ──────────────────────────────────────────
  {
    type: 'searchScenes',
    label: 'Search Scenes',
    category: 'action',
    description: 'Get a scene by name',
    icon: <Image className="h-3 w-3 text-teal-400" />,
    defaultData: { sceneName: '' },
    actorSource: 'none',
    ports: [{ id: 'scene', label: 'Scene', type: 'output', dataType: 'scene' }],
    fields: [
      {
        key: 'sceneName',
        label: 'Scene Name',
        type: 'expression',
        placeholder: 'e.g. "The Dark Forest"',
        expressionAllowed: true,
        displayOrder: 1,
      },
    ],
    outputSchema: [
      {
        portId: 'scene',
        portLabel: 'Scene',
        portType: 'scene',
        fields: SCENE_FIELDS,
      },
    ],
    example: { name: 'The Dark Forest', width: 4000, height: 3000, gridSize: 100 },
    codeGen: ({ d, indent, dataVar, esc }) => {
      const sName = String(d.sceneName || '');
      if (sName) {
        return [
          indent +
            '// Search Scenes: ' +
            sName +
            ' -> e.g. finds The Dark Forest scene',
          indent +
            'const ' +
            dataVar('scene') +
            ' = game.scenes.getName("' +
            esc(sName) +
            '") || game.scenes.get("' +
            esc(sName) +
            '")',
        ];
      }
      return [
        indent + '// Search Scenes -> current scene',
        indent + 'const ' + dataVar('scene') + ' = canvas.scene',
      ];
    },
  },
];
