/**
 * Headless Foundry session management
 *
 * Uses the relay's /session-handshake + /start-session endpoints to
 * start a headless Chrome browser session that logs into Foundry VTT
 * with a username and password.
 */

async function encryptPassword(
  password: string,
  nonce: string,
  publicKeyPEM: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify({ password, nonce }));

  // Parse PEM-encoded public key — handle both \n and actual newlines
  const pemBody = publicKeyPEM
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .trim();

  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  // Import as RSA-OAEP key
  const publicKey = await crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );

  // Encrypt
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, data);

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

export async function startHeadlessSession(
  relayUrl: string,
  apiKey: string,
  foundryUrl: string,
  username: string,
  password: string,
  worldName?: string,
): Promise<{ sessionId: string; clientId: string }> {
  // Step 1: Get handshake credentials
  const handshakeHeaders: Record<string, string> = {
    'x-api-key': apiKey,
    'x-foundry-url': foundryUrl,
    'x-username': username,
  };
  if (worldName) handshakeHeaders['x-world-name'] = worldName;

  const handshakeRes = await fetch(`/api/relay/session-handshake`, {
    method: 'POST',
    headers: handshakeHeaders,
  });

  if (!handshakeRes.ok) {
    const text = await handshakeRes.text();
    throw new Error(`Session handshake failed: ${handshakeRes.status} ${text}`);
  }

  const handshake = await handshakeRes.json();
  const { token, publicKey, nonce } = handshake;

  // Step 2: Encrypt password
  const encryptedPassword = await encryptPassword(password, nonce, publicKey);

  // Step 3: Start the session
  const sessionRes = await fetch(`/api/relay/start-session`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      handshakeToken: token,
      encryptedPassword,
    }),
  });

  if (!sessionRes.ok) {
    const text = await sessionRes.text();
    throw new Error(`Session start failed: ${sessionRes.status} ${text}`);
  }

  const session = await sessionRes.json();
  return { sessionId: session.sessionId, clientId: session.clientId };
}

export async function endHeadlessSession(apiKey: string, sessionId: string): Promise<void> {
  await fetch(`/api/relay/end-session?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: {
      'x-api-key': apiKey,
    },
  });
}
