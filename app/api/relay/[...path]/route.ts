import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { decodeAuthCookie } from '@/lib/store-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:3010'

async function handleRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const relayPath = path.join('/')

  const relayUrl = new URL(`${RELAY_URL}/${relayPath}`)

  // Forward query params
  req.nextUrl.searchParams.forEach((v, k) => {
    relayUrl.searchParams.set(k, v)
  })

  const headers = new Headers()

  // Read auth headers from request (fetch() calls send these)
  let apiKey = req.headers.get('x-api-key')
  let clientId = req.headers.get('x-client-id')

  // Fall back to cookie auth (browser <img> tags, etc.)
  if (!apiKey || !clientId) {
    const cookieStore = await cookies()
    const relayAuthCookie = cookieStore.get('relay-auth')
    if (relayAuthCookie?.value) {
      const auth = decodeAuthCookie(relayAuthCookie.value)
      if (auth) {
        apiKey = apiKey || auth.apiKey
        clientId = clientId || auth.clientId
      }
    }
  }

  if (apiKey) headers.set('x-api-key', apiKey)
  if (clientId) headers.set('x-client-id', clientId)

  // Forward custom headers for session endpoints
  const customHeaders = ['x-foundry-url', 'x-username', 'x-world-name']
  for (const h of customHeaders) {
    const val = req.headers.get(h)
    if (val) headers.set(h, val)
  }

  try {
    const res = await fetch(relayUrl.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    })

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const isBinary = contentType.startsWith('image/') || contentType.startsWith('application/octet-stream')

    if (isBinary) {
      const blob = await res.blob()
      return new NextResponse(blob, {
        status: res.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // SSE: stream the response instead of buffering it
    if (contentType.includes('text/event-stream')) {
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      // Manually pump relay response body to the response stream
      // This ensures clean close propagation when relay disconnects
      if (res.body) {
        const reader = res.body.getReader()
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                await writer.close()
                break
              }
              await writer.write(value)
            }
          } catch {
            // Relay connection closed — close the writer so client gets clean EOF
            await writer.close().catch(() => {})
          }
        }
        pump()
      }

      return new NextResponse(readable, {
        status: res.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
        },
      })
    }

    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Relay connection failed: ${message}` },
      { status: 502 }
    )
  }
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const PATCH = handleRequest
export const DELETE = handleRequest