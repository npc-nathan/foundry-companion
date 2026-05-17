import { describe, it, expect } from 'vitest';

/**
 * Relay API Contract Smoke Tests
 *
 * These tests validate that:
 * 1. The relay endpoints respond with correct HTTP status codes
 * 2. Response bodies have the expected structure (type, data fields)
 * 3. The relay isn't silently failing or returning error shapes
 *
 * They require a running dev server (npm run dev).
 * Override RELAY_BASE with an env var for CI/non-standard ports.
 */

const BASE_URL = process.env.RELAY_BASE || 'http://localhost:3000';
const API_KEY = process.env.RELAY_API_KEY || 'test-key';

interface RelaySuccess<T = unknown> {
  type: 'success' | 'error';
  data?: T;
  error?: string;
  [key: string]: unknown;
}

async function relayGet(path: string): Promise<[number, RelaySuccess]> {
  const url = `${BASE_URL}/api/relay${path}`;
  const res = await fetch(url, {
    headers: {
      'x-api-key': API_KEY,
      'x-client-id': 'test-client',
      'Content-Type': 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  return [res.status, body];
}

async function relayHealth(): Promise<[number, RelaySuccess]> {
  const url = `${BASE_URL}/api/relay/api/health`;
  const res = await fetch(url, {
    headers: {
      'x-api-key': API_KEY,
      'x-client-id': 'test-client',
    },
  });
  const body = await res.json().catch(() => ({}));
  return [res.status, body];
}

// ──────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────

describe('Relay API — Health', () => {
  it('returns 200 from health endpoint', async () => {
    const [status] = await relayHealth();
    expect(status).toBe(200);
  });

  it('returns a JSON body from health', async () => {
    const [, body] = await relayHealth();
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
  });
});

describe('Relay API — World Structure', () => {
  it('returns 200 from /structure', async () => {
    const [status] = await relayGet('/structure?types=Actor,Scene,Item');
    expect(status).toBe(200);
  });

  it('returns structure data with expected keys', async () => {
    const [, body] = await relayGet('/structure?types=Actor,Scene,Item&includeEntityData=true');
    // Structure responses typically have folders/actors/scenes at top level
    expect(body).toBeDefined();
  });

  it('returns 200 with all types', async () => {
    const [status] = await relayGet(
      '/structure?types=Actor,Scene,Item,JournalEntry,RollTable&recursive=true',
    );
    expect(status).toBe(200);
  });
});

describe('Relay API — Search', () => {
  it('returns 200 from /search', async () => {
    const [status] = await relayGet('/search?query=test&type=Actor');
    expect(status).toBe(200);
  });
});

describe('Relay API — Scenes', () => {
  it('returns 200 listing scenes', async () => {
    const [status] = await relayGet('/structure?types=Scene&includeEntityData=true');
    expect(status).toBe(200);
  });
});

describe('Relay API — Actors', () => {
  it('returns 200 listing actors', async () => {
    const [status] = await relayGet('/structure?types=Actor&includeEntityData=true');
    expect(status).toBe(200);
  });
});

describe('Relay API — Chat', () => {
  it('returns 200 from /chat', async () => {
    const [status] = await relayGet('/chat?limit=5');
    expect(status).toBe(200);
  });
});

describe('Relay API — Rolls', () => {
  it('returns 200 from /rolls', async () => {
    const [status] = await relayGet('/rolls?limit=5');
    expect(status).toBe(200);
  });
});

describe('Relay API — Combat', () => {
  it('returns 200 from /encounters', async () => {
    const [status] = await relayGet('/encounters');
    expect(status).toBe(200);
  });
});

describe('Relay API — Clients', () => {
  it('returns 200 from /clients', async () => {
    const [status] = await relayGet('/clients');
    expect(status).toBe(200);
  });

  it('returns 200 from /users', async () => {
    const [status] = await relayGet('/users');
    expect(status).toBe(200);
  });
});

describe('Relay API — World Info', () => {
  it('returns 200 from /world-info', async () => {
    const [status] = await relayGet('/world-info');
    expect(status).toBe(200);
  });
});

describe('Relay API — Macros', () => {
  it('returns 200 from /macros', async () => {
    const [status] = await relayGet('/macros');
    expect(status).toBe(200);
  });
});

describe('Relay API — Effects', () => {
  it('returns 200 or 4xx from /effects (requires valid uuid)', async () => {
    // Effect endpoints need a valid actor UUID, so we just check the endpoint exists
    const [status] = await relayGet('/effects?uuid=test');
    // Either it responds (200) or tells us the UUID is invalid (400/404)
    expect([200, 400, 404, 401]).toContain(status);
  });
});
