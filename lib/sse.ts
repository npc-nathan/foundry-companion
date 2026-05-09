/**
 * SSE (Server-Sent Events) manager for real-time updates from the relay.
 *
 * Uses fetch() + ReadableStream instead of EventSource so we can send
 * auth headers (x-api-key, x-client-id) through the proxy.
 * Supports auto-reconnect with exponential backoff.
 */

export type SSEEvent =
  | { type: 'encounter'; data: unknown }
  | { type: 'chat'; data: unknown }
  | { type: 'scene'; data: unknown }
  | { type: 'hook'; data: unknown }
  | { type: 'connected'; data: { clients: number } }

type SSECallback = (event: SSEEvent) => void

const MAX_RETRIES = 10
const BASE_DELAY = 2000

class SSEManager {
  private abortControllers: Map<string, AbortController> = new Map()
  private listeners: Set<SSECallback> = new Set()
  private retryCounters: Map<string, number> = new Map()

  /**
   * Subscribe to SSE events from the relay.
   * Uses the proxy endpoint /api/relay/* so auth headers are sent automatically.
   */
  subscribe(source: string, _relayUrl: string, apiKey: string) {
    if (this.abortControllers.has(source)) return
    this.retryCounters.set(source, 0)
    this.connect(source, apiKey)
  }

  /** Unsubscribe from a specific source */
  unsubscribe(source: string) {
    const ctrl = this.abortControllers.get(source)
    ctrl?.abort()
    this.abortControllers.delete(source)
    this.retryCounters.delete(source)
  }

  private connect(source: string, apiKey: string) {
    // Cancel any existing connection for this source
    const existing = this.abortControllers.get(source)
    if (existing) {
      existing.abort()
      this.abortControllers.delete(source)
    }

    // Use the API proxy endpoint for SSE — auth headers flow naturally
    const url = `/api/relay/${source}/subscribe`

    const abort = new AbortController()
    this.abortControllers.set(source, abort)

    const doFetch = async () => {
      try {
        const response = await fetch(url, {
          headers: {
            'x-api-key': apiKey,
            'x-client-id': 'companion-app',
          },
          signal: abort.signal,
        })

        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status}`)
        }

        if (!response.body) {
          throw new Error('Response body is null')
        }

        // Reset retry on successful connection
        this.retryCounters.set(source, 0)
        this.dispatch({ type: 'connected', data: { clients: 0 } })

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // SSE protocol: messages are separated by double newlines
          const messages = buffer.split('\n\n')
          buffer = messages.pop() || ''

          for (const msg of messages) {
            for (const line of msg.split('\n')) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  const type = this.inferType(source)
                  this.dispatch({ type, data })
                } catch {
                  // skip malformed JSON
                }
              }
            }
          }
        }
      } catch (err: unknown) {
        // Ignore abort errors (intentional disconnect)
        if (err instanceof Error && err.name === 'AbortError') return

        // Retry with backoff
        const retryCount = this.retryCounters.get(source) || 0
        if (retryCount < MAX_RETRIES) {
          this.retryCounters.set(source, retryCount + 1)
          const delay = BASE_DELAY * Math.pow(1.5, retryCount)
          setTimeout(() => this.connect(source, apiKey), delay)
        }
      }
    }

    doFetch()
  }

  private inferType(source: string): SSEEvent['type'] {
    if (source.includes('encounter')) return 'encounter'
    if (source.includes('chat')) return 'chat'
    if (source.includes('scene')) return 'scene'
    return 'hook'
  }

  /** Add a listener for SSE events. Returns unsubscribe function. */
  listen(callback: SSECallback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private dispatch(event: SSEEvent) {
    this.listeners.forEach((cb) => cb(event))
  }

  /** Disconnect all SSE connections */
  disconnectAll() {
    this.abortControllers.forEach((ctrl) => ctrl.abort())
    this.abortControllers.clear()
    this.retryCounters.clear()
    this.listeners.clear()
  }
}

export const sseManager = new SSEManager()
