vi.unmock('@/lib/sse');

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sseManager } from '@/lib/sse';

describe('SSEManager (sseManager singleton)', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;

    const mgr = sseManager as unknown as {
      abortControllers: Map<string, unknown>;
      retryCounters: Map<string, unknown>;
      listeners: Set<unknown>;
    };
    mgr.abortControllers.clear();
    mgr.retryCounters.clear();
    mgr.listeners.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const makeMockStream = () => {
    let controller!: ReadableStreamDefaultController;
    const stream = new ReadableStream({
      start(c) {
        controller = c;
      },
    });
    return { stream, controller };
  };

  const encoder = new TextEncoder();

  // ──────────────────────────────────────── listen() ─────────────────────

  describe('listen()', () => {
    it('adds a callback and returns an unsubscribe function', () => {
      const cb = vi.fn();
      const unsub = sseManager.listen(cb);
      expect(unsub).toBeInstanceOf(Function);
      unsub();
    });

    it('unsubscribe removes the callback (no longer receives events)', () => {
      const cb = vi.fn();
      const unsub = sseManager.listen(cb);

      const mgr = sseManager as unknown as {
        dispatch: (e: { type: string; data: unknown }) => void;
      };
      mgr.dispatch({ type: 'chat', data: { msg: 'hello' } });
      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith({ type: 'chat', data: { msg: 'hello' } });

      cb.mockClear();
      unsub();
      mgr.dispatch({ type: 'chat', data: { msg: 'gone' } });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────── subscribe() ─────────────────────

  describe('subscribe()', () => {
    it('calls fetch with correct URL and auth headers', async () => {
      const { stream } = makeMockStream();
      global.fetch = vi.fn().mockResolvedValue({ ok: true, body: stream });

      sseManager.subscribe('chat', '_ignored_', 'key-123', 'client-456');

      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());

      const [url, opts] = global.fetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/relay/chat/subscribe?clientId=client-456');
      expect(opts.headers).toEqual({ 'x-api-key': 'key-123', 'x-client-id': 'client-456' });
    });

    it.each([
      ['hook', 'hooks'],
      ['encounter', 'encounters'],
      ['scene', 'scene'],
      ['rolls', 'rolls'],
    ])('maps source "%s" to endpoint "%s"', async (source, endpoint) => {
      const { stream } = makeMockStream();
      global.fetch = vi.fn().mockResolvedValue({ ok: true, body: stream });

      sseManager.subscribe(source, '', 'k', 'c');
      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());

      const [url] = global.fetch.mock.calls[0] as [string];
      expect(url).toBe(`/api/relay/${endpoint}/subscribe?clientId=c`);
    });

    it('is a no-op if already subscribed to the same source', async () => {
      const { stream } = makeMockStream();
      global.fetch = vi.fn().mockResolvedValue({ ok: true, body: stream });

      sseManager.subscribe('dedup', '', 'k', 'c');
      sseManager.subscribe('dedup', '', 'k', 'c');

      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    });

    it('can resubscribe after unsubscribe (reconnect flow)', async () => {
      const { stream: s1 } = makeMockStream();
      const { stream: s2 } = makeMockStream();
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, body: s1 })
        .mockResolvedValueOnce({ ok: true, body: s2 });

      sseManager.subscribe('reconnect', '', 'k', 'c');
      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      sseManager.unsubscribe('reconnect');
      sseManager.subscribe('reconnect', '', 'k', 'c');

      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    });
  });

  // ────────────────────────────────────── unsubscribe() ──────────────────

  describe('unsubscribe()', () => {
    it('aborts the controller and cleans up internal maps', async () => {
      const { stream } = makeMockStream();
      const abortSpy = vi.fn();
      global.fetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        opts.signal?.addEventListener('abort', abortSpy);
        return Promise.resolve({ ok: true, body: stream });
      });

      sseManager.subscribe('unsub', '', 'k', 'c');
      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());

      sseManager.unsubscribe('unsub');

      expect(abortSpy).toHaveBeenCalled();
      const mgr = sseManager as unknown as {
        abortControllers: Map<string, unknown>;
        retryCounters: Map<string, unknown>;
      };
      expect(mgr.abortControllers.has('unsub')).toBe(false);
      expect(mgr.retryCounters.has('unsub')).toBe(false);
    });
  });

  // ───────────────────────────────────── disconnectAll() ────────────────

  describe('disconnectAll()', () => {
    it('aborts all active connections and clears listeners', async () => {
      const { stream: s1 } = makeMockStream();
      const { stream: s2 } = makeMockStream();
      const abortSpy1 = vi.fn();
      const abortSpy2 = vi.fn();

      global.fetch = vi
        .fn()
        .mockImplementationOnce((_: string, opts: RequestInit) => {
          opts.signal?.addEventListener('abort', abortSpy1);
          return Promise.resolve({ ok: true, body: s1 });
        })
        .mockImplementationOnce((_: string, opts: RequestInit) => {
          opts.signal?.addEventListener('abort', abortSpy2);
          return Promise.resolve({ ok: true, body: s2 });
        });

      sseManager.subscribe('disc-a', '', 'k', 'c');
      sseManager.subscribe('disc-b', '', 'k', 'c');
      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

      sseManager.listen(vi.fn());
      sseManager.disconnectAll();

      expect(abortSpy1).toHaveBeenCalled();
      expect(abortSpy2).toHaveBeenCalled();

      const mgr = sseManager as unknown as { listeners: Set<unknown> };
      expect(mgr.listeners.size).toBe(0);
    });
  });

  // ──────────────────────────────────── error handling ──────────────────

  describe('error handling', () => {
    it('does not throw on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
      expect(() => sseManager.subscribe('err', '', 'k', 'c')).not.toThrow();
      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    });

    it('does not throw on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      expect(() => sseManager.subscribe('net', '', 'k', 'c')).not.toThrow();
      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    });

    it('ignores AbortError (intentional disconnect)', async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(err);
      expect(() => sseManager.subscribe('abort', '', 'k', 'c')).not.toThrow();
      await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledOnce());
    });
  });

  // ──────────────────────────────────── SSE event parsing ────────────────

  describe('SSE event parsing', () => {
    it('parses data lines and dispatches to listeners', async () => {
      // Stream with raw SSE data — code also dispatches a 'connected' event
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"msg":"hello"}\n\n'));
          controller.enqueue(encoder.encode('data: {"msg":"world"}\n\n'));
          controller.close();
        },
      });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, body: stream });

      const cb = vi.fn();
      sseManager.listen(cb);
      sseManager.subscribe('chat', '', 'k', 'c');

      // 1 connected + 2 data events = 3 total
      await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(3));

      expect(cb.mock.calls[1][0]).toEqual({ type: 'chat', data: { msg: 'hello' } });
      expect(cb.mock.calls[2][0]).toEqual({ type: 'chat', data: { msg: 'world' } });
    });

    it('skips malformed JSON data lines', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: null\n\n'));
          controller.enqueue(encoder.encode('data: not-json\n\n'));
          controller.enqueue(encoder.encode('data: {"valid":true}\n\n'));
          controller.close();
        },
      });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, body: stream });

      const cb = vi.fn();
      sseManager.listen(cb);
      sseManager.subscribe('chat', '', 'k', 'c');

      // 1 connected + null(parsed) + not-json(skipped) + {valid}(parsed) = 3 total
      await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(3));

      expect(cb.mock.calls[1][0]).toEqual({ type: 'chat', data: null });
      expect(cb.mock.calls[2][0]).toEqual({ type: 'chat', data: { valid: true } });
    });

    it('infers event type from source name', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"msg":"hi"}\n\n'));
          controller.close();
        },
      });
      global.fetch = vi.fn().mockResolvedValue({ ok: true, body: stream });

      const cb = vi.fn();
      sseManager.listen(cb);
      sseManager.subscribe('scene', '', 'k', 'c');

      await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(2));

      expect(cb.mock.calls[1][0]).toEqual({ type: 'scene', data: { msg: 'hi' } });
    });
  });

  describe('inferType', () => {
    const getInferType = () => sseManager as unknown as { inferType: (s: string) => string };

    it('maps "encounter" and "encounters" to "encounter"', () => {
      const mgr = getInferType();
      expect(mgr.inferType('encounter')).toBe('encounter');
      expect(mgr.inferType('encounters')).toBe('encounter');
    });

    it('maps chat/scene/rolls directly', () => {
      const mgr = getInferType();
      expect(mgr.inferType('chat')).toBe('chat');
      expect(mgr.inferType('scene')).toBe('scene');
      expect(mgr.inferType('rolls')).toBe('rolls');
    });

    it('maps unknown sources to "hook"', () => {
      const mgr = getInferType();
      expect(mgr.inferType('unknown')).toBe('hook');
    });
  });
});
