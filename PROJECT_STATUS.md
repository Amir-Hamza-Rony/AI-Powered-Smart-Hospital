# Project Status — AI-Powered Smart Hospital

> Concise dashboard. Details and process rules live in `workflow.md`.
> Updated: 2026-10-28. Test results re-executed in this session.

- **Branch:** `rony-dev` (ahead of `origin/rony-dev`, uncommitted)
- **Last verified commit:** `d81e243` (2026-10-04)
  `feat:implement AI-Powered Clinical & Operational Intelligence`
- **Worktree:** dirty — all code-ready Phase 12 items implemented but **not committed**.
  See `git status` for the file list.
- **Current phase:** Phase 12 complete (code-ready). Remaining: `AUTO-01…04` and `BILL-01`
  (both blocked on product decisions, not code).

## Completed (verified in code)

Phases 3, 5 (as live), 7, 8 (backend), 9, 10. Phase 12: `AI-01`…`AI-09`, `AI-11`,
`PAT-01`, `PAT-02`, `RBAC-01`, `RBAC-02`. See `workflow.md` §3 matrix.

## Incomplete

- Phase 4/11: Claims backend + integration (`BILL-01/02`) — `BILL-01` needs product
  scope decision before any code.
- Phase 6: automation backend + realtime (`AUTO-01`…`04`) — `AUTO-01` needs transport
  + scope + email/SMS decision before any code.

## Current blockers / decisions

1. Claims in or out of scope (no spec file in repo — ask user). Blocks `BILL-01`/`BILL-02`.
2. LLM provider approved or not (default: local rules). Blocks optional `AI-10`.
3. Realtime transport + email/SMS scope for automation. Blocks `AUTO-01…04`.

## Next task

`BILL-01` — Claims scope decision. Why: single product answer that fixes the
definition of done for Phase 11. All code-ready work is finished; nothing
more can be implemented without this decision.

## Latest test evidence (re-executed this session)

- Backend: 25/25 `apps.ai` tests pass (incl. 8 new `AI-04`/`AI-11` cases).
- Frontend: `tsc -b` clean, `oxlint` clean, `vite build` green.
- Local dev server confirmed running at `http://127.0.0.1:8000/` (401s on
  unauthenticated calls are expected; auth required).
