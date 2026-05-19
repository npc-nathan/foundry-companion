import { Blocks, Crosshair, Shield, Skull, Table2, Volume2, Image } from 'lucide-react';
import type { NodeDefinition } from './types';
import { safeJsKey } from './helpers';
import { SKILL_OPTIONS, ABILITY_OPTIONS, STATUS_OPTIONS } from './schema-fields';

export const ACTION_NODES: NodeDefinition[] = [
  // ── Roll Dice ──────────────────────────────────────────────
  {
    type: 'rollDice',
    label: 'Roll Dice',
    category: 'action',
    description: 'Roll a dice formula',
    icon: <Blocks className="h-3 w-3 text-blue-400" />,
    defaultData: { formula: '1d20', flavor: '' },
    actorSource: 'none',
    ports: [
      { id: 'result', label: 'Result', type: 'output', dataType: 'number' },
      { id: 'roll_object', label: 'Roll Object', type: 'output', dataType: 'roll' },
    ],
    fields: [
      {
        key: 'formula',
        label: 'Formula',
        type: 'expression',
        placeholder: 'e.g. 1d20+5',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'flavor',
        label: 'Flavor Text',
        type: 'expression',
        placeholder: 'e.g. "Sneak Attack!"',
        expressionAllowed: true,
        displayOrder: 2,
      },
    ],
    outputSchema: [
      {
        portId: 'result',
        portLabel: 'Result',
        portType: 'number',
        fields: [{ key: '', label: 'Roll Total', type: 'number', path: '' }],
      },
      {
        portId: 'roll_object',
        portLabel: 'Roll Object',
        portType: 'roll',
        fields: [],
      },
    ],
    example: { result: 17 },
    codeGen: ({ d, indent, dataVar, esc }) => {
      const formula = String(d.formula || '1d20');
      const nodeName = safeJsKey(String(d.nodeName || 'rollDice'));
      const formulaVar = '__formula_' + nodeName;
      return [
        indent + '// Roll Dice',
        indent + 'const ' + formulaVar + ' = __args?.' + nodeName,
        indent +
          'const ' +
          dataVar('roll_object') +
          ' = typeof ' + formulaVar + ' === "number" ? { total: ' + formulaVar + ' } : null',
        indent +
          'let ' +
          dataVar('result') +
          ' = typeof ' + formulaVar + ' === "number" ? ' + formulaVar + ' : undefined',
        indent + 'if (typeof ' + dataVar('result') + ' !== "number") {',
        indent + '  const f = ' + formulaVar + ' || "' + esc(formula) + '"',
        indent + '  const r = new Roll(f)',
        indent + '  await r.evaluate()',
        ...(d.flavor
          ? [indent + '  r.toMessage({ flavor: "' + esc(String(d.flavor)) + '" })']
          : []),
        indent + '  ' + dataVar('result') + ' = r.total',
        indent + '}',
      ];
    },
  },

  // ── Deal Damage ────────────────────────────────────────────
  {
    type: 'dealDamage',
    label: 'Deal Damage',
    category: 'action',
    description: 'Deal damage to selected token',
    icon: <Crosshair className="h-3 w-3 text-red-400" />,
    defaultData: { amount: '10' },
    actorSource: 'piped-token',
    ports: [
      { id: 'amount', label: 'Amount', type: 'input', dataType: 'number' },
      { id: 'source', label: 'Source', type: 'input', dataType: 'token' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'amount',
        label: 'Damage Amount',
        type: 'expression',
        placeholder: 'e.g. 10 or 1d8+3',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'source',
        label: 'Source Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (deals the damage)',
        expressionAllowed: true,
        displayOrder: 2,
      },
      {
        key: 'target',
        label: 'Target Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (takes the damage)',
        expressionAllowed: true,
        displayOrder: 3,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const damount = fieldVal('amount', String(d.amount || '10'));
      const dmgAmountVal = '(' + damount + ')';
      const sourceExpr = fieldVal('source', 'token');
      const targetExpr = fieldVal('target', 'token');
      return [
        indent + '// Deal Damage -> source deals damage to target',
        indent + 'const dmgSource = ' + sourceExpr,
        indent + 'const dmgTarget = ' + targetExpr,
        indent + 'const dmgSourceActor = dmgSource?.actor || dmgSource',
        indent + 'const dmgTargetActor = dmgTarget?.actor || dmgTarget',
        indent + 'if (dmgTargetActor) {',
        indent + '  let dmgTotal = ' + dmgAmountVal,
        indent +
          "  if (typeof dmgTotal === 'string' && /^\\\\d*d\\\\d/i.test(dmgTotal)) {",
        indent + '    const r = await new Roll(dmgTotal).evaluate()',
        indent + '    dmgTotal = r.total',
        indent + '  }',
        indent + '  const cur = dmgTargetActor.system.attributes.hp.value || 0',
        indent + '  const newHp = Math.max(0, cur - dmgTotal)',
        indent +
          '  await dmgTargetActor.update({ "system.attributes.hp.value": newHp })',
        indent +
          '  const srcName = dmgSource?.name || dmgSourceActor?.name || "Someone"',
        indent +
          '  const tgtName = dmgTarget?.name || dmgTargetActor?.name || "Someone"',
        indent +
          '  ChatMessage.create({ content: srcName + " deals " + dmgTotal + " damage to " + tgtName + "." })',
        indent + '}',
      ];
    },
  },

  // ── Heal Target ────────────────────────────────────────────
  {
    type: 'healTarget',
    label: 'Heal Target',
    category: 'action',
    description: 'Heal selected token',
    icon: <Crosshair className="h-3 w-3 text-green-400" />,
    defaultData: { amount: '10' },
    actorSource: 'piped-token',
    ports: [
      { id: 'amount', label: 'Amount', type: 'input', dataType: 'number' },
      { id: 'source', label: 'Source', type: 'input', dataType: 'token' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'amount',
        label: 'Heal Amount',
        type: 'expression',
        placeholder: 'e.g. 10 or 2d4+3',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'source',
        label: 'Source Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (does the healing)',
        expressionAllowed: true,
        displayOrder: 2,
      },
      {
        key: 'target',
        label: 'Target Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (receives healing)',
        expressionAllowed: true,
        displayOrder: 3,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const hamount = fieldVal('amount', String(d.amount || '10'));
      const healAmountVal = '(' + hamount + ')';
      const sourceExpr = fieldVal('source', 'token');
      const htargetExpr = fieldVal('target', 'token');
      return [
        indent + '// Heal Target -> source heals target',
        indent + 'const healSource = ' + sourceExpr,
        indent + 'const healTarget_ = ' + htargetExpr,
        indent + 'const healSourceActor = healSource?.actor || healSource',
        indent + 'const hActorRef = healTarget_?.actor || healTarget_',
        indent + 'if (hActorRef) {',
        indent + '  const cur = hActorRef.system.attributes.hp.value || 0',
        indent + '  const max = hActorRef.system.attributes.hp.max || 999',
        indent + '  const newHp = Math.min(max, cur + ' + healAmountVal + ')',
        indent +
          '  await hActorRef.update({ "system.attributes.hp.value": newHp })',
        indent +
          '  const srcName = healSource?.name || healSourceActor?.name || "Someone"',
        indent +
          '  const tgtName = healTarget_?.name || hActorRef.name || "Someone"',
        indent +
          '  ChatMessage.create({ content: srcName + " heals " + tgtName + " for " + ' +
          healAmountVal +
          ' + "." })',
        indent + '}',
      ];
    },
  },

  // ── Send Chat ──────────────────────────────────────────────
  {
    type: 'sendChat',
    label: 'Send Chat',
    category: 'action',
    description: 'Send a message to chat',
    icon: <Blocks className="h-3 w-3 text-cyan-400" />,
    defaultData: { content: 'Hello!', mode: 'OOC' },
    actorSource: 'none',
    ports: [{ id: 'content', label: 'Content', type: 'input', dataType: 'string' }],
    fields: [
      {
        key: 'content',
        label: 'Message',
        type: 'expression',
        placeholder: 'e.g. "The goblin collapses!"',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        selectOptions: [
          { value: 'OOC', label: 'OOC (out of character)' },
          { value: 'IC', label: 'IC (in character)' },
          { value: 'EMOTE', label: 'Emote' },
          { value: 'WHISPER', label: 'Whisper' },
        ],
        displayOrder: 2,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const content = fieldVal('content', String(d.content || ''));
      const mode = String(d.mode || 'OOC') === 'IC' ? 'IC' : 'OOC';
      return [
        indent + '// Send Chat Message -> e.g. OOC: The goblin collapses!',
        indent + 'ChatMessage.create({',
        indent + '  content: String(' + content + '),',
        indent + '  type: CONST.CHAT_MESSAGE_TYPES.' + mode + ',',
        indent + '})',
      ];
    },
  },

  // ── Apply Effect ───────────────────────────────────────────
  {
    type: 'applyEffect',
    label: 'Apply Effect',
    category: 'action',
    description: 'Apply an active effect',
    icon: <Blocks className="h-3 w-3 text-yellow-400" />,
    defaultData: { effectName: 'Burning', amount: '60' },
    actorSource: 'piped-token',
    ports: [
      { id: 'effectName', label: 'Effect Name', type: 'input', dataType: 'string' },
      { id: 'source', label: 'Source', type: 'input', dataType: 'token' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'effectName',
        label: 'Effect Name',
        type: 'expression',
        placeholder: 'e.g. Burning, Poisoned, Bless',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'amount',
        label: 'Duration (seconds)',
        type: 'expression',
        placeholder: 'e.g. 60',
        expressionAllowed: true,
        displayOrder: 2,
      },
      {
        key: 'source',
        label: 'Source Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (applies the effect)',
        expressionAllowed: true,
        displayOrder: 3,
      },
      {
        key: 'target',
        label: 'Target Override',
        type: 'expression',
        placeholder: 'token, @uuid, or Actor name (receives the effect)',
        expressionAllowed: true,
        displayOrder: 4,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const effectName = fieldVal('effectName', String(d.effectName || ''));
      const sourceExpr = fieldVal('source', 'token');
      const targetExpr = fieldVal('target', 'token');
      const dur = String(d.amount || '60');
      return [
        indent + '// Apply Effect -> source applies effect to target',
        indent + 'const applySource = ' + sourceExpr,
        indent + 'const applyTarget = ' + targetExpr,
        indent + 'const applySourceActor = applySource?.actor || applySource',
        indent + 'const applyActor = applyTarget?.actor || applyTarget',
        indent + 'if (applyActor) {',
        indent +
          '  const originUuid = applySourceActor?.uuid || applySource?.uuid || applyActor.uuid',
        indent + '  const effectData = {',
        indent + '    label: String(' + effectName + '),',
        indent + '    origin: originUuid,',
        indent + '    duration: { seconds: ' + (parseInt(dur) || 60) + ' }',
        indent + '  }',
        indent +
          '  await applyActor.createEmbeddedDocuments("ActiveEffect", [effectData])',
        indent + '}',
      ];
    },
  },

  // ── Apply Status ───────────────────────────────────────────
  {
    type: 'applyStatus',
    label: 'Apply Status',
    category: 'action',
    description: 'Apply a status condition icon',
    icon: <Shield className="h-3 w-3 text-orange-400" />,
    defaultData: { statusId: 'poisoned' },
    actorSource: 'piped-token',
    ports: [
      { id: 'statusId', label: 'Status', type: 'input', dataType: 'string' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'statusId',
        label: 'Status Effect',
        type: 'select',
        selectOptions: STATUS_OPTIONS,
        displayOrder: 1,
      },
    ],
    codeGen: ({ indent, fieldVal }) => {
      const statusId = fieldVal('statusId', 'poisoned');
      const targetExpr = fieldVal('target', 'token');
      return [
        indent +
          '// Apply Status -> e.g. toggles poisoned icon on selected token',
        indent + 'const applyStatusTarget = ' + targetExpr,
        indent +
          'const applyStatusActor = applyStatusTarget?.actor || applyStatusTarget',
        indent + 'if (applyStatusActor) {',
        indent +
          '  await applyStatusActor.toggleStatusEffect(String(' +
          statusId +
          '), { active: true })',
        indent + '}',
      ];
    },
  },

  // ── Ability Check ──────────────────────────────────────────
  {
    type: 'abilityCheck',
    label: 'Ability Check',
    category: 'action',
    description: 'Roll an ability check',
    icon: <Blocks className="h-3 w-3 text-indigo-400" />,
    defaultData: { ability: 'str', flavor: '' },
    actorSource: 'piped-token',
    ports: [
      { id: 'ability', label: 'Ability', type: 'input', dataType: 'string' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'ability',
        label: 'Ability',
        type: 'select',
        selectOptions: ABILITY_OPTIONS,
        displayOrder: 1,
      },
      {
        key: 'flavor',
        label: 'Flavor Text',
        type: 'expression',
        placeholder: 'e.g. "Bend Bars"',
        expressionAllowed: true,
        displayOrder: 2,
      },
    ],
    codeGen: ({ d, indent, fieldVal, esc }) => {
      const ability = fieldVal('ability', String(d.ability || 'str'));
      const flavors = d.flavor
        ? ', { flavor: "' + esc(String(d.flavor)) + '" }'
        : '';
      const targetExpr = fieldVal('target', 'token');
      return [
        indent +
          '// Ability Check -> e.g. STR check: d20 + modifier, result shown in chat',
        indent + 'const abCheckTarget = ' + targetExpr,
        indent + 'const abCheckActor = abCheckTarget?.actor || abCheckTarget',
        indent + 'if (abCheckActor) {',
        indent +
          '  await abCheckActor.rollAbilityTest(String(' +
          ability +
          ')' +
          flavors +
          ')',
        indent + '}',
      ];
    },
  },

  // ── Skill Check ────────────────────────────────────────────
  {
    type: 'skillCheck',
    label: 'Skill Check',
    category: 'action',
    description: 'Roll a skill check',
    icon: <Blocks className="h-3 w-3 text-indigo-400" />,
    defaultData: { skill: 'prc', flavor: '' },
    actorSource: 'piped-token',
    ports: [
      { id: 'skill', label: 'Skill', type: 'input', dataType: 'string' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'skill',
        label: 'Skill',
        type: 'select',
        selectOptions: SKILL_OPTIONS,
        displayOrder: 1,
      },
      {
        key: 'flavor',
        label: 'Flavor Text',
        type: 'expression',
        placeholder: 'e.g. "Search for traps"',
        expressionAllowed: true,
        displayOrder: 2,
      },
    ],
    codeGen: ({ d, indent, fieldVal, esc }) => {
      const skill = fieldVal('skill', String(d.skill || 'prc'));
      const flavors = d.flavor
        ? ', { flavor: "' + esc(String(d.flavor)) + '" }'
        : '';
      const targetExpr = fieldVal('target', 'token');
      return [
        indent +
          '// Skill Check -> e.g. Perception check: d20 + WIS, result shown in chat',
        indent + 'const skCheckTarget = ' + targetExpr,
        indent + 'const skCheckActor = skCheckTarget?.actor || skCheckTarget',
        indent + 'if (skCheckActor) {',
        indent +
          '  await skCheckActor.rollSkill(String(' +
          skill +
          ')' +
          flavors +
          ')',
        indent + '}',
      ];
    },
  },

  // ── Concentration Save ─────────────────────────────────────
  {
    type: 'concentrationSave',
    label: 'Concentration Save',
    category: 'action',
    description: 'Roll a concentration saving throw',
    icon: <Shield className="h-3 w-3 text-purple-400" />,
    defaultData: { damageAmount: '10' },
    actorSource: 'piped-token',
    ports: [
      { id: 'damageAmount', label: 'Damage', type: 'input', dataType: 'number' },
      { id: 'target', label: 'Target', type: 'input', dataType: 'token' },
    ],
    fields: [
      {
        key: 'damageAmount',
        label: 'Damage Taken',
        type: 'expression',
        placeholder: 'e.g. 14',
        expressionAllowed: true,
        displayOrder: 1,
      },
    ],
    codeGen: ({ d, indent, fieldVal }) => {
      const dmg = fieldVal('damageAmount', String(d.damageAmount || '10'));
      const targetExpr = fieldVal('target', 'token');
      return [
        indent +
          '// Concentration Save -> e.g. DC 10 CON save for 14 damage taken',
        indent + 'const concTarget = ' + targetExpr,
        indent + 'const concActor = concTarget?.actor || concTarget',
        indent + 'if (concActor) {',
        indent +
          '  await concActor.rollConcentrationSave(Number(' +
          dmg +
          '))',
        indent + '}',
      ];
    },
  },

  // ── Death Save ─────────────────────────────────────────────
  {
    type: 'deathSave',
    label: 'Death Save',
    category: 'action',
    description: 'Roll a death saving throw',
    icon: <Skull className="h-3 w-3 text-red-400" />,
    defaultData: {},
    actorSource: 'piped-token',
    ports: [{ id: 'target', label: 'Target', type: 'input', dataType: 'token' }],
    fields: [],
    codeGen: ({ indent, fieldVal }) => {
      const targetExpr = fieldVal('target', 'token');
      return [
        indent +
          '// Death Save -> e.g. d20 roll, success/fail tracked automatically',
        indent + 'const dsTarget = ' + targetExpr,
        indent + 'const dsActor = dsTarget?.actor || dsTarget',
        indent + 'if (dsActor) {',
        indent + '  await dsActor.rollDeathSave({})',
        indent + '}',
      ];
    },
  },

  // ── Get Actor HP ───────────────────────────────────────────
  {
    type: 'getActorHP',
    label: 'Get Actor HP',
    category: 'action',
    description: 'Get HP & temp HP from selected token',
    icon: <Shield className="h-3 w-3 text-emerald-400" />,
    defaultData: {},
    actorSource: 'controlled',
    ports: [
      { id: 'hp', label: 'HP', type: 'output', dataType: 'number' },
      { id: 'maxHp', label: 'Max HP', type: 'output', dataType: 'number' },
      { id: 'tempHp', label: 'Temp HP', type: 'output', dataType: 'number' },
    ],
    fields: [],
    outputSchema: [
      {
        portId: 'hp',
        portLabel: 'HP',
        portType: 'number',
        fields: [{ key: '', label: 'Current HP', type: 'number', path: '' }],
      },
      {
        portId: 'maxHp',
        portLabel: 'Max HP',
        portType: 'number',
        fields: [{ key: '', label: 'Max HP', type: 'number', path: '' }],
      },
      {
        portId: 'tempHp',
        portLabel: 'Temp HP',
        portType: 'number',
        fields: [{ key: '', label: 'Temp HP', type: 'number', path: '' }],
      },
    ],
    example: { hp: 42, maxHp: 50, tempHp: 5 },
    codeGen: ({ indent, dataVar }) => {
      return [
        indent + '// Get Actor HP -> e.g. returns hp: 42, maxHp: 50, tempHp: 5',
        indent + 'const hpActor = token?.actor',
        indent + 'if (hpActor) {',
        indent + '  const hpData = hpActor.system.attributes.hp',
        indent + '  const ' + dataVar('hp') + ' = hpData.value',
        indent + '  const ' + dataVar('maxHp') + ' = hpData.max',
        indent + '  const ' + dataVar('tempHp') + ' = hpData.temp || 0',
        indent + '}',
      ];
    },
  },

  // ── Roll Table ─────────────────────────────────────────────
  {
    type: 'rollTable',
    label: 'Roll Table',
    category: 'action',
    description: 'Roll on a random table',
    icon: <Table2 className="h-3 w-3 text-amber-400" />,
    defaultData: { tableName: '', tableId: '' },
    actorSource: 'none',
    ports: [{ id: 'result', label: 'Result', type: 'output', dataType: 'string' }],
    fields: [
      {
        key: 'tableName',
        label: 'Table Name',
        type: 'expression',
        placeholder: 'e.g. "Treasure Horde"',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'tableId',
        label: 'Table ID (fallback)',
        type: 'text',
        placeholder: 'UUID if name fails',
        displayOrder: 2,
      },
    ],
    outputSchema: [
      {
        portId: 'result',
        portLabel: 'Result',
        portType: 'string',
        fields: [{ key: '', label: 'Roll Result Text', type: 'string', path: '' }],
      },
    ],
    example: { result: 'Potion of Healing' },
    codeGen: ({ d, indent, dataVar, esc }) => {
      const tableName = String(d.tableName || '');
      const tableId = String(d.tableId || '');
      const tableRef = tableName
        ? 'game.tables.getName("' + esc(tableName) + '")'
        : tableId
          ? 'game.tables.get("' + esc(tableId) + '")'
          : 'null';
      return [
        indent +
          '// Roll Table: ' +
          (tableName || tableId) +
          ' -> e.g. rolled: Potion of Healing',
        indent + 'const table = ' + tableRef,
        indent + 'if (table) {',
        indent + '  const rollResult = await table.roll()',
        indent +
          '  const ' +
          dataVar('result') +
          ' = rollResult?.results?.[0]?.text || ""',
        indent + '}',
      ];
    },
  },

  // ── Play Sound ─────────────────────────────────────────────
  {
    type: 'playSound',
    label: 'Play Sound',
    category: 'action',
    description: 'Play a sound from a playlist',
    icon: <Volume2 className="h-3 w-3 text-emerald-400" />,
    defaultData: { playlistName: '', soundName: '' },
    actorSource: 'none',
    ports: [],
    fields: [
      {
        key: 'playlistName',
        label: 'Playlist Name',
        type: 'expression',
        placeholder: 'e.g. "Battle Themes"',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'soundName',
        label: 'Sound Name',
        type: 'expression',
        placeholder: 'e.g. "Thunderclap"',
        expressionAllowed: true,
        displayOrder: 2,
      },
    ],
    codeGen: ({ d, indent, esc }) => {
      const playlistName = String(d.playlistName || '');
      const soundName = String(d.soundName || '');
      const lines: string[] = [
        indent +
          '// Play Sound -> e.g. plays Thunderclap from Battle Themes playlist',
      ];
      if (playlistName && soundName) {
        lines.push(
          indent +
            'const playlist = game.playlists.getName("' +
            esc(playlistName) +
            '")',
        );
        lines.push(indent + 'if (playlist) {');
        lines.push(
          indent +
            '  const sound = playlist.sounds.getName("' +
            esc(soundName) +
            '")',
        );
        lines.push(indent + '  if (sound) sound.play()');
        lines.push(indent + '}');
      } else if (playlistName) {
        lines.push(
          indent +
            'const playlist = game.playlists.getName("' +
            esc(playlistName) +
            '")',
        );
        lines.push(indent + 'if (playlist) {');
        lines.push(indent + '  playlist.play()');
        lines.push(indent + '}');
      }
      return lines;
    },
  },

  // ── Toggle Scene ───────────────────────────────────────────
  {
    type: 'toggleScene',
    label: 'Toggle Scene',
    category: 'action',
    description: 'Switch to / activate a scene',
    icon: <Image className="h-3 w-3 text-sky-400" />,
    defaultData: { sceneName: '', sceneId: '' },
    actorSource: 'none',
    ports: [{ id: 'scene', label: 'Scene', type: 'input', dataType: 'scene' }],
    fields: [
      {
        key: 'sceneName',
        label: 'Scene Name',
        type: 'expression',
        placeholder: 'e.g. "The Dark Forest"',
        expressionAllowed: true,
        displayOrder: 1,
      },
      {
        key: 'sceneId',
        label: 'Scene ID (fallback)',
        type: 'text',
        placeholder: 'UUID if name fails',
        displayOrder: 2,
      },
    ],
    codeGen: ({ d, indent, fieldVal, esc }) => {
      const sceneRef = fieldVal('scene', '');
      const sceneName = String(d.sceneName || '');
      const lines: string[] = [
        indent +
          '// Toggle Scene: ' +
          sceneName +
          ' -> e.g. activates The Dark Forest',
      ];
      if (sceneRef) {
        lines.push(indent + 'if (' + sceneRef + ') {');
        lines.push(indent + '  await ' + sceneRef + '.activate()');
        lines.push(indent + '}');
      } else if (sceneName) {
        lines.push(
          indent +
            'const scene = game.scenes.getName("' +
            esc(sceneName) +
            '")',
        );
        lines.push(indent + 'if (scene) {');
        lines.push(indent + '  await scene.activate()');
        lines.push(indent + '}');
      } else if (d.sceneId) {
        lines.push(
          indent +
            'const scene = game.scenes.get("' +
            esc(String(d.sceneId)) +
            '")',
        );
        lines.push(indent + 'if (scene) {');
        lines.push(indent + '  await scene.activate()');
        lines.push(indent + '}');
      }
      return lines;
    },
  },
];
