import { useStore } from './store';

const RELAY_HEADERS = () => {
  const { apiKey, clientId } = useStore.getState().config;
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

  // ─── Binary helper ──────────────────────────────────────
  /** Fetch binary data (images, etc.) from the relay proxy */
  async getBinary(path: string): Promise<Blob> {
    const base = getUrl(path.startsWith('/') ? path : `/${path}`);
    const res = await fetch(base, { headers: RELAY_HEADERS() });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.blob();
  },

  // ─── Canvas / Scene Rendering ────────────────────────────

  /** Get a fully rendered screenshot of a scene (tokens, lights, walls rendered) */
  getSceneImage(params?: { sceneId?: string; active?: boolean }): Promise<Blob> {
    const q = new URLSearchParams();
    if (params?.sceneId) q.set('sceneId', params.sceneId);
    if (params?.active) q.set('active', 'true');
    const qs = q.toString();
    return this.getBinary(`/scene/image${qs ? `?${qs}` : ''}`);
  },

  /** Get the raw background image of a scene (no overlays) */
  getSceneImageRaw(params?: { sceneId?: string; active?: boolean }): Promise<Blob> {
    const q = new URLSearchParams();
    if (params?.sceneId) q.set('sceneId', params.sceneId);
    if (params?.active) q.set('active', 'true');
    const qs = q.toString();
    return this.getBinary(`/scene/image/raw${qs ? `?${qs}` : ''}`);
  },

  /** Get scene data (with all embedded documents) */
  getScene(params?: { sceneId?: string; active?: boolean; all?: boolean }): Promise<unknown> {
    const q = new URLSearchParams();
    if (params?.sceneId) q.set('sceneId', params.sceneId);
    if (params?.active) q.set('active', 'true');
    if (params?.all) q.set('all', 'true');
    const qs = q.toString();
    return apiGet(`/scene${qs ? `?${qs}` : ''}`);
  },

  // ─── Canvas Embedded Documents ──────────────────────────

  /** Get canvas embedded documents (tokens, walls, lights, etc.) */
  getCanvasDocuments(documentType: string, sceneId?: string): Promise<unknown> {
    return apiGet(`/canvas/${documentType}`, sceneId ? { sceneId } : undefined);
  },

  /** Create canvas embedded document(s) */
  createCanvasDocument(
    documentType: string,
    data: Record<string, unknown> | Record<string, unknown>[],
    sceneId?: string,
  ): Promise<unknown> {
    return apiPost(`/canvas/${documentType}`, { data }, sceneId ? { sceneId } : undefined);
  },

  /** Update a canvas embedded document */
  updateCanvasDocument(
    documentType: string,
    documentId: string,
    data: Record<string, unknown>,
    sceneId?: string,
  ): Promise<unknown> {
    return apiPut(
      `/canvas/${documentType}`,
      { documentId, data },
      sceneId ? { sceneId } : undefined,
    );
  },

  /** Delete a canvas embedded document */
  deleteCanvasDocument(documentType: string, documentId: string, sceneId?: string): Promise<void> {
    const q = new URLSearchParams({ documentId });
    if (sceneId) q.set('sceneId', sceneId);
    return fetch(`${getUrl(`/canvas/${documentType}`)}?${q.toString()}`, {
      method: 'DELETE',
      headers: RELAY_HEADERS(),
    }).then((r) => r.text()) as Promise<void>;
  },

  // ─── Token Movement ──────────────────────────────────────

  /** Move a token to specific coordinates (optionally animated with waypoints) */
  moveToken(params: {
    x: number;
    y: number;
    uuid?: string;
    name?: string;
    waypoints?: Array<{ x: number; y: number }>;
    animate?: boolean;
    sceneId?: string;
  }): Promise<unknown> {
    return apiPost('/move-token', params);
  },

  // ─── Distance Measurement ──────────────────────────────

  /** Measure distance between two points or tokens */
  measureDistance(params: {
    originX?: number;
    originY?: number;
    targetX?: number;
    targetY?: number;
    originUuid?: string;
    originName?: string;
    targetUuid?: string;
    targetName?: string;
    sceneId?: string;
  }): Promise<unknown> {
    return apiGet('/measure-distance', params as Record<string, string>);
  },

  structure: (types = 'Actor,Scene,Item', includeEntityData = 'false') =>
    apiGet<unknown>('/structure', { types, includeEntityData }),

  search: (query: string, type = 'Actor') => apiGet<unknown>('/search', { query, type }),

  get: (uuid: string) => apiGet<unknown>('/get', { uuid }),

  encounters: () => apiGet<unknown>('/encounters'),

  startEncounter: (body: Record<string, unknown>) => apiPost('/start-encounter', body),

  nextTurn: (encounter?: string) => apiPost('/next-turn', encounter ? { encounter } : undefined),

  nextRound: (encounter?: string) => apiPost('/next-round', encounter ? { encounter } : undefined),

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

  update: (uuid: string, data: Record<string, unknown>) => apiPut('/update', { data }, { uuid }),

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

  getChatMessages: (limit = 50) => apiGet<unknown>('/chat', { limit: String(limit) }),

  getRolls: (limit = 20) => apiGet<unknown>('/rolls', { limit: String(limit) }),

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

  dndDeathSave: (params: { actorUuid: string; advantage?: boolean; createChatMessage?: boolean }) =>
    apiPost('/dnd5e/death-save', params),

  roll: (params: { formula: string; createChatMessage?: boolean }) => apiPost('/roll', params),

  getClients: () => apiGet<unknown>('/clients'),

  getUsers: () => apiGet<unknown>('/users'),

  // ─── D&D 5e Rests ───────────────────────────────────────

  dndShortRest: (params: { actorUuid: string; autoHD?: boolean; autoHDThreshold?: number }) =>
    apiPost('/dnd5e/short-rest', params),

  dndLongRest: (params: { actorUuid: string; newDay?: boolean }) =>
    apiPost('/dnd5e/long-rest', params),

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

  dndPrepareSpell: (params: { actorUuid: string; spellName: string; prepared: boolean }) =>
    apiPost('/dnd5e/prepare-spell', params),

  // ─── D&D 5e Currency ─────────────────────────────────────

  dndModifyCurrency: (params: { actorUuid: string; currency: string; amount: number }) =>
    apiPost('/dnd5e/modify-currency', params),

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

  getActorEffects: (uuid: string) => apiGet<unknown>('/effects', { uuid }),

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

  addCombatants: (params: { tokens: string[]; encounter?: string }) =>
    apiPost('/add-to-encounter', params),

  removeCombatant: (params: { combatantUuid: string; encounter?: string }) =>
    apiPost('/remove-from-encounter', params),

  // ─── World Info / Module Detection ──────────────────────

  worldInfo: () =>
    apiGet<{
      id: string;
      title: string;
      description: string;
      modules: Array<{
        id: string;
        title: string;
        active: boolean;
        version: string;
        description?: string;
        authors?: string;
      }>;
      [key: string]: unknown;
    }>('/world-info'),

  executeJs: (script: string) => apiPost<{ result: unknown }>('/execute-js', { script }),

  // ─── Macros ──────────────────────────────────────────────

  getMacros: () => apiGet<unknown>('/macros'),

  createMacro: (params: { name: string; type: string; scope: string; command: string }) =>
    apiPost('/create', {
      entityType: 'Macro',
      data: {
        name: params.name,
        type: params.type,
        scope: params.scope,
        command: params.command,
      },
    }),

  updateMacro: (uuid: string, data: Record<string, unknown>) =>
    apiPut<unknown>('/update', { data }, { uuid }),

  deleteMacro: (uuid: string) =>
    fetch(`${getUrl('/delete')}?uuid=${uuid}`, {
      method: 'DELETE',
      headers: RELAY_HEADERS(),
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return r.text();
    }),

  executeMacro: (uuid: string) => apiPost('/macro/' + uuid + '/execute'),

  // ─── Scenes ───────────────────────────────────────────────

  activateScene: (params: { sceneId: string }) => apiPost('/switch-scene', params),

  mcpCall: (toolName: string, params: Record<string, unknown>) => apiPost(`/${toolName}`, params),

  // ─── Journals ─────────────────────────────────────────────

  getJournals: () =>
    apiGet<unknown>('/structure', {
      types: 'JournalEntry',
      includeEntityData: 'true',
      recursive: 'true',
    }),

  getJournal: (uuid: string) => apiGet<unknown>('/get', { uuid }),

  createJournal: (params: {
    name: string;
    pages: Array<{ name: string; content: string; type?: string }>;
    folder?: string;
  }) => {
    const { folder, ...data } = params;
    return apiPost('/create', { entityType: 'JournalEntry', data, ...(folder ? { folder } : {}) });
  },

  updateJournal: (uuid: string, data: Record<string, unknown>) =>
    apiPut('/update', { data }, { uuid }),

  deleteJournal: (uuid: string) =>
    fetch(`${getUrl('/delete')}?uuid=${uuid}`, {
      method: 'DELETE',
      headers: RELAY_HEADERS(),
    }).then((r) => r.text()),

  // ─── Compendiums ──────────────────────────────────────────

  /** List all compendium packs via execute-js */
  getCompendiumPacks: () =>
    apiPost<{ success: boolean; result: unknown }>('/execute-js', {
      script: `return game.packs.map(p => ({
        id: p.metadata.id,
        name: p.metadata.name,
        label: p.metadata.label,
        collection: p.collection,
        package: p.metadata.package,
        packageName: p.metadata.packageName,
        entityType: p.metadata.type,
        path: "Compendium." + p.collection,
        private: !!p.private,
        size: p.index.size
      }));`,
    }),

  /** Get contents of a compendium pack via execute-js (uses index — lightweight) */
  getCompendiumPackContents: (packName: string) =>
    apiPost<{ success: boolean; result: unknown }>('/execute-js', {
      script: `return JSON.stringify(
        (game.packs.get("${packName}")?.index?.contents || []).map(e => ({
          _id: e._id,
          name: e.name,
          type: e.type,
          img: e.img || null,
          uuid: e.uuid,
          folder: e.folder || null,
          sort: e.sort || 0
        }))
      );`,
    }),

  /** Get a single compendium entry by UUID */
  getCompendiumEntry: (uuid: string) => apiGet<unknown>('/get', { uuid }),

  /** Create a new document in a compendium pack */
  createCompendiumEntry: (packName: string, entityType: string, data: Record<string, unknown>) =>
    apiPost('/execute-js', {
      script: `(async () => {
        const pack = game.packs.get("${packName}");
        const doc = await pack.createDocument({type: "${entityType}", ...${JSON.stringify(data)}});
        return { id: doc.id, uuid: doc.uuid, name: doc.name };
      })()`,
    }),

  /** Update a document in a compendium pack */
  updateCompendiumEntry: (uuid: string, data: Record<string, unknown>) =>
    apiPost('/execute-js', {
      script: `(async () => {
        const doc = await fromUuid("${uuid}");
        if (!doc) throw new Error("Document not found");
        const updated = await doc.update(${JSON.stringify(data)});
        return { id: updated.id, name: updated.name };
      })()`,
    }),

  /** Delete a document from a compendium pack */
  deleteCompendiumEntry: (uuid: string) =>
    apiPost('/execute-js', {
      script: `(async () => {
        const doc = await fromUuid("${uuid}");
        if (!doc) throw new Error("Document not found");
        const packName = doc.pack;
        const pack = game.packs.get(packName);
        if (!pack) throw new Error("Pack not found");
        await pack.deleteDocument(doc.id);
        return { success: true, uuid: "${uuid}" };
      })()`,
    }),

  /** Import a compendium entry into the world */
  importCompendiumEntry: (uuid: string) =>
    apiPost('/execute-js', {
      script: `(async () => {
        const doc = await fromUuid("${uuid}");
        if (!doc) throw new Error("Document not found");
        const imported = await doc.importToWorld();
        return { id: imported.id, uuid: imported.uuid, name: imported.name, type: imported.documentName };
      })()`,
    }),

  /** Search compendiums — uses /search which includes compendium results by default */
  searchCompendiums: (query: string, limit = 100) =>
    apiGet<unknown>('/search', { query, limit: String(limit) }),

  /** Search within a specific compendium pack via execute-js */
  searchCompendiumPack: (packName: string, query: string, limit = 200) =>
    apiPost<{ success: boolean; result: unknown }>('/execute-js', {
      script: `return JSON.stringify(
        (game.packs.get("${packName}")?.index?.contents || [])
          .filter(e => !"${query}" || e.name.toLowerCase().includes("${query}".toLowerCase()))
          .slice(0, ${limit})
          .map(e => ({
            _id: e._id,
            name: e.name,
            type: e.type,
            img: e.img || null,
            uuid: "Compendium.${packName}." + e.type + "." + e._id,
            folder: e.folder || null,
            sort: e.sort || 0
          }))
      )`,
    }),
};
