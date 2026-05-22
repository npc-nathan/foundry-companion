// Server-safe — reads process.env
// Call this in server components / API routes only
export function getServerEnvConfig() {
  return {
    relayUrl: process.env.RELAY_URL || null,
    apiKey: process.env.RELAY_API_KEY || null,
  };
}
