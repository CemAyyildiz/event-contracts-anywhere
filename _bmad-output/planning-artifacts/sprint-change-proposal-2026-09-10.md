# Sprint Change Proposal — Event Contracts Anywhere

**Date:** 2026-09-10  
**Project:** event-contracts-anywhere  
**Requested by:** Cem  
**Scope:** Major (MVP redefined) · executed as doc alignment, no code rollback  
**Trigger:** Product drifted from PRD v0.1 (zero-setup sponsored burner + destination TMA) back to the original distribution thesis (host-surface slip). Planning artifacts were stale; BMAD ceremony was skipped after PRD/architecture.

---

## 1. Issue Summary

PRD v0.1 promised: embeddable Up/Down widget, zero signup, sponsored first bet, host payout panel, Telegram Mini App as a surface.

What shipped: session EOA the **user funds**, host snippet + chat URL, landing that explains host vs reader, TMA as URL chrome not a bot destination. No sponsor app, no indexer, no dashboard, no RouterAttribution.

Those two products cannot share one MVP. `docs/product-lock.md` overrode the PRD in chat; this proposal makes the PRD match the lock.

**Evidence:** live `/home` snippet + `/demo` embed; widget `sessionWallet.ts`; no `apps/sponsor|indexer|dashboard`; no `packages/contracts`.

---

## 2. Impact Analysis

### Epics (from PRD v0.1 — never sharded)

| Epic | Verdict |
|------|---------|
| 1 Trade core & spike | **Keep / done** (1.5 contracts spike → backlog) |
| 2 Embeddable widget | **Keep / mostly done** — demo is embed page, not news-hero |
| 3 Zero-setup onboarding | **Redefine** — session wallet + self-fund; drop sponsor as MVP |
| 4 Host attribution & panel | **Split** — `?host=` + snippet is MVP; payout/indexer/dashboard → backlog |
| 5 Stretch | **Keep as backlog** — video/BUIDL still required to submit |

### Artifact conflicts

- **PRD:** FR4/FR8/FR9/NFR3 and Epic 3.2–3.3 contradict shipped UX.
- **Architecture:** sponsor-first sequence and `apps/*` layout are not MVP.
- **UX:** dark “no modal” one-tap is wrong; fund screen exists; newsprint slip UI.
- **Epics/stories files:** missing. Status lives in `docs/sprint-status.yaml` after this change.
- **No rollback** of widget/session-wallet code.

### Technical

No production rollback. Sponsor/router remain unbuilt, listed as post-MVP.

---

## 3. Recommended Approach

**Option 3 — MVP review** (hybrid: keep Epic 1–2 work).

Rationale: deadline 2026-09-11 21:00. Rebuilding sponsor + panel is not the thesis. Distribution (host drop-in) is. User-funded session wallet is an accepted constraint (custody/PnL on their address).

**Effort:** Low (docs). **Risk:** Low. **Timeline:** none for code; submit still needs demo video + BUIDL.

**Not chosen:** Direct story edits only (PRD still lies). Rollback (would delete the lock).

---

## 4. Detailed Change Proposals

### PRD

Rewrite `docs/prd.md` → v0.2: embed-first goals; FR set matches ship; sponsor/payout/router marked post-MVP; UX = slip + fund + trade; epics MVP vs backlog.

### Architecture

Banner + paradigm: no sponsor in MVP path; session wallet self-fund; `apps/*` and contracts = later.

### Product lock

Pointer to PRD v0.2 as source of truth.

### Sprint status

New `docs/sprint-status.yaml` (planning folder copy under `_bmad-output` as well).

---

## 5. Implementation Handoff

**Classification:** Major replan of MVP, **minor** implementation (documentation only).

**Dev (this pass):** Apply the edits in this proposal.

**Success:** PRD, architecture intro, product-lock, and sprint-status describe the same product as `/home` + `/demo` + widget.

**Submit still open:** demo video, DoraHacks BUIDL (Epic 5.4).

---

## Checklist (correct-course)

- [x] 1.1–1.3 Trigger, problem, evidence
- [x] 2.1–2.5 Epic impact (from PRD epic list; no shard)
- [x] 3.1–3.4 Artifact conflicts
- [x] 4.1 Direct adjustment — not sufficient
- [x] 4.2 Rollback — not viable
- [x] 4.3 MVP review — selected
- [x] 5.1–5.5 Proposal components
- [N/A] 6.3 Second verbal approval — Cem chose “correct course / align PRD” (option 1) as the approval to implement
- [x] 6.4 sprint-status.yaml created
