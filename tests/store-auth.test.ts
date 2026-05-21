import { describe, it, expect } from 'vitest';
import { encodeAuthCookie, decodeAuthCookie } from '@/lib/store-auth';

describe('encodeAuthCookie / decodeAuthCookie', () => {
  it('encodes and decodes auth data (roundtrip)', () => {
    const input = {
      apiKey: 'test-key-123',
      clientId: 'client-456',
      relayUrl: 'http://localhost:3010',
    };
    const encoded = encodeAuthCookie(input);
    expect(typeof encoded).toBe('string');

    const decoded = decodeAuthCookie(encoded);
    expect(decoded).toEqual(input);
  });

  it('survives special characters in apiKey', () => {
    const input = {
      apiKey: 'a+b/c=d&e?f#g',
      clientId: 'client-789',
      relayUrl: 'https://relay.example.com',
    };
    const encoded = encodeAuthCookie(input);
    const decoded = decodeAuthCookie(encoded);
    expect(decoded).toEqual(input);
  });

  it('returns null for invalid base64', () => {
    const result = decodeAuthCookie('not-valid-base64!!!');
    expect(result).toBeNull();
  });

  it('returns null for non-JSON decoded data', () => {
    const encoded = btoa('plain text, not json');
    const result = decodeAuthCookie(encoded);
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeAuthCookie('')).toBeNull();
  });
});
