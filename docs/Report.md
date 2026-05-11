### 4.1 — Performance Optimizations

| Issue | Severity | Suggestion | Status |
|-------|----------|------------|--------|
| **3-second chat polling** | Medium | Chat page polls every 3s. SSE is already wired — could use SSE for chat messages instead of polling, reducing network traffic by ~90% | ✅ **DONE** — Removed polling, SSE handles chat updates via `/chat/subscribe` |
| **Canvas 8-second token refresh** | Medium | `SceneCanvas` refreshes tokens every 8s. For multi-user environments, consider SSE-based token position updates to avoid unnecessary re-renders | ✅ **DONE** — Removed polling, SSE + manual invalidation handles token updates |
| **CharacterSheet monolithic renders** | High | The massive `CharacterSheet.tsx` (single component) re-renders entirely on any state change. **Action**: Split into sub-components: `AbilityScores`, `SkillsPanel`, `Spellbook`, `Inventory`, `EffectsList` — each with `React.memo` | ❌ Not started |
| **Expression Editor memo inefficiency** | Low | `dynamicContent` memo in `expression-editor.tsx` recomputes on every keypress — only needs to rebuild when edges/nodes change | ❌ Not started |
| **SceneCanvas token rendering** | Medium | All tokens re-render on any token change. **Action**: Apply `React.memo` to token SVG elements or split into a `TokenLayer` component | ❌ Not started |
| **JournalsPage complex state** | Medium | Multiple `useEffect` sync refs (7 refs with sync effects) — each adds render cycle cost. Could use `useRef` directly in mutation callbacks instead of syncing | ✅ **PARTIAL** — Cleaned up 5 ref sync effects, kept `deletedPageIdsRef` where needed |
| **No code splitting beyond dynamic imports** | Low | Pages are large bundles. Could use `React.lazy()` for character sheet tabs, journal editor, and canvas sub-components | ❌ Not started |

### 4.2 — Code Corrections

| File | Issue | Fix | Status |
|------|-------|-----|--------|
| `lib/relay.ts` — `measureDistance` | Method is defined but may not exist on relay server — silent failure | Add error handling with fallback/catch | ✅ **DONE** — Replaced API call with client-side grid-based calculation |
| `scene-canvas.tsx` — `padding` prop | Used in implementation but missing from `SceneData` type documentation | Add to type definition or comment | ❌ Not started |
| `scene-canvas.tsx` — `tokenImageUrl()` | Returns null for `data:` URIs — no fallback | Add placeholder icon or initials | ❌ Not started |
| `expression-editor.tsx` — `insertExpressionField` | Duplicate state update paths (refs + state) | Consolidate to single update path | ❌ Not started |
| `journals/page.tsx` — `deletedPageIdsRef` sync | `useEffect` to sync ref with state — unnecessary | Use ref directly in mutation callbacks | ✅ **DONE** — Cleaned up 5 ref sync effects |
| `journals/page.tsx` — stale closure risk | Tab click handler captures `editPageName`/`editPageContent` via refs but also uses setState — potential data race | Use uniform ref pattern | ✅ **DONE** — Fixed index mismatch bug in `saveMutation` |
| `dice/page.tsx` — `SKILL_LABELS` map | Has both `prc: 'Perception'` and `per: 'Perception'` — `per` is unused dead code | Remove `per` entry | ✅ **DONE** |
| `CharacterSheet.tsx` — proficiency check inconsistency | `abilities[ab].proficient` uses `!!abil?.proficient` for skills but `abil?.proficient?.[0]` for saves — inconsistent with Foundry v13 data format | Unify to match actual Foundry data structure | ❌ Not started |
| `macros/page.tsx` — `ON_FIELD_CHANGE` (FIXED) | ✅ Already fixed — removed unused `hasUnsaved` ref, `useRef`, and `useEffect` imports | Done | ✅ **DONE** |
| All pages — `useQuery` generic typing | Many queries use `useQuery<unknown>` — no type safety on response data | Add proper response types | ❌ Not started |
| `app/api/relay/[...path]/route.ts` — SSE streaming | Proxy buffers entire response body before returning, breaking SSE | Stream SSE responses with `TransformStream` | ✅ **DONE** |
| `lib/sse.ts` — missing source types | `rolls` and `hooks` weren't in `inferType()` or endpoint mapping | Added `rolls` and `hooks` support | ✅ **DONE** |
| `components/providers.tsx` — missing handlers | No `rolls`, `hook`, `scenes` event handling for cache invalidation | Added all SSE event handlers | ✅ **DONE** |
| `components/providers.tsx` — missing subscriptions | SSE connections for `rolls`, `hooks` were never created | Added subscriptions in both connection paths | ✅ **DONE** |

### 4.3 — Architecture Improvements (Non-Breaking)

| Area | Effort | Description | Status |
|------|--------|-------------|--------|
| **Error handling** | Medium | `relay.ts` methods return `any` — wrap in typed `Result<T, E>` pattern for explicit error handling | ❌ Not started |
| **TypeScript strictness** | Medium | Remove `as any` casts across the codebase (CharacterSheet, journals, node-editor) | ❌ Not started |
| **Accessibility** | Medium | `SceneCanvas` has click handlers on `<g>` elements without keyboard support — add `onKeyDown`, `role`, `tabIndex`, and ARIA labels | ❌ Not started |
| **Mobile canvas** | High | Pan/zoom works but touch interactions aren't optimized — consider adding touch gesture library or native pointer events | ❌ Not started |
| **Testing** | High | No test suite. **Action**: Add Vitest for `lib/` utilities + Playwright for critical user flows (connection, dice rolling, basic navigation) | ❌ Not started |
| **CI/CD** | Medium | No GitHub Actions. **Action**: Add lint + type-check + build pipeline | ❌ Not started |
| **Environment validation** | Low | `RELAY_URL` has hardcoded fallback (`http://localhost:3010`) — validate at connection time with clear feedback | ❌ Not started |
| **Theme support** | Low | `forcedTheme="dark"` — could support light mode toggle (Zustand `toggleTheme()` exists but is unused) | ❌ Not started |
| **SSE connection visibility** | Low | No user feedback on SSE connection loss — add toast/status indicator | ✅ **DONE** — Toast on SSE reconnect |
| **Image caching strategy** | Low | Relay proxy returns `public, max-age=3600` — no cache invalidation. Add ETag or version-based invalidation | ❌ Not started |

### 4.4 — Potential Bug Fixes (Priority Ordered)

| Priority | File | Bug Description | Status |
|----------|------|----------------|--------|
| **HIGH** | `journals/page.tsx` | Deleting pages via `executeJs` calls `deleteEmbeddedDocuments`. If the journal has unsaved new pages (no `_id`), the index math gets out of sync, potentially deleting wrong pages. **Fix**: Filter deleted pages first, then apply dirty edits by renderable index | ✅ **DONE** |
| **MEDIUM** | `scene-canvas.tsx` | `measureDistance` calls `relay.measureDistance()` which may not be implemented by the relay server — if it fails with 404/500, the silent catch leaves the user with no feedback. **Fix**: Replace with grid-based fallback and fix canvas click handler for measure mode | ✅ **DONE** |
| **MEDIUM** | `CharacterSheet.tsx` | `abilities[ab].proficient` check differs between skills (`!!abil?.proficient`) and saving throws (`abil?.proficient?.[0]`). If Foundry v13 returns a boolean for saves too, the save proficiency will be incorrectly detected. **Fix**: Unify to match actual data shape | ❌ Not started |
| **MEDIUM** | `node-editor.tsx` | React Flow graph state is not persisted — if a user navigates away, the visual macro is lost. **Fix**: Auto-save to sessionStorage or prompt before tab switch | ❌ Not started |
| **LOW** | `dice/page.tsx` | `SKILL_LABELS` has `per: 'Perception'` (unused) and `prc: 'Perception'` (used) — dead code | ✅ **DONE** |
| **LOW** | `expression-editor.tsx` | Field picker shows all upstream outputs regardless of connection validity — could show disconnected outputs as disabled/greyed | ❌ Not started |

### Summary of Recommended Immediate Actions

| Order | Action | Effort | Impact | Status |
|-------|--------|--------|--------|--------|
| 1 | Fix journal page deletion index bug | 1h | Prevents data loss | ✅ **DONE** |
| 2 | Split CharacterSheet into sub-components | 3-4h | Major performance improvement | ❌ Not started |
| 3 | Add type safety to relay.ts responses | 2h | Better DX, catches bugs at compile time | ❌ Not started |
| 4 | Fix scene-canvas error handling | 1h | Better UX | ✅ **DONE** |
| 5 | Add Playwright test for connection flow | 2h | Prevents regression on critical path | ❌ Not started |
| 6 | Fix stale closure patterns in journals | 1h | Prevents subtle bugs | ✅ **DONE** |
| 7 | Add SSE connection status indicator | 1h | Better UX | ✅ **DONE** |
| 8 | Remove dead code + unused props | 0.5h | Cleaner codebase | ✅ **DONE** (dice/page.tsx) |
| 9 | Fix SSE proxy buffering | 1h | Enables real-time updates | ✅ **DONE** |
| 10 | Add missing SSE subscriptions | 1h | Enables roll/hook events | ✅ **DONE** |
| 11 | Fix scene-canvas zoom reset | 0.5h | Stops zoom reset on SSE scene events | ✅ **DONE** |