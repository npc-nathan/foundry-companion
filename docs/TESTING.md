# Testing Guide

> Test infrastructure, patterns, and commands for Foundry Companion.

---

## Test Runner: Vitest

Configured in `vitest.config.ts` — jsdom environment, TypeScript, React Testing Library, MSW.

## Test Count

**198 tests across 20 files** (as of last audit).

### Test Files

#### Main test directory (`__tests__/`)

| File                                                    | Tests | What it covers                                                                          |
| ------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| `__tests__/components/CharacterSheet.expanded.test.tsx` | ~60   | Full character sheet rendering, all tabs, HP controls, rests, skills, inventory, spells |
| `__tests__/components/connection-gate.test.tsx`         | ~15   | Connection flow: form validation, health check, connection states, error display        |
| `__tests__/components/ErrorBoundary.test.tsx`           | ~8    | Error catch, fallback UI, recovery click, webhook reporting                             |
| `__tests__/components/GifPicker.test.tsx`               | ~12   | Search, loading states, error handling, select/cancel, keyboard navigation              |
| `__tests__/components/PartyManager.test.tsx`            | ~10   | Party CRUD, member management, invite flow                                              |
| `__tests__/components/system-item-viewer.test.tsx`      | ~8    | System item display, metadata rendering                                                 |
| `__tests__/components/UserAvatar.test.tsx`              | ~6    | Avatar rendering, color indicators, online status                                       |
| `__tests__/components/UserList.test.tsx`                | ~15   | User list rendering, whisper targets, party grouping                                    |
| `__tests__/lib/sse.test.ts`                             | ~10   | SSE manager: subscribe/unsubscribe, reconnect, event dispatch, abort                    |
| `__tests__/lib/utils.test.ts`                           | ~5    | Utility functions                                                                       |

#### Legacy test directory (`tests/`)

| File                               | Tests | What it covers                                     |
| ---------------------------------- | ----- | -------------------------------------------------- |
| `tests/CharacterSheet.test.tsx`    | 2     | Basic character sheet render (legacy)              |
| `tests/env-debug.test.ts`          | 1     | Environment variable verification                  |
| `tests/parse-macro-inputs.test.ts` | ~15   | Macro input parser: edge cases, formula extraction |
| `tests/relay-html.test.ts`         | ~15   | HTML content sanitization and processing           |
| `tests/relay-smoke.test.ts`        | 16    | API contract tests (needs dev server)              |
| `tests/setup-test.test.tsx`        | 2     | Setup verification                                 |
| `tests/sidebar.test.tsx`           | 3     | Navigation rendering                               |
| `tests/store-auth.test.ts`         | ~10   | Auth store: token management, session persistence  |
| `tests/store.test.ts`              | ~12   | Global store: config, UI state, status             |
| `tests/use-actor-data.test.ts`     | ~8    | Actor data hook: data extraction, edge cases       |

### Setup Files

| File                         | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `tests/setup.ts`             | Shared mocks (Next.js router, shadcn components) |
| `tests/.audit-baseline.json` | NPM audit baseline snapshot                      |

---

## Commands

```bash
npm test                # Run all tests (198 tests, ~10s)
npm run test            # Same
npm run test -- --watch # Watch mode for TDD
npm run test -- --ui    # Vitest UI (browser dashboard)
```

## Environment Variables for Tests

| Variable                    | Required for                             | Default |
| --------------------------- | ---------------------------------------- | ------- |
| `RELAY_API_KEY`             | Relay smoke tests (in `.env.test.local`) | —       |
| `NEXT_PUBLIC_TENOR_API_KEY` | GifPicker tests                          | —       |

## Test Structure

```
foundry-companion/
├── __tests__/
│   ├── components/        # Component tests (RTL)
│   └── lib/               # Library/utility tests
├── tests/
│   ├── *.test.ts          # Legacy + integration tests
│   ├── *.test.tsx         # Legacy component tests
│   ├── setup.ts           # Shared mocks
│   └── .audit-baseline.json
└── vitest.config.ts
```

## Test Patterns

### Component Tests (RTL)

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

Component tests use mocked dependencies. `tests/setup.ts` provides global mocks for Next.js router and shadcn components.

### Mock Patterns

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

### Relay Contract Tests

These hit the actual relay API and require:

1. Dev server running: `npm run dev`
2. Relay API key in `.env.test.local`

```ts
it('returns scenes list', async () => {
  const [status, body] = await relayGet('/structure?types=Scene');
  expect(status).toBe(200);
});
```

If the dev server is down, relay tests will timeout/fail. Component tests still work independently.

### SSE Tests

```ts
import { sseManager } from '@/lib/sse';

it('subscribes and unsubscribes', () => {
  const listener = vi.fn();
  const unsub = sseManager.listen(listener);
  sseManager.subscribe('chat', 'url', 'key', 'client-id');
  // ... test event dispatch
  unsub();
});
```

## Adding a New Test

1. Create `__tests__/components/my-component.test.tsx` or add to an existing file
2. Import from `@/components/...` (aliases work)
3. Mock what you need in the test or add to `tests/setup.ts`
4. Run `npm test` to verify it passes

## Troubleshooting

| Symptom                                          | Likely Cause                         | Fix                                         |
| ------------------------------------------------ | ------------------------------------ | ------------------------------------------- |
| Relay tests hang/timeout                         | Dev server not running               | `npm run dev` in another terminal           |
| Component tests fail with "not wrapped in act()" | Async state change without `waitFor` | Wrap in `await waitFor(() => ...)`          |
| Unexpected token errors                          | Missing ES module mock               | Check `vi.mock()` is hoisted to top of file |
| Type errors in tests                             | Outdated type mocks                  | Run `npx tsc --noEmit` to check             |
