# Frontend Development Rules: The Limited Pork

Refer to `docs/FRONTEND_PERFORMANCE_AND_ARCHITECTURE_RULES.md` for full architectural specifications.

## 1. Web Vitals Thresholds (Strict SLA)
- **INP <= 200ms** (Interaction to Next Paint must be Green/Good).
- **LCP <= 2.5s**, **CLS <= 0.1**, **TBT <= 200ms**.

## 2. Component Decomposition
- **Max 200-250 lines per component file**. Decompose monolithic files into child components and custom hooks.
- **Form Sections & Rows**: Separate into distinct components (`*Section.tsx`, `*Row.tsx`).
- **Hooks**: Isolate form state, queries, and mutations in `use*Form.ts`.

## 3. Re-render Isolation & Memoization
- Wrap mapped list items and child form cards in `React.memo`.
- Memoize handlers with `useCallback` to prevent cascading re-renders that spike INP.
- Use `startTransition` for non-urgent background UI updates.

## 4. Code Splitting
- Lazy load all routes with `React.lazy()` and `<Suspense>`.
- Use manual chunking in `vite.config.ts` for third-party libraries.

## 5. Zero Hardcoding
- All strings must use `i18n` translation keys.
- All styles must use design tokens and Tailwind classes.
