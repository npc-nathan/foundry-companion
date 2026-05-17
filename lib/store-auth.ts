/**
 * Server-side helpers for storing relay auth in cookies.
 * Used by the API route and proxy to authenticate image requests.
 */

export interface RelayAuth {
  apiKey: string;
  clientId: string;
  relayUrl: string;
}

export function encodeAuthCookie(auth: RelayAuth): string {
  return Buffer.from(JSON.stringify(auth)).toString('base64');
}

export function decodeAuthCookie(encoded: string): RelayAuth | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}
