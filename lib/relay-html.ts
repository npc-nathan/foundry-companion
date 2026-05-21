/**
 * Rewrites HTML content from Foundry, proxying image src attributes through the relay.
 *
 * Foundry journal text pages, roll table descriptions, and compendium entries
 * can contain HTML with <img> tags pointing to direct Foundry paths like
 * "systems/dnd5e/icons/..." or "worlds/...". This utility rewrites those
 * src attributes to go through the relay download proxy.
 */
export function rewriteRelayContent(html: string): string {
  if (!html) return html;

  let result = html;

  // Step 1: Convert @UUID[...]{text} and bare @UUID[...] to clickable links
  result = result.replace(/@UUID\[([^\]]+)\](?:\{([^}]*)\})?/g, (_match, uuid, label) => {
    const display = label || uuid.split('.').pop() || uuid;
    return `<a href="#" class="uuid-link" data-uuid="${uuid}">${display}</a>`;
  });

  // Step 1b: Convert @Embed[UUID ...]{text} and bare @Embed[UUID ...] to clickable links
  result = result.replace(
    /@Embed\[([^\s\]]+)(?:\s[^\]]*)?\](?:\{([^}]*)\})?/g,
    (_match, uuid, label) => {
      const display = label || uuid.split('.').pop() || uuid;
      return `<a href="#" class="uuid-link" data-uuid="${uuid}">${display}</a>`;
    },
  );

  // Step 2: Replace <img src="..."> with proxied versions
  result = result.replace(
    /<img\s+([^>]*?)\bsrc\s*=\s*"([^"]+)"([^>]*?)>/gi,
    (match, before, src, after) => {
      // Skip data URIs, full URLs, and already-proxied paths
      if (
        src.startsWith('data:') ||
        src.startsWith('http://') ||
        src.startsWith('https://') ||
        src.startsWith('/api/relay/')
      ) {
        return match;
      }
      // Strip leading slash if present — relay download path expects relative
      const cleanPath = src.startsWith('/') ? src.slice(1) : src;
      const relayPath = `/api/relay/download?path=${encodeURIComponent(cleanPath)}&source=data`;
      return `<img ${before} src="${relayPath}"${after}>`;
    },
  );

  return result;
}
