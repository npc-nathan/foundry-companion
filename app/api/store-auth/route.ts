import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { encodeAuthCookie } from '@/lib/store-auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { relayUrl, apiKey, clientId } = body

    if (!relayUrl || !apiKey || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields: relayUrl, apiKey, clientId' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    cookieStore.set('relay-auth', encodeAuthCookie({ relayUrl, apiKey, clientId }), {
      httpOnly: true,
      secure: false, // localhost dev
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
