import { describe, it, expect } from 'vitest';
import { rewriteRelayContent } from '@/lib/relay-html';

describe('rewriteRelayContent', () => {
  it('returns empty string for empty input', () => {
    expect(rewriteRelayContent('')).toBe('');
  });

  it('passes plain HTML through unchanged', () => {
    const input = '<p>Hello world</p>';
    expect(rewriteRelayContent(input)).toBe(input);
  });

  it('rewrites @UUID[Compendium.Scene.123] as an anchor with data-uuid', () => {
    const result = rewriteRelayContent('Check out @UUID[Compendium.Scene.123] for details.');
    expect(result).toContain('<a');
    expect(result).toContain('data-uuid="Compendium.Scene.123"');
    expect(result).toContain('Compendium.Scene.123');
  });

  it('rewrites @UUID[uuid]{Custom Label} with the custom label', () => {
    const result = rewriteRelayContent('Visit @UUID[Actor.xyz]{The Wizard} today!');
    expect(result).toContain('data-uuid="Actor.xyz"');
    expect(result).toContain('The Wizard');
    expect(result).toContain('href');
  });

  it('rewrites @Embed[uuid] as an anchor', () => {
    const result = rewriteRelayContent('Embedded: @Embed[JournalEntry.abc]');
    expect(result).toContain('<a');
    expect(result).toContain('data-uuid="JournalEntry.abc"');
  });

  it('rewrites system image src to proxied path', () => {
    const result = rewriteRelayContent('<img src="systems/dnd5e/icons/skills/green_11.webp" />');
    expect(result).toContain('/api/relay/download?path=');
    expect(result).toContain(encodeURIComponent('systems/dnd5e/icons/skills/green_11.webp'));
  });

  it('leaves data URIs unchanged', () => {
    const input =
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" />';
    const result = rewriteRelayContent(input);
    expect(result).toBe(input);
  });

  it('leaves external URLs unchanged', () => {
    const input = '<img src="https://example.com/image.png" />';
    const result = rewriteRelayContent(input);
    expect(result).toBe(input);
  });

  it('leaves already-proxied URLs unchanged', () => {
    const input =
      '<img src="/api/relay/download?path=systems%2Fdnd5e%2Ficons%2Fskills%2Fgreen_11.webp" />';
    const result = rewriteRelayContent(input);
    expect(result).toBe(input);
  });

  it('handles multiple images and UUIDs in one string', () => {
    const input = [
      '<p>Found <img src="systems/dnd5e/icons/items/weapons/sword.webp" />!</p>',
      '<p>See @UUID[Item.sword-123]{Magic Sword} for stats.</p>',
    ].join('\n');
    const result = rewriteRelayContent(input);
    expect(result).toContain('/api/relay/download?path=');
    expect(result).toContain('data-uuid="Item.sword-123"');
    expect(result).toContain('Magic Sword');
  });
});
