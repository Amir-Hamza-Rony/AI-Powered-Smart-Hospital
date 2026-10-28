# Design System — AI-Powered Smart Hospital

> Source of truth: current source code on `rony-dev` (verified Oct 2026).
> Tokens below are taken verbatim from `src/index.css` and `tailwind.config.js`.
> Anything labelled **Recommendation** is not yet implemented.

## 1. Product Purpose and Intended Users

An integrated hospital management system covering clinical (patients, doctors,
appointments, prescriptions, lab, pharmacy), financial (billing), AI-assisted
(triage, clinical assistant, prescription advisory, no-show prediction,
analytics), and operational (reminders, queue, alerts) workflows.

Intended users map to backend `Role` (`backend/apps/accounts/models.py`):
Super Admin, Doctor, Nurse, Receptionist, Pharmacist, Pathologist, Patient.
The frontend mirrors these as `MockRole` in `src/context/RoleContext.tsx`
plus a JWT session in `src/context/AuthContext.tsx`.

## 2. Visual Design Principles

Stated in `src/index.css:5-9`: *"Clinical, calm, trustworthy. Teal/cyan
primary with slate base."* In practice:

- Calm neutral surfaces (slate-tinted background, white cards), one strong
  teal primary for actions and active navigation.
- Dense, table-first clinical workflows; dashboard summaries on top, drill-down
  pages beneath.
- Status communicated by badges, never by color alone (badges carry text:
  see `BillingStatusBadges`, `AppointmentStatusBadge`, `AIBadges`,
  `AutomationStatusBadge`).
- AI outputs always paired with a disclaimer and confidence indicator —
  decision support, never autonomous orders.

## 3. Theme Implementation (Verified)

`src/context/ThemeContext.tsx` + `src/components/layout/ThemeToggle.tsx`
provide **light / dark / system**. `tailwind.config.js:3` sets
`darkMode: ['class']`; `.dark` overrides live in `src/index.css:49-78`.
`Header.tsx` hosts the toggle; preference persists in local storage.

## 4. Color Tokens and Semantic Usage

CSS variables in `src/index.css:12-47` (light) and `:49-78` (dark), consumed
through Tailwind names in `tailwind.config.js:14-58`
(`background, foreground, card, popover, primary, secondary, muted, accent,
destructive, border, input, ring, sidebar-*`).

Light theme (HSL):

| Token | Value | Usage |
|---|---|---|
| `--background` | `210 40% 98%` | App background |
| `--foreground` | `222 47% 11%` | Body text |
| `--card` | `0 0% 100%` | Cards, dialogs, popovers |
| `--primary` | `173 80% 32%` (teal-600 tuned) | Primary buttons, active nav, links, focus ring (`--ring` same) |
| `--primary-foreground` | `0 0% 100%` | Text on primary |
| `--secondary` / `--muted` | `210 40% 96%` | Secondary buttons, muted surfaces, table headers |
| `--accent` | `199 89% 93%` | Info/accent surfaces |
| `--accent-foreground` | `201 90% 27%` | Text on accent |
| `--destructive` | `0 84% 60%` | Danger buttons, overdue/critical states |
| `--border` / `--input` | `214 32% 91%` | Borders, input borders |
| `--radius` | `0.625rem` | Base radius; `lg/md/sm` derived in config |

Dark theme: background `222 47% 7%`, card `222 47% 10%`, primary
`174 72% 45%` with dark foreground `222 47% 7%`, borders `217 33% 20%`.

Sidebar tokens (`--sidebar-background/foreground/primary/accent/border/ring`)
are separate so the sidebar stays white in light mode (`0 0% 100%`) and
`222 47% 9%` in dark mode — see `src/components/layout/Sidebar.tsx`.

Semantic status colors are component-level, not global tokens:

- Appointments: `AppointmentStatusBadge.tsx` (Pending/Confirmed/Completed/Cancelled).
- Billing: `BillingStatusBadges.tsx` (invoice + payment states, overdue emphasis).
- Lab/pharmacy/Rx: `components/phase3/StatusBadges.tsx`.
- AI: `components/ai/AIBadges.tsx` (`AIStatusBadge`, `AITriageBadge` with
  Emergency/Urgent/Moderate/Low, `AIConfidenceIndicator`).
- Automation: `AutomationStatusBadge.tsx`.

**Recommendation:** centralize status→color mapping in one module instead of
per-domain badge files.

## 5. Typography

System font stack via Tailwind defaults; `src/index.css:85` enables
`font-feature-settings: 'rlig' 1, 'calt' 1` and `antialiased` on `body`.
No custom font files or `@font-face` in the repo. Hierarchy observed:

- Page titles via `components/shared/PageHeader.tsx` (title + description + actions).
- Section titles inside `Card` headers (`components/ui/card.tsx`).
- Table text `text-sm`; muted descriptions `text-sm text-muted-foreground`.
- Monospace/QR content only in `PatientQRCard.tsx`.

**Recommendation:** document an explicit type scale (e.g. page title 24/32,
section 18/28, body 14/20) and adopt tabular numerals for clinical tables.

## 6. Spacing and Layout Principles

- Container: `tailwind.config.js:6-12` centers content with `2rem` padding,
  `2xl: 1400px` max — dashboards use full-width grids inside this.
- Shell metrics in `src/index.css:44-46`: `--header-height: 4rem`,
  `--sidebar-width: 16.5rem`, `--sidebar-collapsed-width: 4.5rem`.
- `AppLayout.tsx`: sidebar (desktop collapsible + mobile `Sheet` drawer) +
  sticky header + `<Outlet />` content area with consistent page padding.
- Dashboard pattern (`DashboardPage.tsx`, `BillingDashboardPage.tsx`,
  `AIDashboardPage.tsx`): stat-card row → charts row → recent-activity tables.
- List pages: `PageHeader` (search/filters/actions) → table card → `DataPagination`.
- Detail pages: header with status badge + action buttons → two-column
  info/timeline cards → related records.

## 7. Sidebar and Header Behavior

- `Sidebar.tsx`: grouped navigation from `src/config/navigation.ts`
  (`NAV_GROUPS`, 13 groups: Overview, Patient/Doctor/Appointments,
  Prescription, Lab ×3, Pharmacy ×4, Billing ×6, AI ×7, Automation ×6,
  Notifications, System). Longest-match active highlighting (`isActiveItem`).
  Collapsible on desktop; `Sheet` drawer on mobile. **No role filtering** —
  `NavItem.roles?` exists in the type but is never populated or checked
  (verified gap).
- `Header.tsx`: decorative global search (non-functional placeholder),
  `ThemeToggle`, notification bell (links to `/notifications`), auth avatar
  menu. `RoleSwitcher.tsx` shows the current mock role with an explicit
  badge: *"UI-only — no backend auth yet"*.
- Content width follows the container rule above; tables scroll horizontally
  on small screens.

## 8. Content Width and Dashboard Layout

Main dashboard (`src/pages/DashboardPage.tsx`, 362 lines): `StatCard` row,
`Doughnut` charts (Chart.js via `react-chartjs-2`), and per-domain sections
(Patients, Appointments, Prescriptions, Lab, Pharmacy, Billing, AI,
Automation). Note: the root dashboard still reads mock store data for some
sections while domain dashboards (lab, pharmacy, billing, AI) read live APIs —
a known inconsistency (see §16).

## 9. Cards, Tables, Forms, Dialogs, Dropdowns

- Primitives in `src/components/ui/` (15 files, Radix-based):
  `button, badge, card, dialog, dropdown-menu, input, label, select, sheet,
  table, tabs, textarea, avatar, separator, tooltip`.
- `button.tsx` uses `class-variance-authority` variants
  (default/secondary/outline/destructive/ghost, sizes).
- Tables (`table.tsx` + domain tables such as `InvoiceTable.tsx`,
  `PatientTable.tsx`, `LabOrderTable.tsx`): sticky header, row hover, right-
  aligned monetary columns, status badge column, row-click to detail.
- Forms: `label + input/select/textarea` with inline validation messages;
  domain forms (`PatientForm`, `DoctorForm`, `AppointmentForm`,
  `InventoryFormPage`) use controlled inputs. Selects use Radix `select.tsx`.
- Dialogs (`dialog.tsx` + `ConfirmDialog.tsx`, `RecordPaymentDialog.tsx`):
  used for destructive confirms, payment recording, prescription-advisory
  sign-off. Destructive actions always require confirmation.
- Dropdowns/menus: avatar menu and row actions via `dropdown-menu.tsx`.

## 10. Charts and Data Visualization

`chart.js@4` + `react-chartjs-2@5` (see `package.json`). Used in
`RevenueChart.tsx`, dashboard `Doughnut` charts, and
`HealthAnalyticsPage.tsx` (6 charts: visits, department workload, completion,
peak hours, condition trends, pharmacy demand). Conventions: teal primary
series, slate secondary, destructive red for overdue/critical; every chart is
paired with a textual summary or table for accessibility.

## 11. Buttons, Badges, Status Indicators

- Buttons: primary teal for the happy-path action (Save, Issue, Dispense,
  Send), outline for secondary, destructive for cancel/delete. Permission-gated
  buttons hide or disable via `hooks.ts` helpers (`canWritePrescriptions`,
  `canManageInventory`, `canUseClinicalAI`, …) — e.g. Phase 3 pages show
  write actions only to authorized roles.
- Badges: text-bearing status pills everywhere; triage badges add
  Emergency (red) → Low (green) severity.
- AI indicators: `AIConfidenceIndicator` (percentage bar), `AIStatusBadge`
  (Pending Review/Reviewed), processing spinners via `AIProcessingState.tsx`.

## 12. Loading, Error, Empty, Unauthorized, Not-Found States

Standardized in `src/components/shared/ApiState.tsx`:

- `ApiLoading` — centered spinner with `aria-label`.
- `ApiErrorState` — message + Retry (`refresh()`).
- `ApiForbiddenState` — shown on HTTP 403 with role hint.
- `EmptyState.tsx` — icon + message + optional action.
- `DataPagination.tsx` — page controls for `useApiList` pages.
- Auth: `RequireAuth` redirects to `/login`; `RequireRole` renders an
  "Access restricted" card (exported but not yet applied to routes).
- `NotFoundPage` for `*` routes; `PlaceholderPage` retained only for
  `/settings` (`routes.tsx:144`).

Rule: every backend-connected page must handle loading/error/empty/403 —
verified on Phase 3/10/11/12 pages; Phase 2 mock pages do not (they never
fetch).

## 13. Responsive Behavior

- Sidebar collapses to icon rail (`4.5rem`) and to a `Sheet` drawer on mobile.
- Stat-card grids wrap (`grid-cols-1 sm:2 lg:4` pattern); tables get
  horizontal scroll; dialogs become full-width sheets on small screens.
- Verified pattern in `AppLayout`, `BillingDashboardPage`, `QueuePage`.
  **Recommendation:** add explicit responsive QA to the phase-completion
  checklist (see `workflow.md`).

## 14. Accessibility Considerations

Current state: semantic landmarks (header/nav/main), Radix focus management
in dialogs/selects, `aria-label` on loading spinners, text-bearing badges.
Gaps: header search is decorative (mislabeled affordance), charts lack
`aria-describedby` text alternatives in some pages, form error associations
are inconsistent. **Recommendation:** fix search or remove it; add chart
table fallbacks; associate all errors with `aria-describedby`.

## 15. Component Library and Conventions

```
src/components/
  ui/            15 Radix primitives (button, card, dialog, table, …)
  layout/        AppLayout, Sidebar, Header, ThemeToggle, RoleSwitcher
  auth/          RequireAuth (+ RequireRole, unused on routes)
  shared/        StatCard, PageHeader, EmptyState, DataPagination, ApiState, ConfirmDialog
  ai/            AIBadges, AICards, AIDisclaimer, AIProcessingState
  billing/       8 tables/dialogs/badges/charts
  phase3/        Prescription/Lab/Pharmacy tables + StatusBadges
  patients|doctors|appointments|automation/  domain components
```

Rules: domain components compose `ui/` + `shared/`; no raw `fetch` outside
`src/lib/api/`; no new color hexes — use CSS-variable tokens; icons from
`lucide-react@1.49` only.

## 16. AI-Specific Presentation and Safety Disclaimers

- `AIDisclaimer.tsx` (`variant=triage|general`) plus a hardcoded
  `DISCLAIMER` in `backend/apps/ai/providers.py:15-18` — every triage result
  carries it; clinical/advisory pages render it at the top of results.
- Triage levels, confidence %, department suggestion, considerations, risk
  indicators, and next action are displayed as structured cards, never as
  free-text orders.
- Review affordances: `reviewInsight()` sign-off in advisory/symptom pages;
  pending-review counts on the AI dashboard. Missing: review action inside
  `AIActivityPage` (documented gap).
- Copy rule: "AI-assisted", "advisory", "requires physician review" —
  never "diagnosis" or "prescription approved".

## 17. Clinical Workflow Design Principles

- Encounter order enforced by navigation and backend state machines:
  patient → appointment (Pending→Confirmed→Completed, Cancelled frees the
  slot) → prescription → lab/pharmacy → billing.
- Destructive or state-advancing actions (`issue/cancel invoice`,
  `process/ready lab order`, `dispense`, `review insight`) are explicit
  buttons with confirms and audit entries — never implicit on save.
- Money and stock are server-derived (invoice totals, medicine
  availability) and displayed read-only; the UI never computes them
  authoritatively (see `architecture.md`).

## 18. Rules for Future UI Changes

1. Reuse `ui/` + `shared/`; do not duplicate buttons, tables, or state blocks.
2. Every new page: `PageHeader` + `ApiState` handling + `DataPagination`
   where listing + 403/empty states.
3. No new mock data for supposedly-live modules — wire `src/lib/api/` or
   label the screen honestly (as `ClaimsPage` does today).
4. No new hex colors; extend CSS variables if a token is truly missing.
5. AI screens must include `AIDisclaimer` and surface confidence + provider.
6. Permission-gate write actions with the matching `hooks.ts` helper.

## 19. Existing Inconsistencies and Known Design Debt

1. Root `DashboardPage` mixes mock-store summaries while domain dashboards
   are live — unify on live APIs.
2. `ClaimsPage` is intentionally mock ("No API integration") — keep the
   label until the backend exists or the route is removed.
3. Automation screens are simulations (`setInterval` queue, fixed
   `SIM_TIME`) — labeled in code but not always in the UI; add "Demo"
   badges until the backend lands.
4. `NavItem.roles` unused; `RoleSwitcher` UI-only — either enforce or remove.
5. Header search decorative — implement or remove.
6. Status-badge implementations duplicated per domain — centralize.
7. Root `README.md` is still the Vite template — rewrite (see roadmap).
