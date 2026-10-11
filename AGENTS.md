# Antigravity Workspace Guidelines: The Limited Pork

## High-Priority Directives

1. **Performance & Quality Concurrency**:
   - Web application features must NOT only work; they must achieve top-tier performance and clean code quality simultaneously.
   - Core Web Vitals must remain in the **"GOOD"** green threshold:
     - **INP (Interaction to Next Paint) $\le$ 200ms** (target $< 100ms$). Any user interaction or click taking $> 200ms$ is a blocking issue.
     - **LCP (Largest Contentful Paint) $\le$ 2.5s** (target $< 1.5s$).
     - **CLS (Cumulative Layout Shift) $\le$ 0.1** (target $< 0.02$).
     - **TBT (Total Blocking Time) $\le$ 200ms**.

2. **Clean Architecture & Component Decomposition**:
   - **NO Monolithic Files**: Do NOT write single files with 400+ lines. Keep files between 100-250 lines.
   - **Single Responsibility Principle (SRP)**:
     - Separate Presentation (pure/memoized UI components) from Application/State (custom hooks).
     - Separate Modal containers from internal form sections and rows.
     - Extract reusable UI patterns to `@/shared/ui/` or feature `components/`.
   - **Reactivity & Memoization**:
     - Wrap list items and dynamic sub-forms in `React.memo`.
     - Use `useCallback` for callbacks passed to child rows.
     - Avoid re-rendering an entire tree when an individual field or row is modified.

3. **Bundle Splitting & Lazy Loading**:
   - All page routes must be dynamically imported with `React.lazy()` + `Suspense`.
   - Heavy dependencies (e.g. charts, icons, UI libraries) must be vendor-chunked.

4. **Zero Hardcoding**:
   - Strictly no hardcoded strings (use `i18n` with Thai and English locales).
   - Strictly no hardcoded styling or magic values (use Tailwind theme tokens).
   - Strict TypeScript without arbitrary `any` casting.

Refer to `docs/FRONTEND_PERFORMANCE_AND_ARCHITECTURE_RULES.md` for full architectural specifications.
