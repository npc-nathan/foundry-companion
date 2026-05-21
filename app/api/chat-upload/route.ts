import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RELAY_URL = process.env.RELAY_URL || 'http://localhost:3010';

/**
 * POST /api/chat-upload
 *
 * Accepts a multipart form upload, reads the file, base64-encodes it,
 * uploads it to the Foundry relay server's /upload endpoint, and
 * returns the Foundry data path.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file as base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';
    const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`;

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Upload to Foundry via relay
    const relayRes = await fetch(
      `${RELAY_URL}/upload?path=worlds/npc-it/images/chat&source=data&filename=${encodeURIComponent(
        filename,
      )}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': req.headers.get('x-api-key') || '',
          'x-client-id': req.headers.get('x-client-id') || 'companion-app',
        },
        body: JSON.stringify({
          fileData: base64,
          mimeType,
          overwrite: true,
        }),
      },
    );

    if (!relayRes.ok) {
      const text = await relayRes.text();
      return NextResponse.json(
        { error: `Relay upload failed: ${relayRes.status} ${text}` },
        { status: 502 },
      );
    }

    const result = await relayRes.json();
    const foundryPath = result.path;

    // Return the Foundry URL that rewriteRelayContent can use
    return NextResponse.json({
      success: true,
      path: foundryPath,
      url: `/api/relay/download?path=${encodeURIComponent(foundryPath)}&source=data`,
      filename,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
