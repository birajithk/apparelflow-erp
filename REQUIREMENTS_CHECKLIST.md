# ApparelFlow ERP — Assessment Requirements Checklist

This checklist tracks final compliance with the Webtezza Software Engineering Intern practical assessment for the **Production Batch Verification & Sewing Queue Gate**.

Status legend:

- ✅ PASS — implemented and verified
- 🟡 FINAL CHECK — implemented, but requires final live/deployment verification
- 🔴 TODO — still required before submission
- ℹ️ NOTE — implementation/detail clarification

---

## 1. Critical Server-Enforced Production Gate

- ✅ A cutting batch cannot enter the Sewing Queue without verification.
- ✅ Verification is performed component-by-component.
- ✅ Only an authenticated `cutting_verifier` can approve or reject a batch.
- ✅ Any RED / shortage component blocks approval in the UI and backend.
- ✅ Missing or uncounted components block approval.
- ✅ Unverified, rejected, and pending batches cannot appear in the Sewing Queue.
- ✅ Starting sewing is independently protected by backend eligibility checks.

## 2. Authentication and RBAC

### Cutting Supervisor — `cutting_supervisor`
- ✅ Can create cutting batches and record fabric usage.
- ✅ Can handle rejected batches through re-cut.
- ✅ Cannot verify batches.
- ✅ Cannot access Sewing Queue functions.

### Cutting Verifier — `cutting_verifier`
- ✅ Can record component counts.
- ✅ Sees real-time GREEN / YELLOW / RED status.
- ✅ Can approve eligible batches or reject with a mandatory reason.
- ✅ Cannot create cutting orders.
- ✅ Cannot access Sewing Queue functions.

### Sewing Supervisor — `sewing_supervisor`
- ✅ Can access only VERIFIED batches.
- ✅ Can inspect verification counts and verifier attribution.
- ✅ Can start sewing assembly.
- ✅ Cannot see pending, rejected, or unverified batches.

### Authentication Security
- ✅ Real server-side authentication is implemented.
- ✅ Server-side database sessions are used.
- ✅ Protected endpoints enforce roles server-side.
- ✅ Verifier and Sewing Supervisor identity are derived from authenticated server context.

## 3. Manufacturing State Machine

```text
CUTTING_IN_PROGRESS
        ↓
PENDING_VERIFICATION
        ↓
COMPONENT COUNT QC
     ↙       ↘
REJECTED    VERIFIED
    ↓           ↓
 RE-CUT     SEWING QUEUE
                ↓
           IN_SEWING
```

- ✅ `CUTTING_IN_PROGRESS` exists in the database state model.
- ✅ Submission moves a batch to `PENDING_VERIFICATION`.
- ✅ Rejection moves a batch to `REJECTED`.
- ✅ Approval moves a batch to `VERIFIED`.
- ✅ Starting assembly moves a batch to `IN_SEWING`.
- ✅ Re-cut creates a fresh verification revision while preserving prior audit history.

## 4. Immutable Verification Audit Trail

- ✅ Authenticated verifier ID is stored.
- ✅ Server/database decision timestamp is stored.
- ✅ Order revision is stored.
- ✅ Verification decision is stored.
- ✅ Rejection reason is stored when rejected.
- ✅ Actual fabric usage snapshot is stored.
- ✅ Fabric wastage percentage is stored.
- ✅ Expected and actual component quantities are stored.
- ✅ GREEN / YELLOW / RED status is stored.
- ✅ Component variance is stored as `actual_qty - expected_qty`.
- ✅ Verification logs and snapshot items are protected from update/delete.

## 5. Seeded Production Recipes

### REC-BL01 — Casual Blouse
- ✅ Category: `Blouse`
- ✅ Standard fabric: `1.8` yards / piece
- ✅ Wastage cap: `5.0%`
- ✅ Front Body Panel — 1
- ✅ Back Body Panel — 1
- ✅ Sleeves (Left & Right) — 2
- ✅ Collar & Stand — 1
- ✅ Sleeve Cuffs — 2

### REC-CT02 — Crop Top
- ✅ Category: `Crop Top`
- ✅ Standard fabric: `1.1` yards / piece
- ✅ Wastage cap: `8.0%`
- ✅ Front Chest Panel — 1
- ✅ Back Support Panel — 1
- ✅ Neck Binding Strip — 1
- ✅ Hem Elastic Casing — 1
- ✅ Side Strap Accents — 2

## 6. Cutting Supervisor Order Engine

- ✅ Required inputs: Recipe ID, Target Batch Quantity, Fabric Roll ID, Actual Fabric Used.
- ✅ Order creation uses a modal.
- ✅ Expected components are calculated dynamically as `target quantity × pieces per garment`.
- ✅ Expected fabric usage and fabric variance are calculated.
- ✅ Floating-point equality is normalized to prevent `-0.00%`.
- ✅ Wastage-cap warning is displayed.
- ✅ Submission persists the order and places it into `PENDING_VERIFICATION`.

## 7. Verification Terminal

- ✅ GREEN: `Actual == Expected`.
- ✅ YELLOW: `Actual > Expected` and may proceed.
- ✅ RED: `Actual < Expected` and blocks approval.
- ✅ Count previews update immediately.
- ✅ Draft count state is separate from server-confirmed state.
- ✅ Invalid, unsaved, or actively saving counts cannot enable approval.
- ✅ Failed saves return to the last server-confirmed value.

## 8. Rejection and Re-Cut Workflow

- ✅ Rejection reason is mandatory in UI and backend.
- ✅ Rejected batches return to the Cutting Supervisor.
- ✅ Re-cut requires positive additional fabric usage and a reason.
- ✅ Original and re-cut fabric history is preserved.
- ✅ Re-cut increments revision and resets verification counts.
- ✅ Corrected batches return to `PENDING_VERIFICATION`.

## 9. Sewing Queue and Assembly Gate

- ✅ Sewing Queue endpoint is restricted to `sewing_supervisor`.
- ✅ Database query explicitly uses `WHERE status = 'VERIFIED'`.
- ✅ URL/query manipulation cannot expose unapproved batches.
- ✅ Sewing start verifies current VERIFIED status, approved audit, current revision, and valid snapshot counts.
- ✅ Successful sewing start stores authenticated Sewing Supervisor identity and timestamp.
- ✅ Successful start transitions the batch to `IN_SEWING`.

## 10. Fabric Wastage Analytics

```text
Wastage % =
((Actual Fabric Used - Expected Fabric) / Expected Fabric) × 100
```

- ✅ Wastage is calculated by the backend.
- ✅ Wastage is stored with the verification audit.
- ✅ Expected fabric is recipe standard × target quantity.
- ✅ Genuine positive/negative differences are preserved.

## 11. Relational Database Schema

Required entities:
- ✅ `users`
- ✅ `recipes`
- ✅ `recipe_components`
- ✅ `cutting_orders`
- ✅ `verification_items`
- ✅ `verification_logs`

Additional implementation entities:
- ✅ `sessions`
- ✅ `cutting_fabric_entries`
- ✅ `verification_log_items`

Notable required fields are present, including:
- ✅ `recipe_components.image_url`
- ✅ cutting order timestamps/status/creator fields
- ✅ verification item expected/actual/status fields
- ✅ verification log verifier/decision/rejection/wastage/timestamp fields

## 12. Server-Side Tamper Protection

- ✅ Non-verifier verification attempts return `403`.
- ✅ RED, missing, or uncounted approval attempts return `422`.
- ✅ Blank rejection reason returns `422`.
- ✅ Authenticated user identity is used instead of client-supplied identity.
- ✅ Sewing eligibility is enforced in SQL and revalidated at sewing start.

## 13. Defensive Input Validation

### Target / Component Counts
- ✅ Reject negative values.
- ✅ Reject decimals.
- ✅ Reject nonnumeric/malformed values.
- ✅ Reject required empty values.
- ✅ Show immediate inline errors.

### Fabric Measurements
ℹ️ Positive decimal fabric values are intentionally accepted because fabric usage is measured in yards and recipes use decimal values such as `1.8` and `1.1`.

- ✅ Reject negative, zero-when-positive-required, nonnumeric, and empty fabric values.
- ✅ Accept positive decimal fabric values.
- ✅ Show immediate inline errors.

### Text Inputs
- ✅ Fabric Roll ID rejects empty/whitespace-only values.
- ✅ Rejection reason rejects empty/whitespace-only values.
- ✅ Re-cut reason rejects empty/whitespace-only values.

## 14. UI, Contrast and Accessibility

- ✅ Dark input text on light input backgrounds.
- ✅ Legible dropdown text and visible focus states.
- ✅ Disabled states remain legible.
- ✅ Inline validation errors are visible.
- ✅ Traffic-light states include text labels, not color only.
- ✅ Native dialog behavior is used for order creation.
- ✅ Final contrast/responsive audit passed on the deployed production URL.

## 15. Persistence

- ✅ PostgreSQL is used.
- ✅ Neon provides persistent cloud database storage.
- ✅ Orders, counts, status transitions, audit logs, re-cut history, and sewing state survive refresh.

## 16. Automated Testing

```bash
npm test
```

Current result:

```text
Test Files: 8 passed
Tests:      37 passed
```

Mandatory scenarios:
- ✅ All GREEN components can be approved by an authenticated verifier.
- ✅ At least one RED component blocks approval.
- ✅ Rejecting without a reason fails.
- ✅ Non-verifier verification attempt returns `403`.
- ✅ Unapproved batches cannot appear in the Sewing Queue database query.

Additional coverage includes YELLOW approval, missing/uncounted blocking, sewing-start safeguards, malformed requests, identity spoof prevention, re-cut validation/RBAC, count parsing/status logic, and floating-point variance regression.

Quality commands:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

- ✅ Test suite passes.
- ✅ TypeScript passes.
- ✅ ESLint passes.
- ✅ Production build passes.
- ✅ `git diff --check` passes.

## 17. Dependency Security

- ✅ `npm audit --omit=dev` reports `0 vulnerabilities`.
- 🟡 Five high-severity findings remain in a development-only ESLint/glob dependency chain.
- ✅ Findings are documented in `docs/SECURITY_NOTES.md`.
- ✅ `npm audit fix --force` was not used because it proposes a breaking downgrade.

## 18. AI Usage and Engineering Judgment

- ✅ `AI_OPTIMIZATION_REPORT.md` exists at repository root.
- ✅ Documents tools/prompting, flawed AI output, human refactoring, and defensive architecture.
- ✅ Real documented issues include PostgreSQL NULL/CHECK weakness, inline-form-vs-modal mismatch, floating-point `-0.00%`, and verifier state synchronization.

## 19. Documentation

### README
- ✅ Project overview.
- ✅ Architecture summary.
- ✅ Database/schema documentation.
- ✅ Demo credentials for all three roles.
- ✅ Security design summary.
- ✅ Local development instructions.
- ✅ Screenshots.

Still required:
- ✅ README Sewing Queue status updated to `Implemented`.
- ✅ README automated test status updated to `37 passing tests`.
- ✅ Outdated Sewing Queue progress wording removed.
- ✅ Outdated automated-test planning wording removed.
- ℹ️ Sewing Supervisor screenshot is optional and is not required by the assessment.
- ✅ Public production URL added to README.

### Architecture Documentation
- ✅ Architecture summary exists in README.
- ✅ Detailed architecture documentation exists at `docs/ARCHITECTURE.md`.
- ✅ README links to `docs/ARCHITECTURE.md` using the correct case-sensitive path.

### Security Notes
- ✅ `docs/SECURITY_NOTES.md` documents the dependency audit.

## 20. Git and Repository Quality

- ✅ Public GitHub repository exists.
- ✅ Development uses incremental/atomic commits.
- ✅ Automated testing, validation hardening, and AI report have focused commits.
- ✅ Main is synchronized with origin.
- ✅ Unnecessary `AGENTS.md` and `CLAUDE.md` development-agent files removed.

## 21. Mandatory Submission Requirements

| Requirement | Status |
|---|---|
| Public GitHub repository | ✅ PASS |
| Atomic / iterative Git history | ✅ PASS |
| `AI_OPTIMIZATION_REPORT.md` | ✅ PASS |
| README architecture summary | ✅ PASS |
| README schema documentation | ✅ PASS |
| Demo credentials for all 3 roles | ✅ PASS |
| Detailed architecture document | ✅ PASS — `docs/ARCHITECTURE.md` |
| Automated tests via `npm test` | ✅ PASS — 37 tests |
| Public cloud deployment | ✅ PASS — Vercel |
| Public live URL | ✅ PASS — https://apparelflow-erp-five.vercel.app/ |
| Final live contrast audit | ✅ PASS |
| Final evaluator workflow smoke test | ✅ PASS |

## 22. Final Evaluator 5-Minute Audit

Before submission, perform these checks against the deployed URL:

- ✅ Contrast: deployed inputs/dropdowns were checked for readable text, focus, and disabled states.
- ✅ RBAC: all three demo roles were verified against their permitted functions.
- ✅ Hard stop: shortage produced RED and prevented approval.
- ✅ Valid handoff: create → GREEN counts → approve → Sewing Queue → refresh persistence → start sewing → `IN_SEWING` passed.
- ✅ Repository: automated tests pass, AI report exists, and the production URL is documented.

# Final Status

- ✅ Core assessment workflow implemented.
- ✅ Server-side gatekeeper implemented and tested.
- ✅ RBAC implemented and tested.
- ✅ Persistent relational database implemented.
- ✅ 37 automated tests passing.
- ✅ AI optimization report complete.
- ✅ Detailed architecture documentation present at `docs/ARCHITECTURE.md`.

## Final Submission Readiness

✅ No known assessment-blocking items remain.

- Production application is deployed and publicly accessible.
- All three demo accounts authenticate successfully.
- Evaluator-style RBAC, shortage hard-stop, persistence, approval, sewing handoff, and assembly-start checks passed on production.
- Automated tests, TypeScript, lint, production build, and production dependency audit pass.
- README, architecture documentation, security notes, requirements checklist, and AI optimization report are complete.