# Frontend Architecture, Performance & Code Quality Standards

> **Core Philosophy**: Development is not just about making features work; **Performance (Core Web Vitals)** and **Software Quality (Clean Architecture)** must go hand-in-hand as first-class architectural constraints.

---

## 1. Core Web Vitals Standards (Strict SLA)

All pages, modals, and user interactions must strictly satisfy Google Core Web Vitals in the **"GOOD"** (Green) threshold. Any metric falling into "Needs Improvement" or "Poor" is treated as a blocking bug.

| Metric | Target (Good) | Critical Threshold (Fail) | Engineering Strategy |
| :--- | :--- | :--- | :--- |
| **INP** (Interaction to Next Paint) | **≤ 200 ms** (Target: < 100 ms) | **> 200 ms** | Isolate state, memoize leaf components, debounce inputs, zero heavy sync work on main thread. |
| **LCP** (Largest Contentful Paint) | **≤ 2.5 s** (Target: < 1.5 s) | **> 2.5 s** | Route-level code splitting, prioritize critical path resources, optimized font loading. |
| **CLS** (Cumulative Layout Shift) | **≤ 0.1** (Target: < 0.02) | **> 0.1** | Explicit dimensions for images/skeletons, avoid dynamic layout shifts during render. |
| **FCP** (First Contentful Paint) | **≤ 1.8 s** (Target: < 1.0 s) | **> 1.8 s** | Vendor chunk splitting, minimized critical CSS/JS payload. |
| **TBT** (Total Blocking Time) | **≤ 200 ms** (Target: < 100 ms) | **> 200 ms** | Break long tasks (> 50 ms) into microtasks using `requestAnimationFrame` or `startTransition`. |

---

## 2. Component Decomposition & Anti-Monolith Rules

### Rule 2.1: File Size Limit (Max 200–250 lines per file)
- **NEVER** write monolithic component files (e.g., 500–1000 lines).
- Any component exceeding 250 lines **MUST** be decomposed into sub-components, custom hooks, or utility modules.

### Rule 2.2: Single Responsibility Principle (SRP)
- A component must do **one thing well**:
  - A modal component (`*Modal.tsx`) acts **only** as an orchestrator/layout container.
  - Form fields, rows, sections, and item cards **MUST** be extracted into separate, dedicated sub-components.
  - Business logic, state manipulation, and API mutations **MUST** reside in custom hooks (`use*.ts`), not inlined in the JSX view.

### Rule 2.3: Reusable Component Extraction
- Identify repeating patterns immediately:
  - If a layout, card, button style, or input pattern is used in 2+ places, extract it to `@/shared/ui/` or feature-level `components/`.
  - Always design components with clear, typed props and zero hardcoded business assumptions.

---

## 3. Clean Architecture & Layering (Feature-Sliced Structure)

Frontend modules follow a clean separation of concerns:

```
src/
├── app/                  # Application configuration, providers, global router
├── shared/               # Universal UI primitives, HTTP clients, layout, i18n
│   ├── ui/               # Reusable headless/Tailwind components (Button, Input, Dialog, etc.)
│   ├── layout/           # Global shell, Navigation, Header
│   └── lib/              # HTTP, WebSocket, utility helpers
└── features/<domain>/    # Domain-driven feature modules (e.g. recipes, trials)
    ├── components/       # Domain-specific UI sub-components (decomposed, atomic)
    ├── hooks/            # Presentation logic, form state, TanStack Query hooks
    ├── types/            # TypeScript domain interfaces and DTOs
    └── <Feature>Page.tsx # Route-level orchestrator (lazy-loaded)
```

### Layer Responsibilities:
1. **Domain/Types Layer**: Clean TypeScript definitions without UI dependencies.
2. **Infrastructure Layer (`shared/lib`)**: API clients, HTTP wrappers, WebSocket managers.
3. **Application/Hooks Layer (`features/*/hooks`)**: State machines, form handlers, cache queries, mutations.
4. **Presentation Layer (`features/*/components`)**: Pure or minimally-connected UI components, optimized for re-renders.

---

## 4. INP & Runtime Performance Optimization Guidelines

The Chrome DevTools Performance panel flags INP when long event handlers or massive DOM reconciliations delay the frame paint after a user interaction (click, tap, keypress).

### 4.1 Isolate Re-renders
- **Problem**: In a 900-line monolithic form, changing a single input or clicking "Add Row" forces the entire form and all existing rows to re-render, easily causing 200ms+ INP spikes.
- **Solution**:
  - Wrap list items (e.g. `StepRow`, `IngredientRow`) in `React.memo` with proper `displayName`.
  - Use `useCallback` for row mutation callbacks (`onUpdate`, `onDelete`, `onMove`).
  - When row $i$ updates, rows $1..n-1$ **MUST NOT** re-render.

### 4.2 Keep Event Handlers Fast (< 16ms)
- Do not perform synchronous heavy computations, huge array transformations, or DOM measurements in click/change event handlers.
- Use `React.startTransition` for non-urgent state updates (e.g., search filter rendering, tab switching) so urgent input events remain immediately responsive.

### 4.3 Debounced & Controlled Inputs
- For high-frequency typing or search inputs, debounce queries to avoid synchronous DOM thrashing.
- Uncontrolled inputs or localized state should be preferred for large forms before committing to root state.

---

## 5. Bundle Splitting & Loading Performance (LCP / FCP)

### 5.1 Route-Level Code Splitting
- **All** top-level pages in `App.tsx` **MUST** be loaded dynamically via `React.lazy()` and wrapped in `<Suspense fallback={<SkeletonPage />}>`.
- Never import heavy pages statically in the main bundle.

### 5.2 Vendor Chunk Splitting (Vite)
- Configure `build.rollupOptions.output.manualChunks` in `vite.config.ts`:
  - `vendor-react`: `react`, `react-dom`, `react-router`
  - `vendor-ui`: `@radix-ui/*`, `lucide-react`, `sonner`
  - `vendor-charts`: `recharts` (lazy-load on demand)
  - `vendor-query`: `@tanstack/react-query`
- Prevent any single chunk from exceeding **500 kB**.

---

## 6. Code Quality & Standards

1. **Zero Hardcoding**:
   - Zero hardcoded colors/spacing: Use Tailwind `@theme` variables (`bg-primary`, `border-border`, etc.).
   - Zero hardcoded UI text: All strings must pass through `i18n` (`t('namespace.key')`).
2. **Strict TypeScript**:
   - No `any` escapes without explicit architectural rationale.
   - Comprehensive types for API payloads and component props.
3. **Documentation & Tests**:
   - Every complex hook or domain calculation must have unit tests.
   - All code changes must build cleanly with `npm run build` and zero linter warnings.
