# Book Layout Review Issues (After Commit 2171f6f)

## Medium Severity

1. Render guard reset is not guaranteed to trigger a new render init  
   Guard reset happens on `bookId` change, but the render-init effect depends only on `onRenderReady`. If `onRenderReady` stays stable across book changes, a new init may not run.  
   References: `src/components/BookLayout/BookLayout.tsx:41`, `src/components/BookLayout/BookLayout.tsx:94`, `src/components/BookLayout/BookLayout.tsx:134`

2. `bookId` prop is optional, so guard-reset safety is opt-in  
   If callers omit `bookId`, old stuck-guard behavior can still happen on book switches.  
   Reference: `src/components/BookLayout/BookLayout.tsx:7`

3. Keyboard animation API is still not wired to callers in this branch  
   `triggerAnimation` is exposed via ref, but there are still no call sites invoking it.  
   References: `src/components/BookLayout/BookLayout.tsx:17`, `src/components/BookLayout/BookLayout.tsx:70`

## Validation and Testing Gaps

4. Acceptance criterion `npx tsc --noEmit` still fails  
   Typecheck remains red project-wide.  
   References: `src/services/epub.ts:326` and multiple other files
