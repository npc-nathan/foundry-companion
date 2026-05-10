# Phase 4: Optimization, Corrections & Improvements Report

### 4.1 — Performance Optimizations

| Issue | Severity | Suggestion |
|-------|----------|------------|
| **3-second chat polling** | Medium | Chat page polls every 3s. SSE is already wired — could use SSE for chat messages instead of polling, reducing network traffic by ~90% |
| **Canvas 8-second token refresh** | Medium | `SceneCanvas` refreshes tokens every 8s. For multi-user environments, consider SSE-based token position updates to avoid unnecessary re-renders |
| **CharacterSheet monolithic renders** | High | The massive `CharacterSheet.tsx` (single component) re-renders entirely on any state change. **Action**: Split into sub-components: `AbilityScores`, `SkillsPanel`, `Spellbook`, `Inventory`, `EffectsList` — each with `React.memo` |
| **Expression Editor memo inefficiency** | Low | `dynamicContent` memo in `expression-editor.tsx` recomputes on every keypress — only needs to rebuild when edges/nodes change |
| **SceneCanvas token rendering** | Medium | All tokens re-render on any token change. **Action**: Apply `React.memo` to token SVG elements or split into a `TokenLayer` component |
| **JournalsPage complex state** | Medium | Multiple `useEffect` sync refs (7 refs with sync effects) — each adds render cycle cost. Could use `useRef` directly in mutation callbacks instead of syncing |
| **No code splitting beyond dynamic imports** | Low | Pages are large bundles. Could use `React.lazy()` for character sheet tabs, journal editor, and canvas sub-components |

### 4.2 — Code Corrections

| File | Issue | Fix |
|------|-------|-----|
| `lib/relay.ts` — `measureDistance` | Method is defined but may not exist on relay server — silent failure | Add error handling with fallback/catch |
| `scene-canvas.tsx` — `padding` prop | Used in implementation but missing from `SceneData` type documentation | Add to type definition or comment |
| `scene-canvas.tsx` — `tokenImageUrl()` | Returns null for `data:` URIs — no fallback | Add placeholder icon or initials |
| `expression-editor.tsx` — `insertExpressionField` | Duplicate state update paths (refs + state) | Consolidate to single update path |
| `journals/page.tsx` — `deletedPageIdsRef` sync | `useEffect` to sync ref with state — unnecessary | Use ref directly in mutation callbacks |
| `journals/page.tsx` — stale closure risk | Tab click handler captures `editPageName`/`editPageContent` via refs but also uses setState — potential data race | Use uniform ref pattern |
| `dice/page.tsx` — `SKILL_LABELS` map | Has both `prc: 'Perception'` and `per: 'Perception'` — `per` is unused dead code | Remove `per` entry |
| `CharacterSheet.tsx` — proficiency check inconsistency | `abilities[ab].proficient` uses `!!abil?.proficient` for skills but `abil?.proficient?.[0]` for saves — inconsistent with Foundry v13 data format | Unify to match actual Foundry data structure |
| `macros/page.tsx` — `ON_FIELD_CHANGE` (FIXED) | ✅ Already fixed — removed unused `hasUnsaved` ref, `useRef`, and `useEffect` imports | Done |
| All pages — `useQuery` generic typing | Many queries use `useQuery<unknown>` — no type safety on response data | Add proper response types |

### 4.3 — Architecture Improvements (Non-Breaking)

| Area | Effort | Description |
|------|--------|-------------|
| **Error handling** | Medium | `relay.ts` methods return `any` — wrap in typed `Result<T, E>` pattern for explicit error handling |
| **TypeScript strictness** | Medium | Remove `as any` casts across the codebase (CharacterSheet, journals, node-editor) |
| **Accessibility** | Medium | `SceneCanvas` has click handlers on `<g>` elements without keyboard support — add `onKeyDown`, `role`, `tabIndex`, and ARIA labels |
| **Mobile canvas** | High | Pan/zoom works but touch interactions aren't optimized — consider adding touch gesture library or native pointer events |
| **Testing** | High | No test suite. **Action**: Add Vitest for `lib/` utilities + Playwright for critical user flows (connection, dice rolling, basic navigation) |
| **CI/CD** | Medium | No GitHub Actions. **Action**: Add lint + type-check + build pipeline |
| **Environment validation** | Low | `RELAY_URL` has hardcoded fallback (`http://localhost:3010`) — validate at connection time with clear feedback |
| **Theme support** | Low | `forcedTheme="dark"` — could support light mode toggle (Zustand `toggleTheme()` exists but is unused) |
| **SSE connection visibility** | Low | No user feedback on SSE connection loss — add toast/status indicator |
| **Image caching strategy** | Low | Relay proxy returns `public, max-age=3600` — no cache invalidation. Add ETag or version-based invalidation |

### 4.4 — Potential Bug Fixes (Priority Ordered)

| Priority | File | Bug Description |
|----------|------|----------------|
| **HIGH** | `journals/page.tsx` | Deleting pages via `executeJs` calls `deleteEmbeddedDocuments`. If the journal has unsaved new pages (no `_id`), the index math gets out of sync, potentially deleting wrong pages. **Fix**: Track temp IDs for unsaved pages or only allow deletion after save |
| **MEDIUM** | `scene-canvas.tsx` | `measureDistance` calls `relay.measureDistance()` which may not be implemented by the relay server — if it fails with 404/500, the silent catch leaves the user with no feedback. **Fix**: Add toast error or fallback calculation |
| **MEDIUM** | `CharacterSheet.tsx` | `abilities[ab].proficient` check differs between skills (`!!abil?.proficient`) and saving throws (`abil?.proficient?.[0]`). If Foundry v13 returns a boolean for saves too, the save proficiency will be incorrectly detected. **Fix**: Unify to match actual data shape |
| **MEDIUM** | `node-editor.tsx` | React Flow graph state is not persisted — if a user navigates away, the visual macro is lost. **Fix**: Auto-save to sessionStorage or prompt before tab switch |
| **LOW** | `dice/page.tsx` | `SKILL_LABELS` has `per: 'Perception'` (unused) and `prc: 'Perception'` (used) — dead code |
| **LOW** | `expression-editor.tsx` | Field picker shows all upstream outputs regardless of connection validity — could show disconnected outputs as disabled/greyed |

### Summary of Recommended Immediate Actions

| Order | Action | Effort | Impact |
|-------|--------|--------|--------|
| 1 | Fix journal page deletion index bug | 1h | Prevents data loss |
| 2 | Split CharacterSheet into sub-components | 3-4h | Major performance improvement |
| 3 | Add type safety to relay.ts responses | 2h | Better DX, catches bugs at compile time |
| 4 | Fix scene-canvas error handling | 1h | Better UX |
| 5 | Add Playwright test for connection flow | 2h | Prevents regression on critical path |
| 6 | Fix stale closure patterns in journals | 1h | Prevents subtle bugs |
| 7 | Add SSE connection status indicator | 1h | Better UX |
| 8 | Remove dead code + unused props | 0.5h | Cleaner codebase |

