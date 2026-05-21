# Development Guide

> Tools, workflows, and quality gates for developing Foundry Companion.

---

## Quick Reference

```bash
# Daily workflow
npm run dev                 # Start dev server on port 3000

# Before committing
npm run type-check          # TypeScript check
npm run lint                # ESLint
npm run format              # Prettier check
npm run test                # Run all tests

# Full cleanup
npm run lint:fix            # Auto-fix ESLint issues
npm run format:fix          # Auto-format everything
```

---

## 1. Code Quality (SCA)

### Linting — ESLint

Configured in `eslint.config.mjs`. Checks for:

- TypeScript type issues (`no-explicit-any`, `prefer-const`)
- Security patterns (`detect-object-injection`, `detect-unsafe-regex`)
- React hooks rules (exhaustive deps, order)
- Import hygiene (unused imports/vars)
- Console/`<img>` usage

```bash
npm run lint                # Check all source files
npm run lint:fix            # Auto-fix what it can
```

Max warnings before CI fails: **50**. Keep it trending down.

### Formatting — Prettier

Configured in `.prettierrc`.

```bash
npm run format              # Check formatting
npm run format:fix          # Auto-format everything
```

Settings: single quotes, 100 char width, trailing commas all.

### TypeScript

```bash
npm run type-check          # tsc --noEmit
```

Excludes `node_modules` and test files. If you get type errors from `node_modules` (common with Next.js 16), ignore them — the compiler only cares about errors in your source files.

---

## 2. Pre-Commit Hooks

Hooks run automatically on every `git commit` via pre-commit. They **block the commit** if anything fails.

| Hook                | What it catches                              |
| ------------------- | -------------------------------------------- |
| Prettier            | Unformatted code — auto-fixes files in-place |
| ESLint              | Lint violations                              |
| Trailing whitespace | Bad whitespace                               |
| End-of-file fixer   | Missing final newline                        |
| YAML                | Broken `.yaml`/`.yml` files                  |
| JSON                | Broken `.json` files                         |
| Large files         | Files >500KB (accidental assets/secrets)     |
| Merge conflicts     | Leftover `<<<<<<<` markers                   |
| Private keys        | Committed API keys, SSH keys                 |

To run hooks manually (against all files):

```bash
pre-commit run --all-files
```

To skip hooks for a commit (use sparingly):

```bash
git commit --no-verify -m "urgent: hotfix"
```

---

## 3. Tests

### Test runner: Vitest

Configured in `vitest.config.ts`. Uses jsdom environment, TypeScript, React Testing Library, and MSW.

### Test count

**198 tests across 20 files** (as of last audit).

### Test structure

```
foundry-companion/
├── __tests__/
│   ├── components/
│   │   ├── CharacterSheet.expanded.test.tsx   # Full sheet tabs, HP, rests, skills
│   │   ├── connection-gate.test.tsx            # Connection flow, form validation
│   │   ├── ErrorBoundary.test.tsx              # Error catch, fallback, webhook
│   │   ├── GifPicker.test.tsx                  # Search, loading, select/cancel
│   │   ├── PartyManager.test.tsx               # Party CRUD, member management
│   │   ├── system-item-viewer.test.tsx         # System item metadata rendering
│   │   ├── UserAvatar.test.tsx                 # Avatar rendering, online status
│   │   └── UserList.test.tsx                   # User list, whisper targets
│   └── lib/
│       ├── sse.test.ts                          # SSE manager: subscribe, reconnect
│       └── utils.test.ts                        # Utility functions
├── tests/
│   ├── CharacterSheet.test.tsx                  # Basic sheet render (legacy)
│   ├── env-debug.test.ts                        # Environment variable check
│   ├── parse-macro-inputs.test.ts               # Macro parser edge cases
│   ├── relay-html.test.ts                       # HTML sanitization
│   ├── relay-smoke.test.ts                      # 16 API contract tests
│   ├── setup-test.test.tsx                      # Setup verification
│   ├── sidebar.test.tsx                         # Navigation rendering
│   ├── store-auth.test.ts                       # Auth store: tokens, sessions
│   ├── store.test.ts                            # Global store: config, UI, status
│   ├── use-actor-data.test.ts                   # Actor data hook
│   ├── setup.ts                                 # Shared mocks (Next, shadcn)
│   └── .audit-baseline.json                     # NPM audit baseline snapshot
```

### Commands

```bash
npm test                      # All tests (198 tests, ~10s)
npm run test -- --watch       # Watch mode for TDD
npm run test -- --ui          # Vitest UI (browser dashboard)
```

### Running API contract tests

The relay smoke tests hit the actual running Foundry relay. You need:

1. Dev server running: `npm run dev`
2. Relay API key in `.env.test.local` (already configured)

```bash
npm run dev                   # Terminal 1: start server
npm test                      # Terminal 2: run all tests
```

If the dev server is down, relay tests will timeout/fail. Component tests still work.

### Test patterns

**Component tests** use RTL + mocked dependencies:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '@/components/sidebar';

it('renders navigation links', async () => {
  render(<Sidebar />);
  expect(screen.getByText('Scenes')).toBeInTheDocument();
  await userEvent.click(screen.getByText('Scenes'));
});
```

**Mock patterns:**

```tsx
// Mock a component module
vi.mock('@/components/some-component', () => ({
  SomeComponent: () => <div data-testid="mocked" />,
}));

// Mock a hook
vi.mock('@/lib/some-hook', () => ({
  useSomeHook: () => ({ data: null, isLoading: false }),
}));
```

**Relay contract tests** hit the real API:

```ts
it('returns scenes list', async () => {
  const [status, body] = await relayGet('/structure?types=Scene');
  expect(status).toBe(200);
});
```

### Environment variables for tests

| Variable                    | Required for                             | Default |
| --------------------------- | ---------------------------------------- | ------- |
| `RELAY_API_KEY`             | Relay smoke tests (in `.env.test.local`) | —       |
| `NEXT_PUBLIC_TENOR_API_KEY` | GifPicker tests                          | —       |

---

## 4. Dependency Auditing

### Automatic (on install)

Every `npm install` runs `npm audit --audit-level=critical` automatically via the `postinstall` script. It prints vulnerabilities; if any are **critical**, the install fails.

### Manual

```bash
npm audit                          # Check all vulnerabilities
npm audit --json | python3 scripts/audit-report.py   # Structured report
```

### Trend tracking

A baseline is stored at `tests/.audit-baseline.json`. Current baseline:

```
1 moderate  — postcss (dep of Next.js)
1 high      — next (framework itself)
```

These are inherited from Next.js 16 and are patched by updating the framework.

---

## 5. Runtime Error Monitoring

The app includes an `ErrorBoundary` component wrapping all GM and player routes.

In development: errors appear in the browser console + terminal only. No webhook noise.

In production: errors POST to `NEXT_PUBLIC_ERROR_WEBHOOK_URL` with stack trace, component stack, URL, and user agent.

To set up error notifications:

```bash
# Set this in your production environment
export NEXT_PUBLIC_ERROR_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

The webhook payload:

```json
{
  "error": { "message": "...", "name": "...", "stack": "..." },
  "componentStack": "...",
  "url": "http://your-site.com/gm/scenes",
  "userAgent": "Mozilla/5.0 ...",
  "timestamp": "2026-05-17T00:00:00.000Z"
}
```

---

## 6. Bundle Analysis

Installed but passive — only runs when you ask it to.

```bash
npm run analyze             # Build + generate bundle report
```

Opens `.next/analyze/client.html` in browser with an interactive treemap of the JavaScript bundle.

Use this to:

- Find what's bloating the main bundle (FullCalendar? Icon libraries?)
- Compare before/after adding a dependency
- Identify large components that should be lazy-loaded

There's no CI gate for bundle size — it's a one-off investigation tool for local dev.

---

## 7. Weekly Tidy (Optional)

A script is provided for periodic codebase maintenance. It runs ESLint auto-fix, Prettier, and TypeScript check, then creates a branch and PR.

```bash
bash lib/ci-scripts/weekly-tidy.sh
```

Runs: `eslint --fix .` → `prettier --write .` → `tsc --noEmit` → opens PR titled `chore: weekly code quality cleanup`

Prevents the slow accumulation of warnings and formatting drift. Run it whenever the codebase feels messy (no fixed schedule needed for solo development).

---

## 8. Playbooks

### "I'm pushing code for the first time in a while"

```bash
git pull
npm install          # Runs audit automatically
npm run lint:fix
npm run format:fix
npm run type-check
npm test
git add -A && git commit -m "chore: pre-push cleanup"
git push
```

### "I see an ESLint error I don't understand"

```bash
npm run lint          # Full report
# Then check the specific file + line
```

### "Tests are failing after a dependency update"

```bash
npm test              # Which tests?
# Check if it's a relay test (needs dev server) or component test
# For relay failures: is the dev server running?
# For component failures: did the component API change?
```

### "I want to add a new test"

1. Create `tests/my-component.test.tsx` or add to an existing file
2. Import from `@/components/...` (aliases work)
3. Mock what you need in the test or add to `tests/setup.ts`
4. Run `npm test` to verify it passes

### "I'm upgrading Next.js"

1. Update the version in `package.json`
2. `npm install` (audit runs automatically)
3. `npx tsc --noEmit` — check for type changes
4. `npm test` — check for regressions
5. `npm run lint` — check for new lint rules
6. Manually test scene activation and character sheet rendering
