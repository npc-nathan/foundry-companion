import { useStore } from './store';

const RELAY_HEADERS = () => {
  const { relayUrl, apiKey, clientId } = useStore.getState().config;
  return {
    'x-api-key': apiKey,
    'x-client-id': clientId || 'companion-app',
    'Content-Type': 'application/json',
  } as Record<string, string>;
};

function getUrl(path: string) {
  return `/api/relay${path}`;
}

async function apiGet<T = unknown>(path: string, query?: Record<string, string>) {
  const base = getUrl(path);
  const params = new URLSearchParams(query || {});
  const qs = params.toString();
  const url = qs ? `${base}?${qs}` : base;
  const res = await fetch(url, { headers: RELAY_HEADERS() });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<{ type: string; data: T } & Record<string, unknown>>;
}

async function apiPost<T = unknown>(path: string, body?: unknown, query?: Record<string, string>) {
  const base = getUrl(path);
  const params = new URLSearchParams(query || {});
  const qs = params.toString();
  const url = qs ? `${base}?${qs}` : base;
  const res = await fetch(url, {
    method: 'POST',
    headers: RELAY_HEADERS(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function apiPut<T = unknown>(path: string, body?: unknown, query?: Record<string, string>) {
  const base = getUrl(path);
  const params = new URLSearchParams(query || {});
  const qs = params.toString();
  const url = qs ? `${base}?${qs}` : base;
  const res = await fetch(url, {
    method: 'PUT',
    headers: RELAY_HEADERS(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const relay = {
  health: () =>
    fetch(`${getUrl('/api/health')}`, { headers: RELAY_HEADERS() }).then((r) => r.json()),

  structure: (types = 'Actor,Scene,Item', includeEntityData = 'false') =>
    apiGet<unknown>('/structure', { types, includeEntityData }),

  search: (query: string, type = 'Actor') =>
    apiGet<unknown>('/search', { query, type }),

  get: (uuid: string) =>
    apiGet<unknown>('/get', { uuid }),

  encounters: () =>
    apiGet<unknown>('/encounters'),

  startEncounter: (body: Record<string, unknown>) =>
    apiPost('/start-encounter', body),

  nextTurn: (encounter?: string) =>
    apiPost('/next-turn', encounter ? { encounter } : undefined),

  nextRound: (encounter?: string) =>
    apiPost('/next-round', encounter ? { encounter } : undefined),

  previousTurn: (encounter?: string) =>
    apiPost('/last-turn', encounter ? { encounter } : undefined),

  previousRound: (encounter?: string) =>
    apiPost('/last-round', encounter ? { encounter } : undefined),

  endEncounter: (encounter?: string) =>
    apiPost('/end-encounter', encounter ? { encounter } : undefined),

  increase: (uuid: string, attribute: string, amount: number) =>
    apiPost('/increase', { attribute, amount }, { uuid }),

  decrease: (uuid: string, attribute: string, amount: number) =>
    apiPost('/decrease', { attribute, amount }, { uuid }),

  create: (entityType: string, data: Record<string, unknown>, folder?: string) =>
    apiPost('/create', { entityType, data, ...(folder ? { folder } : {}) }),

  update: (uuid: string, data: Record<string, unknown>) =>
    apiPut('/update', { data }, { uuid }),

  delete: (uuid: string) =>
    fetch(`${getUrl('/delete')}?uuid=${uuid}`, {
      method: 'DELETE',
      headers: RELAY_HEADERS(),
    }).then((r) => r.text()),

  chat: (content: string, whisper?: string, speaker?: string, chatType?: number, alias?: string) =>
    apiPost('/chat', {
      content,
      ...(whisper ? { whisper: [whisper] } : {}),
      ...(speaker ? { speaker } : {}),
      ...(chatType !== undefined ? { chatType } : {}),
      ...(alias ? { alias } : {}),
    }),

  getChatMessages: (limit = 50) =>
    apiGet<unknown>('/chat', { limit: String(limit) }),

  getRolls: (limit = 20) =>
    apiGet<unknown>('/rolls', { limit: String(limit) }),

  dndAbilityCheck: (params: {
    actorUuid: string;
    ability: string;
    advantage?: boolean;
    disadvantage?: boolean;
    bonus?: number;
    createChatMessage?: boolean;
  }) => apiPost('/dnd5e/ability-check', params),

  dndAbilitySave: (params: {
    actorUuid: string;
    ability: string;
    advantage?: boolean;
    disadvantage?: boolean;
    bonus?: number;
    createChatMessage?: boolean;
  }) => apiPost('/dnd5e/ability-save', params),

  dndSkillCheck: (params: {
    actorUuid: string;
    skill: string;
    advantage?: boolean;
    disadvantage?: boolean;
    bonus?: number;
    createChatMessage?: boolean;
  }) => apiPost('/dnd5e/skill-check', params),

  dndDeathSave: (params: {
    actorUuid: string;
    advantage?: boolean;
    createChatMessage?: boolean;
  }) => apiPost('/dnd5e/death-save', params),

  roll: (params: {
    formula: string;
    createChatMessage?: boolean;
  }) => apiPost('/roll', params),

  getClients: () =>
    apiGet<unknown>('/clients'),

  getUsers: () =>
    apiGet<unknown>('/users'),

  // ─── D&D 5e Rests ───────────────────────────────────────

  dndShortRest: (params: {
    actorUuid: string;
    autoHD?: boolean;
    autoHDThreshold?: number;
  }) => apiPost('/dnd5e/short-rest', params),

  dndLongRest: (params: {
    actorUuid: string;
    newDay?: boolean;
  }) => apiPost('/dnd5e/long-rest', params),

  // ─── D&D 5e Equipment ───────────────────────────────────

  dndEquipItem: (params: {
    actorUuid: string;
    itemUuid?: string;
    itemName?: string;
    equipped: boolean;
  }) => apiPost('/dnd5e/equip-item', params),

  dndAttuneItem: (params: {
    actorUuid: string;
    itemUuid?: string;
    itemName?: string;
    attuned: boolean;
  }) => apiPost('/dnd5e/attune-item', params),

  // ─── D&D 5e Spells ──────────────────────────────────────

  dndPrepareSpell: (params: {
    actorUuid: string;
    spellName: string;
    prepared: boolean;
  }) => apiPost('/dnd5e/prepare-spell', params),

  // ─── D&D 5e Currency ─────────────────────────────────────

  dndModifyCurrency: (params: {
    actorUuid: string;
    currency: string;
    amount: number;
  }) => apiPost('/dnd5e/modify-currency', params),

  // ─── D&D 5e Saves ───────────────────────────────────────

  dndConcentrationSave: (params: {
    actorUuid: string;
    damage: number;
    advantage?: boolean;
    disadvantage?: boolean;
    bonus?: number;
    createChatMessage?: boolean;
  }) => apiPost('/dnd5e/concentration-save', params),

  // ─── Effects ─────────────────────────────────────────────

  getActorEffects: (uuid: string) =>
    apiGet<unknown>('/effects', { uuid }),

  createEffect: (params: {
    uuid: string;
    statusId?: string;
    effectData?: Record<string, unknown>;
  }) => apiPost('/effects', params),

  deleteEffect: (params: { uuid: string } & ({ effectId: string } | { statusId: string })) =>
    fetch(`${getUrl('/effects')}?${new URLSearchParams(params as Record<string, string>)}`, {
      method: 'DELETE',
      headers: RELAY_HEADERS(),
    }).then((r) => r.text()),

  // ─── Canvas ──────────────────────────────────────────────

  getCanvasRegions: (sceneId?: string) =>
    apiGet<unknown>('/canvas/regions', sceneId ? { sceneId } : undefined),

  // ─── Combat ──────────────────────────────────────────────

  addCombatants: (params: {
    tokens: string[];
    encounter?: string;
  }) => apiPost('/add-to-encounter', params),

  removeCombatant: (params: {
    combatantUuid: string;
    encounter?: string;
  }) => apiPost('/remove-from-encounter', params),
};
