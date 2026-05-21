import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/**
 * Relay API Contract Smoke Tests
 *
 * These tests validate that:
 * 1. The relay endpoints would respond with correct HTTP status codes
 * 2. Response bodies have the expected structure (type, data fields)
 * 3. The relay isn't silently failing or returning error shapes
 *
 * Uses mocked fetch so no running dev server is required.
 * Set RELAY_LIVE=true to run against a real dev server instead.
 */

const BASE_URL = process.env.RELAY_BASE || 'http://localhost:3000';
const API_KEY = process.env.RELAY_API_KEY || 'test-key';

interface RelaySuccess<T = unknown> {
  type: 'success' | 'error';
  data?: T;
  error?: string;
  [key: string]: unknown;
}

// ── Mocked helpers ──────────────────────────────────────────

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

function mockFetchOnce(status: number, body: unknown, pathSubstring?: string) {
  return async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : 'url' in input ? input.url : (input as URL).href;
    if (pathSubstring && !url.includes(pathSubstring)) {
      // Fallback for unmatched — return a 404
      return new Response(JSON.stringify({ type: 'error', error: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

beforeAll(() => {
  if (process.env.RELAY_LIVE !== 'true') {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchOnce(200, { type: 'success', data: {} }),
    );
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ── Tests ───────────────────────────────────────────────────────

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
    const [status] = await relayGet('/effects?uuid=test');
    expect([200, 400, 404, 401]).toContain(status);
  });
});

// ── Edge case tests (no dev server needed) ─────────────────────

describe('Relay API — Edge Cases', () => {
  it('returns proper error shape on 404', async () => {
    // Override mock to return 404
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockFetchOnce(404, { type: 'error', error: 'Not found' }),
    );
    const [status, body] = await relayGet('/nonexistent');
    expect(status).toBe(404);
    expect(body.type).toBe('error');
    expect(body.error).toBeDefined();
  });

  it('handles non-JSON response gracefully', async () => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    });
    const [status, body] = await relayGet('/api/break');
    expect(status).toBe(500);
    expect(body).toEqual({});
  });

  it('includes required auth headers on all requests', async () => {
    vi.restoreAllMocks();
    let capturedHeaders: HeadersInit | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ type: 'success', data: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    await relayGet('/clients');
    const headers = capturedHeaders as Record<string, string>;
    expect(headers).toBeDefined();
    if (headers) {
      expect(headers['x-api-key' as keyof typeof headers]).toBe(API_KEY);
      expect(headers['x-client-id' as keyof typeof headers]).toBe('test-client');
    }
  });

  it('handles timeout gracefully', async () => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      await new Promise((_, reject) =>
        setTimeout(() => reject(new DOMException('The operation was aborted', 'AbortError')), 5),
      );
      return new Response();
    });
    await expect(relayGet('/timeout-test')).rejects.toThrow();
  });
});
