/**
 * Sanitize a node name for use as a JavaScript identifier in generated code.
 * "Source Actor" -> "Source_Actor", "heal?target" -> "heal_target".
 */
export function safeJsKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9_$-]/g, '_');
}
