# Deferred items — Phase 30

## Pre-existing tsc errors with Jest globals

`npx tsc --noEmit` reports 442 total errors project-wide, including 11 in
`src/stores/__tests__/useNavigationStore.test.ts` of the form:

- `Cannot find name 'describe'` / `'it'` / `'expect'` / `'beforeEach'`

Root cause: `@types/jest` is not listed in `devDependencies` and the project
has no `tsconfig.test.json`. The same 11-errors-per-test-file pattern affects
every existing test file in the repo (20+ files, 23+ `describe` errors).

These tests still run and pass under jest because:
- jest's runtime uses Babel transform (not tsc)
- jest-expo preset injects the globals at runtime

Out of scope for Plan 30-01 (the store file `useNavigationStore.ts` itself has
zero new tsc errors — verified by `grep -E "useNavigationStore\.ts" | grep -v "__tests__"`
returning empty).

## Pre-existing tsc error: useChatRoom result.refetch (Plan 30-04)

`src/screens/chat/ChatRoomScreen.tsx` destructures `refetch` from `useChatRoom(...)`
at the top of the component. The `UseChatRoomResult` type in
`src/hooks/useChatRoom.ts` does not declare a `refetch` field, so tsc reports:

- `error TS2339: Property 'refetch' does not exist on type 'UseChatRoomResult'.`

Verified pre-existing on `main` BEFORE Plan 30-04's edits (the count of
`ChatRoomScreen.tsx` tsc errors was already 1 in `git stash` baseline).
Out of scope per the scope-boundary rule — Plan 30-04 only adds three
new imports + one useFocusEffect block and introduces zero new tsc errors.
