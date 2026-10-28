# Workflow — AI-Powered Smart Hospital

> Persistent development playbook. Read this file (plus `architecture.md` and
> `design.md`) at the start of every coding session. Source of truth is always
> the current source code first — this document summarizes it so a future
> session can continue without full conversation history.

## 1. Project Context

- **Project:** AI-Powered Smart Hospital — integrated hospital management
  (clinical, administrative, financial, AI-assisted, operational).
- **Repository:** `https://github.com/Amir-Hamza-Rony/AI-Powered-Smart-Hospital`
- **Local root:** `D:/AI-Powered Smart Hospital`
- **Current branch:** `rony-dev` (user's work branch; verified via
  `git branch --show-current`).
- **Stack:** React 19 + TS + Vite + Tailwind 3 + Radix + Chart.js (frontend);
  Django 4.2+ + DRF + SimpleJWT + PostgreSQL + drf-spectacular (backend).
  No axios/react-query; no AI/ML packages (rule engine only).
- **Principles:** preserve working modules; smallest possible diff; never
  widen scope past the current task; verify with evidence (files, tests,
  diffs); report honestly (current vs planned); no commit/push without
  explicit permission.

## 2. Source of Truth

When information conflicts, resolve in this order:

1. Current source code and tests (`src/`, `backend/apps/`, `backend/config/`).
2. Original project specification/proposal **if present in the repo**
   (none found at audit time — only root + `backend/README.md`; do not
   invent spec requirements).
3. Current `architecture.md` / `design.md` (this docs set).
4. Git history (`git log`, `git show --stat`).
5. Older phase reports / previous AI-generated notes (lowest priority).

When a conflict is found, document it in the session report rather than
silently changing scope.

## 3. Verified Current Status

- **Verification date:** 2026-10-13 (docs task; code read, tests **not**
  re-executed — results below marked historical where applicable).
- **Last verified commit:** `d81e243` (2026-10-04)
  `feat:implement AI-Powered Clinical & Operational Intelligence` (HEAD of
  `rony-dev`, in sync with `origin/rony-dev`).
- **Branch/worktree at verification:** branch `rony-dev`, clean tree
  (`git status --porcelain=v1 -b` → only branch header, no changes).
- **Prior commit:** `36f694a` billing backend+integration (Phase 11);
  `cdfbe7f` Phase 10 integration; `9f4c043` Phase 9 APIs; `3e63b18`
  Phase 8 APIs. Re-verified via `git log --oneline -10` — matches the
  previously reported history; content verified per-module below.

### Phase completion matrix (evidence-based)

| Phase | Status | Notes |
|---|---|---|
| 1 Core UI/layout/dashboard/RBAC UI | Partial | Shell + dashboard real; route/nav role enforcement missing (`RequireRole` unused, `NavItem.roles` unpopulated, `RoleSwitcher` UI-only) |
| 2 Patient/Doctor/Appointment frontend | Partial | Pages + routes real but mock-backed (`HospitalStore`); no `patients/doctors/appointments` API clients |
| 3 Rx/Lab/Pharmacy frontend | Complete | Live via `lib/api/*` (Phase 10) |
| 4 Billing frontend | Partial | 7/8 live; **Claims mock-only** (`ClaimsPage.tsx` "No API integration") |
| 5 AI UI/mock | Complete (as live) | 7 AI pages call `/api/ai/`; old mocks unused |
| 6 Automation/realtime UI | Partial | 6 simulation screens; **backend stub** (`automation/models.py` 1 line, `urls.py` empty); no WS/SSE/polling |
| 7 Foundation/Auth/RBAC/Audit | Complete | User/JWT/RBAC/audit + tests (historical pass) |
| 8 Patient/Doctor/Appointment APIs | Complete (backend) | Models/views/urls/migrations/tests present |
| 9 Rx/Lab/Pharmacy APIs | Complete | Same, incl. FEFO/atomic dispense |
| 10 Rx/Lab/Pharmacy integration | Complete | Adapters/hooks/pages wired, no mock fallback |
| 11 Billing backend+integration | Partial | Invoice/payment/ledger live; **Claims backend absent** |
| 12 AI backend/integration | Partial | 8 endpoints + rule provider + review flow + 227-line tests committed; AI-01 (review UI), AI-02 (live dashboard AI), AI-07 (provider surfacing), AI-09 (AI_PROVIDER config) done; AI-03…AI-08, AI-11 remain (§9) |

### Implemented modules

`accounts, audit, patients, doctors, appointments, prescriptions,
laboratory, pharmacy, billing (excl. claims), ai` — each with
models/serializers/views/urls/migrations/tests; frontend pages + API
clients + adapters for Rx/lab/pharmacy/billing/AI.

### Partially implemented

RBAC UI enforcement; Phase 2 integration; Claims end-to-end; AI polish
items (§9 AI-01…AI-12); automation backend + realtime.

### Missing functionality

Claims backend; automation persistence/transport/jobs; LLM provider;
frontend tests; Activity review UI; sessions UI usage; live root-dashboard
AI section.

### Test evidence

Historical (not freshly executed): 12 backend `test_*.py` suites
(`accounts×3, audit, patients, doctors, appointments, prescriptions,
laboratory, pharmacy, billing~20 cases, ai~14 cases/227 lines`). Frontend:
no tests. Mark all as **historical** until re-run in a coding session.

### Known blockers / decisions needed

- Claims in or out of spec? (No spec file in repo — needs user/product call.)
- LLM provider approved? (Security/cost decision; default stays local rules.)
- Realtime transport choice (SSE/polling vs Channels) + whether
  email/SMS is in scope.

### Last completed task

Docs task: `design.md` + `architecture.md` + `workflow.md` (+
`PROJECT_STATUS.md`) created on `rony-dev`, uncommitted at time of writing.

### Next recommended task

`BILL-01` (Claims scope decision) — one product answer unblocks the
definition of done for Phase 11 and stops the mock from misleading users;
then `AI-01` (Activity review UI), the highest-value Phase 12 gap. Reasons
in §9 execution order.

## 4. Phase Execution Rules

For every future task:

1. Inspect relevant code and tests (`read`/`grep`, never assume).
2. Identify exact files and dependencies; record them in the plan.
3. Write a small implementation plan; keep the diff minimal.
4. Implement only the current task (no scope creep into the next phase).
5. Add or update tests for backend changes; update frontend states
   (loading/error/empty/403/404) for UI changes.
6. Run backend checks: `python manage.py check`, targeted
   `python manage.py test apps.<name>`, then broader suite if green.
7. Run frontend gates when frontend changes: `npm run lint`,
   `npx tsc -b` (via `npm run build`), `npm run build`.
8. Inspect the diff: `git status`, `git diff`, `git diff --check`.
9. Report results + remaining issues honestly; distinguish fresh test runs
   from historical claims.
10. Wait for user approval before commit/push. Never start the next phase
    unprompted. Never mark complete unless §10 criteria all hold.

## 5. Git Workflow

Existing branches (verified `git branch -a`): `main`, `development`,
`rony-dev` (yours), `mariya-dev`, `farhan-dev` (+ `origin/*` mirrors).

- `main` = stable release. `development` = integration.
  `rony-dev|mariya-dev|farhan-dev` = personal feature branches.
- Flow: feature branch → PR to `development` → integration/testing →
  approved release to `main`. **Never merge a feature branch directly to
  `main`.** Verify the target branch exists (`git branch -a`) before
  opening a PR.
- Never commit/push/merge/switch unless the user explicitly requests it.
- Before any commit: `git status`; `git diff`; `git diff --check`;
  targeted tests; confirm `.env`, credentials, `*.sqlite3`, `venv/`,
  `node_modules/`, `dist/` are untracked (check `.gitignore`).
- Commit messages follow repo style, e.g. `feat: …`, `fix: …` (see
  `git log --oneline -10`).

## 6. Backend Development Workflow

Paths: code in `D:/AI-Powered Smart Hospital/backend/`; settings
`config/settings/base.py` (+ `production.py`); apps in `apps/<domain>/`;
env names in `backend/.env.example` (values never printed).

Windows (PowerShell 5.1) commands — docs only, run only in a coding session:

```powershell
cd "D:/AI-Powered Smart Hospital/backend"
python -m venv venv; .\venv\Scripts\Activate.ps1   # create once
pip install -r requirements/development.txt        # only when deps change
python manage.py check                             # config validation
python manage.py makemigrations                    # generate (never --empty routinely)
python manage.py migrate --check                   # dry validation (no writes)
python manage.py migrate                           # apply (dev only, explicit approval)
python manage.py test apps.ai                      # targeted suite, e.g.
python manage.py test                              # full suite before phase-done
python manage.py seed_demo_data                    # dev demo accounts only
python manage.py runserver                         # local API :8000
```

API docs: `http://localhost:8000/api/` index,
`/api/schema|`docs|`redoc/` OpenAPI. Never recommend DB reset, fake
migrations, or data deletion as routine fixes. Never run migrations as part
of a docs-only task.

## 7. Frontend Development Workflow

Root: `D:/AI-Powered Smart Hospital/`; scripts verbatim from
`package.json` (do not invent others):

```powershell
cd "D:/AI-Powered Smart Hospital"
npm install        # only when deps change
npm run dev        # Vite :5173, VITE_API_BASE_URL → backend
npm run lint       # oxlint
npm run build      # tsc -b && vite build (typecheck + bundle)
npm run preview    # serve dist/ locally
```

Conventions: all HTTP via `src/lib/api/client.ts apiFetch`; lists via
`useApiList` + `DataPagination`, details via `useApiDetail`; snake→camel
in `adapters.ts`; states via `ApiState` (loading/error/empty/403);
write buttons gated by matching `hooks.ts` helper; reuse `ui/` + `shared/`
+ `design.md` token rules; icons `lucide-react` only; charts
`chart.js`/`react-chartjs-2` with text summaries.

## 8. Security and Clinical Safety

- JWT: access (short) + refresh (blacklist on logout); silent refresh in
  `client.ts`; demo fallback never touches real data paths.
- Permissions: compose `accounts/permissions.py` classes on every view;
  never inline role checks; frontend gating is cosmetic.
- Secrets: env only (names in §6/`architecture.md` §20); never log, print,
  commit, or paste values; `.env` stays untracked.
- Audit: `log_audit()` on all state-changing endpoints incl. AI analysis
  and review; `AuditLog` and ledger are append-only/read-only; verify audit
  rows in tests.
- Patient data: minimum-necessary exposure, staff-only reads, no bulk
  export without approval; scrub seeded demo data before any shared demo.
- AI safety (binding): decision support only. Every output carries
  disclaimer + confidence + provider; content immutable; only a physician
  (`IsDoctorOrAdmin`) moves `Pending Review → Reviewed` via explicit
  sign-off with note. **No autonomous diagnosis, prescribing, or treatment
  approval** — do not document or implement such behavior. No fabricated
  patient/lab data in tests or docs.

## 9. Complete Remaining Roadmap

Labels: **REQ-SPEC** (needs spec/user confirm — no spec file in repo),
**REQ-IMPL** (required to finish existing implementation),
**OPT** (optional improvement), **DECISION** (blocked on product call).
Overlaps resolved: Claims appears once (`BILL-01`); billing totals/reversal
work is `BILL-02` (distinct); AI review UI once (`AI-01`).

### Phase 11 — Billing completion

- `BILL-01` Claims scope decision — **DECISION**. Scope: decide in/out from
  spec (absent → ask user). Files: `src/pages/billing/ClaimsPage.tsx`,
  (planned) `backend/apps/billing/*claim*`. Acceptance: written decision in
  `PROJECT_STATUS.md`; if out, route honestly labeled/removed. Tests: none
  (docs decision). Status: todo. Next: ask user.
- `BILL-02` Billing hardening + re-test — **REQ-IMPL**. Scope: re-verify
  totals, partial/full/overpay guards, payment cancel→`REFUND` ledger,
  immutable ledger, role access; remove any remaining mock-backed billing.
  Files: `backend/apps/billing/{models,views,serializers,tests}/`,
  `src/pages/billing/*`, `src/lib/api/billing.ts`. Acceptance: full
  `test apps.billing` green + manual invoice→pay→reverse→ledger check.
  Tests: extend `test_billing.py`. Status: todo (pending BILL-01).

### Phase 12 — AI completion

- `AI-01` Activity review action + detail UI — **REQ-IMPL**. Files:
  `src/pages/ai/AIActivityPage.tsx`, `src/lib/api/ai.ts (reviewInsight)`.
  Acceptance: doctor can review from Activity; note/reviewer/timestamp shown;
  non-doctor gets 403 state. Tests: backend `test_ai` review cases re-run;
  manual role check. Status: **done**.
- `AI-02` Main-dashboard live AI section — **REQ-IMPL**. Files:
  `src/pages/DashboardPage.tsx`, `src/data/ai.ts` (remove dead mocks).
  Acceptance: no `MOCK_AI_ACTIVITY` on live paths; uses
  `listAIInsights/listNoShowPredictions`. Status: **done**.
- `AI-03` No-show/analytics persistence policy — **DECISION+REQ-IMPL**.
  Decide persist+audit vs read-only; implement or remove
  `AIModule.NOSHOW_PREDICTION/HEALTH_ANALYTICS` session writes. Files:
  `backend/apps/ai/views.py:293-424`. Acceptance: documented + tested.
- `AI-04` `COMPLETED` lifecycle — **REQ-IMPL**. Define transition or remove
  enum (`models.py:35` never written). Acceptance: code + test.
- `AI-05` Waiting-time + custom range honesty — **REQ-IMPL**. Files:
  `HealthAnalyticsPage.tsx`, `views.py:341-342`. Acceptance: real metric or
  explicit "—" with reason; custom range either works or is removed.
- `AI-06` Advisory data fidelity — **REQ-IMPL**. Autofill `currentMeds`
  from Rx history; use-or-drop `route`; record signer vs `request.user`.
  Files: `PrescriptionAdvisoryPage.tsx`, `providers.py:274-360`.
- `AI-07` Consistent provider/confidence/disclaimer — **REQ-IMPL**. Surface
  `provider` on all AI screens (stored but undisplayed today). Backend
  `AIInsightSerializer.provider` + frontend `BackendAIInsight.provider` added;
  shown on Activity detail card + dashboard stat hints. Status: **done**.
- `AI-08` Sessions UI or endpoint removal — **REQ-IMPL**. Wire
  `listAISessions` into UI or remove router; document choice.
- `AI-09` `AI_PROVIDER` configurability — **REQ-IMPL**. Document setting,
  keep safe local fallback. Files: `providers.py:363-370`,
  `backend/.env.example`, settings. `AI_PROVIDER=local` documented in
  `.env.example`; unknown/misconfigured names fall back to local. Status: **done**.
- `AI-10` Real LLM provider — **OPT + DECISION** (only if approved, with
  secrets, tests, fallback; never default-on without approval).
- `AI-11` Backend test expansion — **REQ-IMPL**. Provider selection,
  analytics/noshow/sessions permissions, review edge cases in `test_ai.py`.
- `AI-12` Frontend tests — **OPT**. Only if practical without new heavy
  deps; at minimum manual role-matrix checklist.

### Phase 6 — Automation completion

- `AUTO-01` Scope + transport decision — **DECISION**. Persisted
  reminders/alerts/queue? SSE/polling vs Channels? Email/SMS in scope?
  Files: `backend/apps/automation/*` (new), `src/pages/automation/*`.
- `AUTO-02` Backend persistence + permissions + audit — **REQ-IMPL**
  (pending AUTO-01). Models/migrations/views/urls/tests for the agreed
  entities.
- `AUTO-03` Realtime wiring + frontend integration — **REQ-IMPL** (pending
  AUTO-02). One transport; replace `setInterval`/`SIM_TIME` simulations;
  honest loading/offline states.
- `AUTO-04` Alert rules (low-stock/expiry, lab-ready, reminders) — **REQ-IMPL**
  (pending AUTO-02). Tests for each rule.

### Phase 1 — RBAC UI completion

- `RBAC-01` Route-level enforcement — **REQ-IMPL**. Apply `RequireRole` to
  sensitive routes (billing, AI review, user admin), keep mock reachability
  where backend is absent. Files: `routes.tsx`, `RequireAuth.tsx`,
  `navigation.ts` (populate `roles`). Acceptance: role-matrix manual test.
- `RBAC-02` Role-aware navigation + cleanup — **REQ-IMPL**. Filter nav by
  role; remove/fix "UI-only" badges once enforced.

### Phase 2 — Patient/Doctor/Appointment integration

- `PAT-01` API clients + adapters — **REQ-IMPL**. Add
  `src/lib/api/{patients,doctors,appointments}.ts` + adapter fns + hook
  wiring (mirrors Phase 10 pattern). No backend changes expected.
- `PAT-02` Page wiring — **REQ-IMPL** (pending PAT-01). Connect
  list/detail/create/update + lookups; add `ApiState`/pagination; preserve
  UI + permission rules. Tests: backend suites re-run + manual CRUD matrix.

### Final integration and security

- `FINAL-01` End-to-end clinical flow — **REQ-IMPL** (pending
  BILL-02, PAT-02, AI-01). patient→appointment→Rx→lab→pharmacy→billing with
  real data; record evidence.
- `FINAL-02` AI + automation flow checks — **REQ-IMPL** (pending AI-*, AUTO-*).
- `FINAL-03` RBAC/security + audit verification — **REQ-IMPL**. Role matrix,
  401/403 paths, audit-row assertions, query review (N+1), secrets/dependency
  hygiene (`pip freeze` review, no lockfile churn without cause).
- `FINAL-04` Responsive + accessibility pass — **REQ-IMPL** per `design.md`
  §13–14 gaps.
- `FINAL-05` Docs + release — **REQ-IMPL**. README rewrite, setup/env/API/
  role guides, safety notes, screenshots, release checklist, PR
  `rony-dev → development`.

### Recommended execution order

1. `BILL-01` (one decision unblocks Phase 11 done-state) →
2. `AI-01, AI-02` (visible Phase 12 value, no architecture risk) →
3. `PAT-01, PAT-02` then `RBAC-01, RBAC-02` (integration before enforcement
   so gates test real data) →
4. `AI-03…AI-09, AI-11` (remaining rule-engine correctness) →
5. `BILL-02`, `FINAL-01…04` (hardening + E2E) →
6. `AUTO-01…04` (largest scope, needs decisions; last) →
7. `AI-10`, `AI-12`, `FINAL-05` (optional/approval-gated + release).

## 10. Phase Completion Criteria

All must hold before marking any phase complete:

- [ ] All scoped functionality implemented (no TODO stubs on live paths).
- [ ] Backend/frontend integration complete where applicable (no mock
      backing for live modules; honest labels otherwise).
- [ ] Authorization verified (role matrix incl. 403 paths).
- [ ] Audit behavior verified where required (rows asserted in tests).
- [ ] Tests passing (fresh run recorded: command + result + date).
- [ ] Migrations clean (`check` + `migrate --check` green; no fakes/resets).
- [ ] Frontend `npm run lint`, `npx tsc -b`, `npm run build` green (if UI changed).
- [ ] API schema/docs verified (`/api/schema|docs` load; new endpoints listed).
- [ ] No unplanned regressions (neighboring suites green).
- [ ] Documentation updated (`workflow.md` status + `PROJECT_STATUS.md`).
- [ ] Honest final report to user (fresh vs historical results labeled).
- [ ] No commit/push without explicit permission.

## 11. Session Handoff Template

Every coding session ends with this report (paste + fill):

```text
Phase / Task ID:
Branch:
Files created/modified (with paths):
Implementation summary:
Tests executed (command + result + date; mark historical if not run):
Known issues:
Remaining tasks (IDs):
Git status (clean/dirty + ahead/behind):
Committed/pushed? (yes/no + hashes/URLs if yes):
Docs updated? (workflow.md / PROJECT_STATUS.md / design.md / architecture.md):
Next recommended task + why:
```

The next session must read `workflow.md`, then `architecture.md` and
`design.md`, then verify `git status`/`git log -5` before implementing.
Update `workflow.md` §3 after meaningful changes so it stays accurate.
