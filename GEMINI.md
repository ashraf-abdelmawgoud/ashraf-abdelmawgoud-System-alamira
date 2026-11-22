# AL-AMIRA ERP V2 — Project Rules & Operating Guidelines

## 1. Project Architecture & Workspace Layout
- **Repository Root:** `D:\Projects\System_Excel` (Git tracking root, Vercel root config).
- **Frontend Application (`alamira-v2/`):** React 19, TypeScript 5.7, Vite 6, Tailwind CSS v4, `@supabase/supabase-js`, `html2canvas`.
  - All application source files live under `alamira-v2/src/`.
  - Package scripts must be executed inside `alamira-v2/` (e.g. `npm test`, `npm run build`).
- **Database & Backend Migrations (`supabase/`):**
  - Production migrations: `supabase/migration_v2_real_backend.sql`.
  - Pending review proposals: `supabase/proposals/`.
- **Deployment Configuration:** `vercel.json` (root and `alamira-v2/vercel.json`).

## 2. Framework & Code Conventions
- **React 19 & Vite 6:** Functional components, strict hooks rules, zero unnecessary re-renders.
- **TypeScript:** Strict type checking (`tsconfig.app.json`). Do not use `any` unless interfacing with untyped legacy libraries.
- **Tailwind CSS v4:** Use modern Tailwind v4 utilities. Maintain responsive design for mobile (Android/iOS) and desktop.
- **Supabase Service Layer:**
  - Encapsulate all database calls in `alamira-v2/src/services/supabaseDataService.ts` and domain validators.
  - Fail-closed design: Never query base tables with `select('*')` if secure views or projections are required.
  - Maintain Column-Level Security (CLS) and Role-Based Access Control (RBAC): Hide buy prices, profit margins, and true warehouse stock from sales operators.

## 3. Arabic Typography (RTL) & Cairo Font
- **Primary Font:** **Cairo** (`wght 400..900` Variable Font, SIL OFL-1.1 license).
- **RTL Integrity:** Enforce `dir="rtl"` across layouts, modals, and print views.
- **BiDi Mixed-Text Safeguards:** Preserve proper Unicode isolation for mixed Arabic/Latin/numeric product names (e.g., `كيبة2*2*10سم`).
- **Glyph Rendering:** Maintain cursive ligatures, diacritics, and vertical alignments without clipping.

## 4. Invoice Visual Fidelity & PNG Export
- **Production Exporter:** Built on `html2canvas` + `canvas.toBlob()` + 2x Retina scaling + Cairo font pre-warming + clone CSS optimizations + duplicate-download protection + `scheduler.yield()` for tap-to-visible-feedback.
- **Safeguards:**
  - Do NOT replace or disable the production exporter without isolated benchmarking and explicit user authorization.
  - Preserve full-height rendering for multi-item invoices (no vertical truncation or scrollbar captures).
  - Maintain A4 print stylesheets (`@media print`) and responsive print layouts.

## 5. Production Supabase Protection
- **Target URL:** `https://llmptlkvatndvrmnjiyj.supabase.co`.
- **Safety Directive:** ZERO direct, unverified DDL/DML mutations against the production Supabase database.
- **Confidentiality:** Never commit, log, or reveal service role keys, API secrets, or customer/financial data.
- **Idempotency & Transactions:** All financial operations (invoice approvals, stock deductions, cancellations) must be atomic, server-enforced RPCs with row locks (`FOR UPDATE`).

## 6. Supabase Remediation Isolation
- **Active Branch:** `codex/supabase-invoice-remediation` on root workspace.
- **Protected Uncommitted Work:**
  - `alamira-v2/src/domain/validateInvoiceWrite.ts`
  - `alamira-v2/src/services/supabaseDataService.ts`
  - `alamira-v2/src/tests/invoiceRemediation.test.ts`
  - `supabase/proposals/`
- **Rule:** NEVER overwrite, revert, discard, or stash this uncommitted work without explicit user consent.

## 7. Git Safety & Worktree Isolation
- **Production Baseline:** Latest verified commit on `origin/main` (`d775b44882b61afd37797bf62e8fd16a0e6e7176`).
- **Git Release Policy:** Never push, merge, or deploy without explicit user approval. After successful verification, an approved release may update `origin/main` using a guarded Git procedure.
- **Experimental Work:** Always create an isolated Git worktree (e.g. under `C:\Users\Elnour Tech\.codex\worktrees\<feature>\System_Excel`) for experiments, performance spikes, or benchmark prototypes.
- **Never Overwrite Local Changes:** Always verify `git status` before touching files. Do not run destructive commands (`git reset --hard`, `git checkout .`, `git clean -fd`).

## 8. Risk-Based Testing & Quality Gates
Apply risk-based verification inside `alamira-v2/`:
- **Focused Testing:** Run focused tests for isolated changes (`npx vitest run <path/to/test>`).
- **Application Validation:** Run TypeScript checks (`npx tsc -b`) and production build (`npm run build`) for application changes.
- **Full Regression Suite:** Run full regression tests (`npm test`) and linter (`npm run lint`) when preparing significant production releases (do not assume a fixed test count).

## 9. Tool Efficiency & Communication Protocol
- **Batching:** Execute independent searches, file reads, and edits in parallel within the same turn.
- **No Redundant Reads:** Do not re-read files or re-run passing tests without new edits.
- **Reactive Flow:** Never poll in loops for background tasks; wait for system notifications.
- **Reporting Protocol:** After completing each phase, provide a concise structured report, state the exact Git state, and identify the single recommended next step.
