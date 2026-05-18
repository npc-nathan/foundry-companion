/**
 * Module Mappings — Known Foundry module API templates
 *
 * Each module node is defined as a full NodeDefinition with proper
 * ports, fields, actorSource, and codeGen — same format as built-in nodes.
 * This lets module nodes participate in data piping, token guard scanning,
 * and expression editor support.
 *
 * Maps module IDs to their known Foundry-side JavaScript APIs.
 * This is a living file. Contributions welcome for new modules.
 */

import type { NodeDefinition, CodeGenContext } from '@/lib/node-definitions';

// ─── Helper functions for code gen ────────────────────

function fieldTokens(ctx: CodeGenContext): string[] {
  const { fieldVal, indent } = ctx;
  const targetExpr = fieldVal('target', 'token');
  return [
    indent + `const targetToken = ${targetExpr}`,
    indent + `const targetActor = targetToken?.actor || targetToken`,
  ];
}

// ─── DFreds Convenient Effects ──────────────────────────────

const CE_EFFECT_OPTIONS = [
  { value: 'Burning', label: 'Burning' },
  { value: 'Poisoned', label: 'Poisoned' },
  { value: 'Stunned', label: 'Stunned' },
  { value: 'Paralyzed', label: 'Paralyzed' },
  { value: 'Frightened', label: 'Frightened' },
  { value: 'Charmed', label: 'Charmed' },
  { value: 'Invisible', label: 'Invisible' },
  { value: 'Prone', label: 'Prone' },
  { value: 'Restrained', label: 'Restrained' },
  { value: 'Blinded', label: 'Blinded' },
  { value: 'Deafened', label: 'Deafened' },
  { value: 'Concentrating', label: 'Concentrating' },
  { value: 'Exhaustion 1', label: 'Exhaustion 1' },
  { value: 'Exhaustion 2', label: 'Exhaustion 2' },
  { value: 'Exhaustion 3', label: 'Exhaustion 3' },
  { value: 'Blessed', label: 'Blessed' },
  { value: 'Bane', label: 'Bane' },
  { value: 'Shield of Faith', label: 'Shield of Faith' },
  { value: 'Bless', label: 'Bless' },
];

// ─── All module node definitions ───────────────────────────

export const MODULE_NODE_DEFINITIONS: NodeDefinition[] = [
  // ── DFreds Convenient Effects ──────────────────────────
  {
    type: 'ce-apply-effect',
    label: 'Apply CE Effect',
    category: 'module',
    moduleId: 'dfreds-convenient-effects',
    description: 'Apply a convenient effect to a token',
    icon: null as unknown as React.ReactNode,
    defaultData: { effectName: 'Burning', target: '', duration: '0' },
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
      { id: 'effectName', label: 'Effect', type: 'input', dataType: 'string' },
      { id: 'duration', label: 'Duration', type: 'input', dataType: 'number' },
    ],
    fields: [
      {
        key: 'effectName',
        label: 'Effect Name',
        type: 'select',
        selectOptions: CE_EFFECT_OPTIONS,
        displayOrder: 1,
      },
      {
        key: 'target',
        label: 'Target',
        type: 'number',
        placeholder: '@token or Actor UUID',
        displayOrder: 2,
      },
      {
        key: 'duration',
        label: 'Duration (rounds, 0=unlimited)',
        type: 'number',
        placeholder: '0',
        displayOrder: 3,
      },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const effectName = fieldVal('effectName', 'Burning');
      const dur = fieldVal('duration', '0');
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetActor) { ui.notifications.warn('No target'); return }`);
      lines.push(indent + `const effectName = ${effectName}`);
      lines.push(indent + `const dur = parseInt(String(${dur})) || 0`);
      lines.push(indent + `if (dur > 0) {`);
      lines.push(
        indent +
          `  game.dfreds.effects.addEffectOnTarget(effectName, targetActor.uuid, { seconds: dur * 6 })`,
      );
      lines.push(indent + `} else {`);
      lines.push(indent + `  game.dfreds.effects.addEffectOnTarget(effectName, targetActor.uuid)`);
      lines.push(indent + `}`);
      lines.push(indent + `ui.notifications.info(\`Applied \${effectName}\`)`);
      lines.push('');
      return lines;
    },
  },
  {
    type: 'ce-remove-effect',
    label: 'Remove CE Effect',
    category: 'module',
    moduleId: 'dfreds-convenient-effects',
    description: 'Remove a convenient effect from a token',
    icon: null as unknown as React.ReactNode,
    defaultData: { effectName: 'Burning', target: '' },
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
      { id: 'effectName', label: 'Effect', type: 'input', dataType: 'string' },
    ],
    fields: [
      {
        key: 'effectName',
        label: 'Effect Name',
        type: 'select',
        selectOptions: CE_EFFECT_OPTIONS,
        displayOrder: 1,
      },
      {
        key: 'target',
        label: 'Target',
        type: 'text',
        placeholder: '@token or Actor UUID',
        displayOrder: 2,
      },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const effectName = fieldVal('effectName', 'Burning');
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetActor) { ui.notifications.warn('No target'); return }`);
      lines.push(
        indent + `game.dfreds.effects.removeEffectFromTarget(${effectName}, targetActor.uuid)`,
      );
      lines.push(indent + `ui.notifications.info(\`Removed \${${effectName}}\`)`);
      lines.push('');
      return lines;
    },
  },

  // ── DAE ────────────────────────────────────────────────
  {
    type: 'dae-apply-effect',
    label: 'DAE: Apply Effect',
    category: 'module',
    moduleId: 'dae',
    description: 'Apply a DAE effect to an actor',
    icon: null as unknown as React.ReactNode,
    defaultData: { effectName: '', target: '', duration: '60' },
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
      { id: 'effectName', label: 'Effect Name', type: 'input', dataType: 'string' },
      { id: 'duration', label: 'Duration', type: 'input', dataType: 'number' },
    ],
    fields: [
      {
        key: 'effectName',
        label: 'Effect Name',
        type: 'text',
        placeholder: 'e.g. My Custom Effect',
        displayOrder: 1,
      },
      {
        key: 'target',
        label: 'Target',
        type: 'text',
        placeholder: '@token or Actor UUID',
        displayOrder: 2,
      },
      {
        key: 'duration',
        label: 'Duration (seconds)',
        type: 'number',
        placeholder: '60',
        displayOrder: 3,
      },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const effName = fieldVal('effectName', '');
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetActor) { ui.notifications.warn('No target'); return }`);
      lines.push(indent + `await game.dae.applyEffect(${effName}, targetActor)`);
      lines.push('');
      return lines;
    },
  },
  {
    type: 'dae-remove-effect',
    label: 'DAE: Remove Effect',
    category: 'module',
    moduleId: 'dae',
    description: 'Remove a DAE effect from an actor',
    icon: null as unknown as React.ReactNode,
    defaultData: { effectName: '', target: '' },
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
      { id: 'effectName', label: 'Effect Name', type: 'input', dataType: 'string' },
    ],
    fields: [
      {
        key: 'effectName',
        label: 'Effect Name',
        type: 'text',
        placeholder: 'e.g. My Custom Effect',
        displayOrder: 1,
      },
      {
        key: 'target',
        label: 'Target',
        type: 'text',
        placeholder: '@token or Actor UUID',
        displayOrder: 2,
      },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const effName = fieldVal('effectName', '');
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetActor) { ui.notifications.warn('No target'); return }`);
      lines.push(indent + `await game.dae.removeEffect(${effName}, targetActor)`);
      lines.push('');
      return lines;
    },
  },
  {
    type: 'dae-clear-effects',
    label: 'DAE: Clear All Effects',
    category: 'module',
    moduleId: 'dae',
    description: 'Remove all DAE effects from an actor',
    icon: null as unknown as React.ReactNode,
    defaultData: { target: '' },
    ports: [{ id: 'target', label: 'Target', type: 'input', dataType: 'token' }],
    fields: [
      {
        key: 'target',
        label: 'Target',
        type: 'text',
        placeholder: '@token or Actor UUID',
        displayOrder: 1,
      },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { indent } = ctx;
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetActor) { ui.notifications.warn('No target'); return }`);
      lines.push(
        indent + `const effects = targetActor.effects.filter(e => !e.getFlag("core","statusId"))`,
      );
      lines.push(indent + `for (const eff of effects) { await eff.delete(); }`);
      lines.push('');
      return lines;
    },
  },

  // ── Sequencer ──────────────────────────────────────────
  {
    type: 'seq-play-effect',
    label: 'Sequencer: Play Effect',
    category: 'module',
    moduleId: 'sequencer',
    description: 'Play a visual effect at a location',
    icon: null as unknown as React.ReactNode,
    defaultData: { effectFile: '', target: '', scale: '1.0', duration: '2000' },
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
      { id: 'effectFile', label: 'File', type: 'input', dataType: 'string' },
      { id: 'scale', label: 'Scale', type: 'input', dataType: 'number' },
      { id: 'duration', label: 'Duration', type: 'input', dataType: 'number' },
    ],
    fields: [
      {
        key: 'effectFile',
        label: 'Effect File Path',
        type: 'text',
        placeholder: 'modules/jb2a_pack/...',
        displayOrder: 1,
      },
      {
        key: 'target',
        label: 'Target Token',
        type: 'text',
        placeholder: '@token or name',
        displayOrder: 2,
      },
      { key: 'scale', label: 'Scale', type: 'number', placeholder: '1.0', displayOrder: 3 },
      {
        key: 'duration',
        label: 'Duration (ms)',
        type: 'number',
        placeholder: '2000',
        displayOrder: 4,
      },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const fileExpr = fieldVal('effectFile', '');
      const scaleExpr = fieldVal('scale', '1.0');
      const durationExpr = fieldVal('duration', '2000');
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetToken) { ui.notifications.warn('No target'); return }`);
      lines.push(
        indent + `if (!${fileExpr}) { ui.notifications.warn("No effect file specified"); return }`,
      );
      lines.push(indent + `new Sequence()`);
      lines.push(indent + `    .effect()`);
      lines.push(indent + `    .file(${fileExpr})`);
      lines.push(indent + `    .atLocation(targetToken.center)`);
      lines.push(indent + `    .scale(parseFloat(String(${scaleExpr})) || 1)`);
      lines.push(indent + `    .duration(parseInt(String(${durationExpr})) || 2000)`);
      lines.push(indent + `    .play()`);
      lines.push('');
      return lines;
    },
  },
  {
    type: 'seq-play-sound',
    label: 'Sequencer: Play Sound',
    category: 'module',
    moduleId: 'sequencer',
    description: 'Play a sound effect via Sequencer',
    icon: null as unknown as React.ReactNode,
    defaultData: { soundFile: '', target: '', volume: '0.5' },
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
      { id: 'soundFile', label: 'Sound File', type: 'input', dataType: 'string' },
      { id: 'volume', label: 'Volume', type: 'input', dataType: 'number' },
    ],
    fields: [
      {
        key: 'soundFile',
        label: 'Sound File Path',
        type: 'text',
        placeholder: 'modules/.../sound.ogg',
        displayOrder: 1,
      },
      {
        key: 'target',
        label: 'Target Token',
        type: 'text',
        placeholder: '@token',
        displayOrder: 2,
      },
      { key: 'volume', label: 'Volume (0-1)', type: 'number', placeholder: '0.5', displayOrder: 3 },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const sndFile = fieldVal('soundFile', '');
      const volumeExpr = fieldVal('volume', '0.5');
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetToken) { ui.notifications.warn('No target'); return }`);
      lines.push(
        indent + `if (!${sndFile}) { ui.notifications.warn("No sound file specified"); return }`,
      );
      lines.push(indent + `new Sequence()`);
      lines.push(indent + `    .sound()`);
      lines.push(indent + `    .file(${sndFile})`);
      lines.push(indent + `    .atLocation(targetToken.center)`);
      lines.push(indent + `    .volume(parseFloat(String(${volumeExpr})) || 0.5)`);
      lines.push(indent + `    .play()`);
      lines.push('');
      return lines;
    },
  },

  // ── FXMaster ────────────────────────────────────────────
  {
    type: 'fxm-weather',
    label: 'FXMaster: Set Weather',
    category: 'module',
    moduleId: 'fxmaster',
    description: 'Set scene weather effect',
    icon: null as unknown as React.ReactNode,
    defaultData: { weatherType: 'clear', intensity: '0.5' },
    ports: [],
    fields: [
      {
        key: 'weatherType',
        label: 'Weather Type',
        type: 'select',
        selectOptions: [
          { value: 'clear', label: 'None (Clear)' },
          { value: 'rain', label: 'Rain' },
          { value: 'snow', label: 'Snow' },
          { value: 'fog', label: 'Fog' },
          { value: 'clouds', label: 'Clouds' },
          { value: 'lightning', label: 'Thunderstorm' },
          { value: 'sandstorm', label: 'Sandstorm' },
          { value: 'stars', label: 'Stars' },
        ],
        displayOrder: 1,
      },
      {
        key: 'intensity',
        label: 'Intensity (0-1)',
        type: 'number',
        placeholder: '0.5',
        displayOrder: 2,
      },
    ],
    outputSchema: [],
    actorSource: 'none',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const weather = fieldVal('weatherType', 'clear');
      return [
        indent + `// --- FXMaster: Set Weather ---`,
        indent + `if (${weather} === "clear") {`,
        indent + `  canvas.scene.update({"flags.fxmaster": {effects: []}})`,
        indent + `} else {`,
        indent + `  canvas.scene.update({"flags.fxmaster": {effects: [${weather}]}})`,
        indent + `}`,
        '',
      ];
    },
  },
  {
    type: 'fxm-filter',
    label: 'FXMaster: Apply Filter',
    category: 'module',
    moduleId: 'fxmaster',
    description: 'Apply a visual filter to the scene',
    icon: null as unknown as React.ReactNode,
    defaultData: { filterType: '' },
    ports: [],
    fields: [
      {
        key: 'filterType',
        label: 'Filter',
        type: 'select',
        selectOptions: [
          { value: 'predator', label: 'Predator Vision' },
          { value: 'underwater', label: 'Underwater' },
          { value: 'dawn', label: 'Dawn' },
          { value: 'dusk', label: 'Dusk' },
          { value: 'night', label: 'Night' },
          { value: 'sunlight', label: 'Sunlight' },
          { value: 'moonlight', label: 'Moonlight' },
          { value: 'cave', label: 'Cave' },
        ],
        displayOrder: 1,
      },
    ],
    outputSchema: [],
    actorSource: 'none',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const filter = fieldVal('filterType', '');
      return [
        indent + `// --- FXMaster: Apply Filter ---`,
        indent + `if (!${filter}) { ui.notifications.warn('No filter selected'); return }`,
        indent + `canvas.effects.filters.set(${filter}, true)`,
        indent + `ui.notifications.info(\`Applied \${${filter}} filter\`)`,
        '',
      ];
    },
  },

  // ── Item Macro ──────────────────────────────────────────
  {
    type: 'itemacro-run',
    label: 'Item Macro: Execute',
    category: 'module',
    moduleId: 'itemacro',
    description: 'Execute the macro attached to an item',
    icon: null as unknown as React.ReactNode,
    defaultData: { itemName: '', target: '' },
    ports: [
      { id: 'target', label: 'Target Actor', type: 'input', dataType: 'token' },
      { id: 'itemName', label: 'Item Name', type: 'input', dataType: 'string' },
    ],
    fields: [
      {
        key: 'itemName',
        label: 'Item Name',
        type: 'text',
        placeholder: 'e.g. Longsword',
        displayOrder: 1,
      },
      {
        key: 'target',
        label: 'Target Actor',
        type: 'text',
        placeholder: '@token or Actor Name',
        displayOrder: 2,
      },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const targetExpr = fieldVal('target', 'token');
      const itemName = fieldVal('itemName', '');
      const lines = [
        indent + `// --- Item Macro: Execute ---`,
        indent + `const tgtActor = ${targetExpr}?.actor || ${targetExpr}`,
        indent + `if (!tgtActor) { ui.notifications.warn('No target actor'); return }`,
        indent + `const item = tgtActor.items.getName(${itemName})`,
        indent +
          `if (!item) { ui.notifications.warn(\`Item \"\${${itemName}}\" not found\`); return }`,
        indent + `await item.executeMacro?.()`,
        '',
      ];
      return lines;
    },
  },

  // ── Smart Target ────────────────────────────────────────
  {
    type: 'st-target-token',
    label: 'Smart Target: Target Token',
    category: 'module',
    moduleId: 'smarttarget',
    description: 'Set a token as the active target',
    icon: null as unknown as React.ReactNode,
    defaultData: { targetName: '' },
    ports: [
      // No data ports — targetName is text, no data flow
    ],
    fields: [
      {
        key: 'targetName',
        label: 'Token Name',
        type: 'text',
        placeholder: 'Goblin 1',
        displayOrder: 1,
      },
    ],
    outputSchema: [],
    actorSource: 'none',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const targetName = fieldVal('targetName', '');
      const lines = [
        indent + `// --- Smart Target: Target Token ---`,
        indent + `const tgt = ${targetName}`,
        indent + `  ? canvas.tokens.placeables.find(t => t.name === ${targetName})`,
        indent + `  : token`,
        indent + `if (!tgt) { ui.notifications.warn('Token not found'); return }`,
        indent + `tgt.setTarget(true, {releaseOthers: false})`,
        '',
      ];
      return lines;
    },
  },
  {
    type: 'st-clear-targets',
    label: 'Smart Target: Clear All',
    category: 'module',
    moduleId: 'smarttarget',
    description: 'Clear all active targets',
    icon: null as unknown as React.ReactNode,
    defaultData: {},
    ports: [],
    fields: [],
    outputSchema: [],
    actorSource: 'none',
    codeGen: () => [
      '// --- Smart Target: Clear All ---',
      'game.user.targets.forEach(t => t.setTarget(false))',
      '',
    ],
  },

  // ── Monk's Active Tile Triggers ─────────────────────────
  {
    type: 'mat-trigger-tile',
    label: 'MAT: Trigger Tile',
    category: 'module',
    moduleId: 'monks-active-tiles',
    description: "Manually trigger a Monk's Active Tile",
    icon: null as unknown as React.ReactNode,
    defaultData: { tileName: '' },
    ports: [],
    fields: [
      {
        key: 'tileName',
        label: 'Tile Name',
        type: 'text',
        placeholder: 'e.g. Trap Door',
        displayOrder: 1,
      },
    ],
    outputSchema: [],
    actorSource: 'none',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const tileName = fieldVal('tileName', '');
      return [
        indent + `// --- MAT: Trigger Tile ---`,
        indent + `const tile = canvas.tiles.placeables.find(t => t.document.name === ${tileName})`,
        indent + `if (!tile) { ui.notifications.warn('Tile not found'); return }`,
        indent + `try { await tile.document.trigger(token) } catch(e) { console.error(e) }`,
        '',
      ];
    },
  },

  // ── Dice So Nice ────────────────────────────────────────
  {
    type: 'dsn-show-roll',
    label: 'Dice So Nice: Show 3D Roll',
    category: 'module',
    moduleId: 'dice-so-nice',
    description: 'Display a 3D dice roll — pipe from a Roll Dice node',
    icon: null as unknown as React.ReactNode,
    defaultData: {},
    ports: [{ id: 'roll', label: 'Roll', type: 'input', dataType: 'roll' }],
    fields: [
      {
        key: 'roll',
        label: 'Roll Source',
        type: 'text',
        placeholder: 'Pipe from Roll Dice',
        displayOrder: 1,
      },
    ],
    outputSchema: [],
    actorSource: 'none',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const rollExpr = fieldVal('roll', '');
      if (!rollExpr) {
        return [indent + '// Dice So Nice: No roll piped — connect a Roll Dice node'];
      }
      return [
        indent + '// --- Dice So Nice: Show 3D Roll ---',
        indent + 'await game.dice3d.showForRoll(' + rollExpr + ')',
        '',
      ];
    },
  },
  // ── Wall Height ─────────────────────────────────────────
  {
    type: 'wh-set-elevation',
    label: 'Wall Height: Set Elevation',
    category: 'module',
    moduleId: 'wall-height',
    description: "Set a token's elevation for wall height checks",
    icon: null as unknown as React.ReactNode,
    defaultData: { elevation: '1', target: '' },
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
      { id: 'elevation', label: 'Elevation', type: 'input', dataType: 'number' },
    ],
    fields: [
      {
        key: 'elevation',
        label: 'Elevation (grid units)',
        type: 'number',
        placeholder: '1',
        displayOrder: 1,
      },
      { key: 'target', label: 'Target', type: 'text', placeholder: '@token', displayOrder: 2 },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const elevation = fieldVal('elevation', '1');
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetToken) { ui.notifications.warn('No target'); return }`);
      lines.push(
        indent +
          `await targetToken.document.update({"elevation": parseInt(String(${elevation})) || 1})`,
      );
      lines.push('');
      return lines;
    },
  },

  // ── Levels ──────────────────────────────────────────────
  {
    type: 'lvl-set-level',
    label: 'Levels: Set Token Level',
    category: 'module',
    moduleId: 'levels',
    description: "Set a token's current level",
    icon: null as unknown as React.ReactNode,
    defaultData: { rangeBottom: '0', rangeTop: '5', target: '' },
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
      { id: 'rangeBottom', label: 'Range Bottom', type: 'input', dataType: 'number' },
      { id: 'rangeTop', label: 'Range Top', type: 'input', dataType: 'number' },
    ],
    fields: [
      {
        key: 'rangeBottom',
        label: 'Range Bottom',
        type: 'number',
        placeholder: '0',
        displayOrder: 1,
      },
      { key: 'rangeTop', label: 'Range Top', type: 'number', placeholder: '5', displayOrder: 2 },
      { key: 'target', label: 'Target', type: 'text', placeholder: '@token', displayOrder: 3 },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const rangeBottom = fieldVal('rangeBottom', '0');
      const rangeTop = fieldVal('rangeTop', '5');
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetToken) { ui.notifications.warn('No target'); return }`);
      lines.push(indent + `targetToken.document.update({`);
      lines.push(indent + `  "elevation": parseInt(String(${rangeBottom})) || 0,`);
      lines.push(
        indent +
          `  "flags.levels": { "rangeBottom": parseInt(String(${rangeBottom})) || 0, "rangeTop": parseInt(String(${rangeTop})) || 5 }`,
      );
      lines.push(indent + `})`);
      lines.push('');
      return lines;
    },
  },

  // ── Automated Animations ────────────────────────────────
  {
    type: 'aa-test-animation',
    label: 'AutoAnimations: Test Animation',
    category: 'module',
    moduleId: 'autoanimations',
    description: 'Play a test animation on selected token',
    icon: null as unknown as React.ReactNode,
    defaultData: { animationType: 'melee', target: '' },
    ports: [
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
      { id: 'animationType', label: 'Animation Type', type: 'input', dataType: 'string' },
    ],
    fields: [
      {
        key: 'animationType',
        label: 'Animation Type',
        type: 'select',
        selectOptions: [
          { value: 'melee', label: 'Melee Attack' },
          { value: 'ranged', label: 'Ranged Attack' },
          { value: 'spell', label: 'Spell Cast' },
          { value: 'heal', label: 'Healing' },
          { value: 'buff', label: 'Buff' },
        ],
        displayOrder: 1,
      },
      { key: 'target', label: 'Target', type: 'text', placeholder: '@target', displayOrder: 2 },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const animType = fieldVal('animationType', 'melee');
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetActor) { ui.notifications.warn('No target'); return }`);
      lines.push(indent + `ui.notifications.info(\`Test animation: \${${animType}}\`)`);
      lines.push('');
      return lines;
    },
  },

  // ── Active Auras ────────────────────────────────────────
  {
    type: 'aa-refresh-auras',
    label: 'Active Auras: Refresh',
    category: 'module',
    moduleId: 'ActiveAuras',
    description: 'Force refresh all active auras',
    icon: null as unknown as React.ReactNode,
    defaultData: { target: '' },
    ports: [{ id: 'target', label: 'Target Token', type: 'input', dataType: 'token' }],
    fields: [
      {
        key: 'target',
        label: 'Target Token',
        type: 'text',
        placeholder: '(optional) @token name',
        displayOrder: 1,
      },
    ],
    outputSchema: [],
    actorSource: 'piped-token',
    codeGen: (ctx) => {
      const { indent } = ctx;
      const lines = [...fieldTokens(ctx)];
      lines.push(indent + `if (!targetActor) { ui.notifications.warn('No target'); return }`);
      lines.push(indent + `// ActiveAuras recalculates automatically`);
      lines.push(indent + `targetActor.effects.forEach(e => e.update({}))`);
      lines.push('');
      return lines;
    },
  },

  // ── Monk's Wall Enhancement ─────────────────────────────
  {
    type: 'mwe-set-wall',
    label: 'MWE: Toggle Wall Door',
    category: 'module',
    moduleId: 'monks-wall-enhancement',
    description: 'Toggle a wall door state',
    icon: null as unknown as React.ReactNode,
    defaultData: { wallName: '' },
    ports: [],
    fields: [
      {
        key: 'wallName',
        label: 'Wall ID or Direction',
        type: 'text',
        placeholder: 'e.g. wall direction: top',
        displayOrder: 1,
      },
    ],
    outputSchema: [],
    actorSource: 'none',
    codeGen: () => [
      '// --- MWE: Toggle Wall Door ---',
      '// Toggle first door in scene',
      'const doorWalls = canvas.walls.placeables.filter(w => w.document.door === CONST.WALL_DOOR_TYPES.DOOR)',
      "if (doorWalls.length === 0) { ui.notifications.warn('No doors found'); return }",
      'const wall = doorWalls[0]',
      'wall.document.update({ds: wall.document.ds === 1 ? 0 : 1})',
      '',
    ],
  },

  // ── Dice Calculator (Dice Tray) ─────────────────────────
  {
    type: 'dt-roll',
    label: 'Dice Tray: Roll Formula',
    category: 'module',
    moduleId: 'dice-calculator',
    description: 'Roll a formula via Dice Tray',
    icon: null as unknown as React.ReactNode,
    defaultData: { formula: '1d20' },
    ports: [],
    fields: [
      { key: 'formula', label: 'Formula', type: 'text', placeholder: '1d20+5', displayOrder: 1 },
    ],
    outputSchema: [],
    actorSource: 'none',
    codeGen: (ctx) => {
      const { fieldVal, indent } = ctx;
      const formula = fieldVal('formula', '1d20');
      return [
        indent + `// --- Dice Tray: Roll Formula ---`,
        indent + `const roll = await new Roll(${formula}).roll({async: true})`,
        indent + `await roll.toMessage()`,
        '',
      ];
    },
  },
];

// ─── Lookup helpers ──────────────────────────────────────

const MODULE_NODE_INDEX = new Map<string, NodeDefinition>();
for (const def of MODULE_NODE_DEFINITIONS) {
  MODULE_NODE_INDEX.set(def.type, def);
}

/**
 * Get all NodeDefinitions for a given module ID
 */
export function getModuleNodeDefinitions(moduleId: string): NodeDefinition[] {
  return MODULE_NODE_DEFINITIONS.filter((n) => n.moduleId === moduleId);
}

/**
 * Get a single module node definition by type
 */
export function getModuleNodeDefinition(type: string): NodeDefinition | undefined {
  return MODULE_NODE_INDEX.get(type);
}

/**
 * Get all module IDs that have known definitions
 */
export function getKnownModuleIds(): string[] {
  const ids = new Set<string>();
  for (const def of MODULE_NODE_DEFINITIONS) {
    if (def.moduleId) ids.add(def.moduleId);
  }
  return Array.from(ids);
}

/**
 * Get the module ID for a given node type
 */
export function getModuleIdForNodeType(type: string): string | undefined {
  return MODULE_NODE_INDEX.get(type)?.moduleId;
}
