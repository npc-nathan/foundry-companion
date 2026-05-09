/**
 * Module Mappings — Known Foundry module API templates
 *
 * Maps module IDs to their known Foundry-side JavaScript APIs.
 * This is a living file. Contributions welcome for new modules.
 *
 * Each mapping defines:
 *  - label: Display name in the palette
 *  - description: Tooltip description
 *  - docs: URL to module docs (optional)
 *  - nodes: Array of node type definitions with property schemas
 *    and generateCode functions that emit real Foundry API calls
 */

import { relay } from './relay'

// ─── Types ──────────────────────────────────────────────────

export interface ModuleNodeProperty {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'actor'
  placeholder?: string
  /** For 'select' type: static options */
  options?: { value: string; label: string }[]
  /** For 'select' type: fetch from relay at mount */
  dynamicSource?: 'actors' | 'macros' | 'scenes' | 'playlists' | 'tables' | 'effects'
}

export interface ModuleNodeDef {
  type: string
  label: string
  description: string
  properties: ModuleNodeProperty[]
  /** Generate the Foundry JavaScript code for this node */
  generateCode: (data: Record<string, string>) => string[]
}

export interface ModuleMapping {
  id: string
  label: string
  description: string
  docs?: string
  nodes: ModuleNodeDef[]
}

// ─── Helper: sanitize strings for code gen ──────────────────

const esc = (s: string) => s.replace(/"/g, '\\"')
const escBlock = (s: string) => s.replace(/`/g, '\\`').replace(/\$/g, '\\$')
const intVal = (s: string | undefined, fallback = 0) => String(parseInt(s || String(fallback)) || fallback)

// ─── DFreds Convenient Effects ──────────────────────────────
// Docs: https://github.com/DFreds/dfreds-convenient-effects

const CE_EFFECT_OPTIONS: { value: string; label: string }[] = [
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
]

const dfredsCE: ModuleMapping = {
  id: 'dfreds-convenient-effects',
  label: 'DFreds Convenient Effects',
  description: 'Pre-built status effects with automated mechanics',
  docs: 'https://github.com/DFreds/dfreds-convenient-effects',
  nodes: [
    {
      type: 'ce-apply-effect',
      label: 'Apply CE Effect',
      description: 'Apply a convenient effect to a token',
      properties: [
        {
          key: 'effectName',
          label: 'Effect Name',
          type: 'select',
          options: CE_EFFECT_OPTIONS,
        },
        { key: 'target', label: 'Target', type: 'text', placeholder: '@token or Actor UUID' },
        {
          key: 'duration',
          label: 'Duration (rounds, 0=unlimited)',
          type: 'number',
          placeholder: '0',
        },
      ],
      generateCode: (d) => [
        '// --- DFreds Convenient Effects: Apply ---',
        d.effectName ? `const effectName = "${esc(d.effectName)}"` : 'const effectName = "Burning"',
        d.target
          ? `const targetToken = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const targetToken = token',
        "if (!targetToken) { ui.notifications.warn('No target selected'); return }",
        d.duration && parseInt(d.duration) > 0
          ? `game.dfreds.effects.addEffectOnTarget(effectName, targetToken.actor.uuid, { seconds: ${parseInt(d.duration) * 6})`
          : 'game.dfreds.effects.addEffectOnTarget(effectName, targetToken.actor.uuid)',
        "ui.notifications.info(`Applied ${effectName}`)",
        '',
      ],
    },
    {
      type: 'ce-remove-effect',
      label: 'Remove CE Effect',
      description: 'Remove a convenient effect from a token',
      properties: [
        {
          key: 'effectName',
          label: 'Effect Name',
          type: 'select',
          options: CE_EFFECT_OPTIONS,
        },
        { key: 'target', label: 'Target', type: 'text', placeholder: '@token or Actor UUID' },
      ],
      generateCode: (d) => [
        '// --- DFreds Convenient Effects: Remove ---',
        d.effectName ? `const effectName = "${esc(d.effectName)}"` : 'const effectName = "Burning"',
        d.target
          ? `const targetToken = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const targetToken = token',
        "if (!targetToken) { ui.notifications.warn('No target selected'); return }",
        'game.dfreds.effects.removeEffectFromTarget(effectName, targetToken.actor.uuid)',
        "ui.notifications.info(`Removed ${effectName}`)",
        '',
      ],
    },
  ],
}

// ─── DAE (Dynamic Active Effects) ────────────────────────────
// Docs: https://gitlab.com/tposney/dae

const dae: ModuleMapping = {
  id: 'dae',
  label: 'Dynamic Active Effects (DAE)',
  description: 'Runtime active effect manipulation',
  docs: 'https://gitlab.com/tposney/dae',
  nodes: [
    {
      type: 'dae-apply-effect',
      label: 'DAE: Apply Effect',
      description: 'Apply a DAE effect to an actor',
      properties: [
        { key: 'effectName', label: 'Effect Name', type: 'text', placeholder: 'e.g. My Custom Effect' },
        { key: 'target', label: 'Target', type: 'text', placeholder: '@token or Actor UUID' },
        { key: 'duration', label: 'Duration (seconds)', type: 'number', placeholder: '60' },
      ],
      generateCode: (d) => [
        '// --- DAE: Apply Effect ---',
        `const effName = "${esc(d.effectName || '')}"`,
        d.target
          ? `const tgt = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('No target'); return }",
        `await game.dae.applyEffect(effName, tgt.actor)`,
        '',
      ],
    },
    {
      type: 'dae-remove-effect',
      label: 'DAE: Remove Effect',
      description: 'Remove a DAE effect from an actor',
      properties: [
        { key: 'effectName', label: 'Effect Name', type: 'text', placeholder: 'e.g. My Custom Effect' },
        { key: 'target', label: 'Target', type: 'text', placeholder: '@token or Actor UUID' },
      ],
      generateCode: (d) => [
        '// --- DAE: Remove Effect ---',
        `const effName = "${esc(d.effectName || '')}"`,
        d.target
          ? `const tgt = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('No target'); return }",
        `await game.dae.removeEffect(effName, tgt.actor)`,
        '',
      ],
    },
    {
      type: 'dae-clear-effects',
      label: 'DAE: Clear All Effects',
      description: 'Remove all DAE effects from an actor',
      properties: [
        { key: 'target', label: 'Target', type: 'text', placeholder: '@token or Actor UUID' },
      ],
      generateCode: (d) => [
        '// --- DAE: Clear All Effects ---',
        d.target
          ? `const tgt = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('No target'); return }",
        'const effects = tgt.actor.effects.filter(e => !e.getFlag("core","statusId"))',
        'for (const eff of effects) { await eff.delete(); }',
        '',
      ],
    },
  ],
}

// ─── Sequencer ───────────────────────────────────────────────
// Docs: https://github.com/fantasy-calendar/sequencer

const sequencer: ModuleMapping = {
  id: 'sequencer',
  label: 'Sequencer',
  description: 'Play animated visual effects and sequences',
  docs: 'https://github.com/fantasy-calendar/sequencer/wiki',
  nodes: [
    {
      type: 'seq-play-effect',
      label: 'Sequencer: Play Effect',
      description: 'Play a visual effect at a location',
      properties: [
        { key: 'effectFile', label: 'Effect File Path', type: 'text', placeholder: 'modules/jb2a_pack/...' },
        { key: 'target', label: 'Target Token', type: 'text', placeholder: '@token or name' },
        { key: 'scale', label: 'Scale', type: 'number', placeholder: '1.0' },
        { key: 'duration', label: 'Duration (ms)', type: 'number', placeholder: '2000' },
      ],
      generateCode: (d) => [
        '// --- Sequencer: Play Effect ---',
        `const file = "${esc(d.effectFile || '')}"`,
        d.target
          ? `const tgt = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('No target'); return }",
        'if (!file) { ui.notifications.warn("No effect file specified"); return }',
        `new Sequence()`,
        `    .effect()`,
        `    .file(file)`,
        `    .atLocation(tgt.center)`,
        d.scale ? `    .scale(${parseFloat(d.scale) || 1})` : '',
        d.duration ? `    .duration(${intVal(d.duration, 2000)})` : '',
        `    .play()`,
        '',
      ],
    },
    {
      type: 'seq-play-sound',
      label: 'Sequencer: Play Sound',
      description: 'Play a sound effect via Sequencer',
      properties: [
        { key: 'soundFile', label: 'Sound File Path', type: 'text', placeholder: 'modules/.../sound.ogg' },
        { key: 'target', label: 'Target Token', type: 'text', placeholder: '@token' },
        { key: 'volume', label: 'Volume (0-1)', type: 'number', placeholder: '0.5' },
      ],
      generateCode: (d) => [
        '// --- Sequencer: Play Sound ---',
        `const sndFile = "${esc(d.soundFile || '')}"`,
        d.target
          ? `const tgt = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('No target'); return }",
        'if (!sndFile) { ui.notifications.warn("No sound file specified"); return }',
        `new Sequence()`,
        `    .sound()`,
        `    .file(sndFile)`,
        `    .atLocation(tgt.center)`,
        d.volume ? `    .volume(${parseFloat(d.volume) || 0.5})` : '',
        `    .play()`,
        '',
      ],
    },
  ],
}

// ─── FXMaster ────────────────────────────────────────────────
// Docs: https://github.com/ghost-fvtt/fxmaster

const fxmaster: ModuleMapping = {
  id: 'fxmaster',
  label: "Gambit's FXMaster",
  description: 'Weather effects, filters, and particle effects',
  docs: 'https://github.com/ghost-fvtt/fxmaster',
  nodes: [
    {
      type: 'fxm-weather',
      label: 'FXMaster: Set Weather',
      description: 'Set scene weather effect',
      properties: [
        {
          key: 'weatherType',
          label: 'Weather Type',
          type: 'select',
          options: [
            { value: 'clear', label: 'None (Clear)' },
            { value: 'rain', label: 'Rain' },
            { value: 'snow', label: 'Snow' },
            { value: 'fog', label: 'Fog' },
            { value: 'clouds', label: 'Clouds' },
            { value: 'lightning', label: 'Thunderstorm' },
            { value: 'sandstorm', label: 'Sandstorm' },
            { value: 'stars', label: 'Stars' },
          ],
        },
        { key: 'intensity', label: 'Intensity (0-1)', type: 'number', placeholder: '0.5' },
      ],
      generateCode: (d) => [
        '// --- FXMaster: Set Weather ---',
        `const weather = "${esc(d.weatherType || 'clear')}"`,
        'if (weather === "clear") {',
        '  canvas.scene.update({"flags.fxmaster": {effects: []}})',
        '} else {',
        `  canvas.scene.update({"flags.fxmaster.effects": [weather]})`,
        '}',
        '',
      ],
    },
    {
      type: 'fxm-filter',
      label: 'FXMaster: Apply Filter',
      description: 'Apply a visual filter to the scene',
      properties: [
        {
          key: 'filterType',
          label: 'Filter',
          type: 'select',
          options: [
            { value: 'predator', label: 'Predator Vision' },
            { value: 'underwater', label: 'Underwater' },
            { value: 'dawn', label: 'Dawn' },
            { value: 'dusk', label: 'Dusk' },
            { value: 'night', label: 'Night' },
            { value: 'sunlight', label: 'Sunlight' },
            { value: 'moonlight', label: 'Moonlight' },
            { value: 'cave', label: 'Cave' },
          ],
        },
      ],
      generateCode: (d) => [
        '// --- FXMaster: Apply Filter ---',
        `const filter = "${esc(d.filterType || '')}"`,
        "if (!filter) { ui.notifications.warn('No filter selected'); return }",
        'canvas.fxmaster.filters.add(filter)'.replace('canvas.filters.add', 'canvas.effects.filters.set'),
        "ui.notifications.info(`Applied ${filter} filter`)",
        '',
      ],
    },
  ],
}

// ─── Item Macro ──────────────────────────────────────────────
// Docs: https://github.com/ruipin/fvtt-item-macro

const itemacro: ModuleMapping = {
  id: 'itemacro',
  label: 'Item Macro',
  description: 'Run macros attached to items, spells, or features',
  docs: 'https://github.com/ruipin/fvtt-item-macro',
  nodes: [
    {
      type: 'itemacro-run',
      label: 'Item Macro: Execute',
      description: 'Execute the macro attached to an item',
      properties: [
        { key: 'itemName', label: 'Item Name', type: 'text', placeholder: 'e.g. Longsword' },
        { key: 'target', label: 'Target Actor', type: 'text', placeholder: '@token or Actor Name' },
      ],
      generateCode: (d) => [
        '// --- Item Macro: Execute ---',
        d.target
          ? `const actor = game.actors.getName("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")?.actor`
          : 'const actor = token?.actor',
        "if (!actor) { ui.notifications.warn('No target actor'); return }",
        `const item = actor.items.getName("${esc(d.itemName || '')}")`,
        "if (!item) { ui.notifications.warn(`Item \"${esc(d.itemName || '')}\" not found`); return }",
        'await item.executeMacro?.()',
        '',
      ],
    },
  ],
}

// ─── Smart Target ────────────────────────────────────────────
// Docs: https://github.com/theripper93/smart-target

const smarttarget: ModuleMapping = {
  id: 'smarttarget',
  label: 'Smart Target',
  description: 'Token targeting utilities',
  docs: 'https://github.com/theripper93/smart-target',
  nodes: [
    {
      type: 'st-target-token',
      label: 'Smart Target: Target Token',
      description: 'Set a token as the active target',
      properties: [
        { key: 'targetName', label: 'Token Name', type: 'text', placeholder: 'Goblin 1' },
      ],
      generateCode: (d) => [
        '// --- Smart Target: Target Token ---',
        d.targetName
          ? `const tgt = canvas.tokens.placeables.find(t => t.name === "${esc(d.targetName)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('Token not found'); return }",
        'tgt.setTarget(true, {releaseOthers: false})',
        '',
      ],
    },
    {
      type: 'st-clear-targets',
      label: 'Smart Target: Clear All',
      description: 'Clear all active targets',
      properties: [],
      generateCode: () => [
        '// --- Smart Target: Clear All ---',
        'game.user.targets.forEach(t => t.setTarget(false))',
        '',
      ],
    },
  ],
}

// ─── Monk's Active Tile Triggers ─────────────────────────────
// Docs: https://github.com/ironmonk88/monks-active-tiles

const monksActiveTiles: ModuleMapping = {
  id: 'monks-active-tiles',
  label: "Monk's Active Tile Triggers",
  description: 'Trigger tile effects programmatically',
  docs: 'https://github.com/ironmonk88/monks-active-tiles',
  nodes: [
    {
      type: 'mat-trigger-tile',
      label: 'MAT: Trigger Tile',
      description: "Manually trigger a Monk's Active Tile",
      properties: [
        { key: 'tileName', label: 'Tile Name', type: 'text', placeholder: 'e.g. Trap Door' },
      ],
      generateCode: (d) => [
        '// --- MAT: Trigger Tile ---',
        `const tile = canvas.tiles.placeables.find(t => t.document.name === "${esc(d.tileName || '')}")`,
        "if (!tile) { ui.notifications.warn('Tile not found'); return }",
        'try { await tile.document.trigger(token) } catch(e) { console.error(e) }',
        '',
      ],
    },
  ],
}

// ─── Dice So Nice ────────────────────────────────────────────
// Docs: https://gitlab.com/riccisi/foundryvtt-dice-so-nice

const diceSoNice: ModuleMapping = {
  id: 'dice-so-nice',
  label: 'Dice So Nice!',
  description: '3D dice rolling with custom themes',
  docs: 'https://gitlab.com/riccisi/foundryvtt-dice-so-nice',
  nodes: [
    {
      type: 'dsn-show-roll',
      label: 'Dice So Nice: Show 3D Roll',
      description: 'Display a 3D dice roll',
      properties: [
        { key: 'formula', label: 'Formula', type: 'text', placeholder: '1d20+5' },
        { key: 'flavor', label: 'Flavor Text', type: 'text', placeholder: 'Attack Roll' },
      ],
      generateCode: (d) => [
        '// --- Dice So Nice: Show 3D Roll ---',
        `const formula = "${esc(d.formula || '1d20')}"`,
        `const flavor = "${esc(d.flavor || '')}"`,
        'const roll = await new Roll(formula).roll({async: true})',
        'await game.dice3d.showForRoll(roll)',
        'if (flavor) await roll.toMessage({flavor})',
        '',
      ],
    },
  ],
}

// ─── Wall Height ─────────────────────────────────────────────
// Docs: https://github.com/theripper93/wall-height

const wallHeight: ModuleMapping = {
  id: 'wall-height',
  label: 'Wall Height',
  description: 'Elevation-based wall visibility',
  docs: 'https://github.com/theripper93/wall-height',
  nodes: [
    {
      type: 'wh-set-elevation',
      label: 'Wall Height: Set Elevation',
      description: "Set a token's elevation for wall height checks",
      properties: [
        { key: 'elevation', label: 'Elevation (grid units)', type: 'number', placeholder: '1' },
        { key: 'target', label: 'Target', type: 'text', placeholder: '@token' },
      ],
      generateCode: (d) => [
        '// --- Wall Height: Set Elevation ---',
        d.target
          ? `const tgt = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('No target'); return }",
        `await tgt.document.update({"elevation": ${intVal(d.elevation, 1)}})`,
        '',
      ],
    },
  ],
}

// ─── Levels ──────────────────────────────────────────────────
// Docs: https://github.com/theripper93/levels

const levels: ModuleMapping = {
  id: 'levels',
  label: 'Levels',
  description: 'Multi-level map support with elevation',
  docs: 'https://github.com/theripper93/levels',
  nodes: [
    {
      type: 'lvl-set-level',
      label: 'Levels: Set Token Level',
      description: "Set a token's current level",
      properties: [
        { key: 'rangeBottom', label: 'Range Bottom', type: 'number', placeholder: '0' },
        { key: 'rangeTop', label: 'Range Top', type: 'number', placeholder: '5' },
        { key: 'target', label: 'Target', type: 'text', placeholder: '@token' },
      ],
      generateCode: (d) => [
        '// --- Levels: Set Token Level ---',
        d.target
          ? `const tgt = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('No target'); return }",
        `tgt.document.update({
  "elevation": ${intVal(d.rangeBottom, 0)},
  "flags.levels": { "rangeBottom": ${intVal(d.rangeBottom, 0)}, "rangeTop": ${intVal(d.rangeTop, 5)} }
})`,
        '',
      ],
    },
  ],
}

// ─── Automated Animations ────────────────────────────────────
// Docs: https://github.com/otigon/automated-jb2a-animations

const autoAnimations: ModuleMapping = {
  id: 'autoanimations',
  label: 'Automated Animations',
  description: 'Automatic JB2A animations on actions',
  docs: 'https://github.com/otigon/automated-jb2a-animations',
  nodes: [
    {
      type: 'aa-test-animation',
      label: 'AutoAnimations: Test Animation',
      description: 'Play a test animation on selected token',
      properties: [
        { key: 'animationType', label: 'Animation Type', type: 'select', options: [
          { value: 'melee', label: 'Melee Attack' },
          { value: 'ranged', label: 'Ranged Attack' },
          { value: 'spell', label: 'Spell Cast' },
          { value: 'heal', label: 'Healing' },
          { value: 'buff', label: 'Buff' },
        ]},
        { key: 'target', label: 'Target', type: 'text', placeholder: '@target' },
      ],
      generateCode: (d) => [
        '// --- AutoAnimations: Test Animation ---',
        d.target
          ? `const tgt = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('No target'); return }",
        `const animType = "${esc(d.animationType || 'melee')}"`,
        '// AutoAnimations triggers automatically on item usage',
        `ui.notifications.info(\`Test animation: \${animType}\`)`,
        '',
      ],
    },
  ],
}

// ─── Active Auras ────────────────────────────────────────────
// Docs: https://github.com/kandashi/Active-Auras

const activeAuras: ModuleMapping = {
  id: 'ActiveAuras',
  label: 'Active Auras',
  description: 'Automated aura effect management',
  docs: 'https://github.com/kandashi/Active-Auras',
  nodes: [
    {
      type: 'aa-refresh-auras',
      label: 'Active Auras: Refresh',
      description: 'Force refresh all active auras',
      properties: [
        { key: 'target', label: 'Target Token', type: 'text', placeholder: '(optional) @token name' },
      ],
      generateCode: (d) => [
        '// --- Active Auras: Refresh ---',
        d.target
          ? `const tgt = canvas.tokens.get("${esc(d.target)}") || canvas.tokens.placeables.find(t => t.name === "${esc(d.target)}")`
          : 'const tgt = token',
        "if (!tgt) { ui.notifications.warn('No target'); return }",
        '// ActiveAuras recalculates automatically',
        'tgt.actor.effects.forEach(e => e.update({}))',
        '',
      ],
    },
  ],
}

// ─── Monk's Wall Enhancement ─────────────────────────────────
// Docs: https://github.com/ironmonk88/monks-wall-enhancement

const monksWallEnhancement: ModuleMapping = {
  id: 'monks-wall-enhancement',
  label: "Monk's Wall Enhancement",
  description: 'Advanced wall editing utilities',
  docs: 'https://github.com/ironmonk88/monks-wall-enhancement',
  nodes: [
    {
      type: 'mwe-set-wall',
      label: 'MWE: Toggle Wall Door',
      description: 'Toggle a wall door state',
      properties: [
        { key: 'wallName', label: 'Wall ID or Direction', type: 'text', placeholder: 'e.g. wall direction: top' },
      ],
      generateCode: (d) => [
        '// --- MWE: Toggle Wall Door ---',
        '// Toggle first door in scene',
        'const doorWalls = canvas.walls.placeables.filter(w => w.document.door === CONST.WALL_DOOR_TYPES.DOOR)',
        "if (doorWalls.length === 0) { ui.notifications.warn('No doors found'); return }",
        "const wall = doorWalls[0]",
        'wall.document.update({ds: wall.document.ds === 1 ? 0 : 1})',
        '',
      ],
    },
  ],
}

// ─── Dice Calculator (Dice Tray) ─────────────────────────────
// Docs: https://github.com/theripper93/dice-calculator

const diceCalculator: ModuleMapping = {
  id: 'dice-calculator',
  label: 'Dice Tray',
  description: 'Quick dice formulas from the tray',
  docs: 'https://github.com/theripper93/dice-calculator',
  nodes: [
    {
      type: 'dt-roll',
      label: 'Dice Tray: Roll Formula',
      description: 'Roll a formula via Dice Tray',
      properties: [
        { key: 'formula', label: 'Formula', type: 'text', placeholder: '1d20+5' },
      ],
      generateCode: (d) => [
        '// --- Dice Tray: Roll Formula ---',
        `const roll = await new Roll("${esc(d.formula || '1d20')}").roll({async: true})`,
        'await roll.toMessage()',
        '',
      ],
    },
  ],
}

// ─── All mapped modules ──────────────────────────────────────

export const MODULE_MAPPINGS: Record<string, ModuleMapping> = {
  'dfreds-convenient-effects': dfredsCE,
  'dae': dae,
  'sequencer': sequencer,
  'fxmaster': fxmaster,
  'itemacro': itemacro,
  'smarttarget': smarttarget,
  'monks-active-tiles': monksActiveTiles,
  'dice-so-nice': diceSoNice,
  'wall-height': wallHeight,
  'levels': levels,
  'autoanimations': autoAnimations,
  'ActiveAuras': activeAuras,
  'monks-wall-enhancement': monksWallEnhancement,
  'dice-calculator': diceCalculator,
}

/**
 * Get the mapping for a module if it exists
 */
export function getModuleMapping(moduleId: string): ModuleMapping | null {
  return MODULE_MAPPINGS[moduleId] ?? null
}

/**
 * Get all module IDs that have known mappings
 */
export function getKnownModuleIds(): string[] {
  return Object.keys(MODULE_MAPPINGS)
}
