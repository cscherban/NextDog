# Deeper keyboard support for the NextDog overlay

**Date:** 2026-06-15 · **Size:** S · **Priority:** P2

## Problem

Keyboard support exists (`j`/`k`/`Enter`/`Esc` via `use-keyboard.ts`; `?` opens help) but
is shallow. The dashboard's pitch over "scroll the terminal" is mouse-free operability, yet:

- No way to **focus the filter bar** from the keyboard — the highest-frequency action in any list tool.
- No way to **switch Spans ⇄ Logs** without the mouse.
- No way to **clear the current filter** quickly.
- The help sheet lists only 5 keys and omits the search bar's own editing keys, under-selling what already ships.

## Key bindings

| Action | Key(s) | Active when |
|---|---|---|
| Focus filter bar | `/` **or** `Cmd/Ctrl+K` | `/` only outside inputs; `Cmd/Ctrl+K` always |
| Switch to Spans (prev view) | `[` | outside inputs |
| Switch to Logs (next view) | `]` | outside inputs |
| Clear current filter | `Shift+X` | outside inputs |
| (existing) row nav / select / back | `j` `k` `Enter` `Esc` | per-view, outside inputs |
| (existing) toggle help | `?` | outside inputs |

`[`/`]` were chosen over `g s`/`g l` chords to avoid a pending-key state machine for a two-view app.
`Shift+X` was chosen for clear-filter because `Esc` is already overloaded (close pane / deselect row).

## Architecture

Global shortcuts live in `app.tsx`, alongside `<ShortcutHelp/>` — the place that already holds routing
(`route()` from preact-router) and `eventsResult.setSearchQuery`.

1. **`hooks/use-global-shortcuts.ts`** — mirrors `use-keyboard.ts`: one `window` keydown listener that
   delegates to a **pure resolver** `resolveGlobalShortcut(e) → Action | null`, where
   `Action = 'focusFilter' | 'prevView' | 'nextView' | 'clearFilter'`. The hook calls the matching callback.
   The pure resolver keeps the key-mapping logic unit-testable in plain node (no DOM).
   - Guard: when `e.target` is `INPUT`/`TEXTAREA`, only `Cmd/Ctrl+K` resolves (so you can refocus the filter
     while typing); every other binding returns `null`. Outside inputs, all bindings resolve.

2. **Focusing the input** — `SearchBar`'s `<input>` is otherwise only reachable via an internal ref.
   Add a stable `id` to it and export the constant (`export const FILTER_INPUT_ID` from `search-bar.tsx`).
   `app.tsx`'s `onFocusFilter` does `document.getElementById(FILTER_INPUT_ID)?.focus()` then `.select()`.
   Only one search input is mounted at a time (Router shows one view), so the selector is unambiguous —
   and avoids forwarding refs through `Requests`/`Logs`. Id and selector stay colocated in one module.

## `shortcut-help.tsx`

Replace the flat 5-item list with grouped sections:

- **Navigation:** `j` next · `k` prev · `Enter` open · `Esc` back
- **Filter & views:** `/` or `Cmd/Ctrl+K` focus filter · `Shift+X` clear filter · `[` `]` switch view
- **In the filter bar:** `↑`/`↓` suggestions · `Tab` complete · `Enter` add token · `Backspace` remove last · `←` edit last · `Esc` blur
- **Help:** `?` toggle

Reuses existing `rowStyle`/`kbdStyle`; adds one small section-heading style.

## Testing

No DOM test environment exists and we won't add jsdom (keeps deps lean per CLAUDE.md). Instead,
`use-global-shortcuts.test.ts` (vitest, node) exercises **`resolveGlobalShortcut`** as a pure function:
plain `{key, metaKey, ctrlKey, shiftKey, target}`-shaped inputs → expected action, including the
INPUT/TEXTAREA guard and the `Cmd/Ctrl+K`-in-input exception. First test in the package.

Gate: `pnpm build` + `pnpm --filter @nextdog/ui test` pass.

## Commits

1. Add `FILTER_INPUT_ID` + `id` on the SearchBar input
2. Add `use-global-shortcuts.ts` (resolver + hook) and its test
3. Wire `useGlobalShortcuts` into `app.tsx` (focus / view-switch / clear)
4. Rewrite `shortcut-help.tsx` into grouped sections incl. search-bar keys
