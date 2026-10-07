# AI Optimization Report

## ApparelFlow ERP — Production Batch Verification & Sewing Queue Gate

This project was developed with AI-assisted engineering while keeping
human review, requirement verification, testing, and final technical
decisions under developer control.

The AI was used as an implementation assistant rather than as an
unreviewed code generator. Generated suggestions were checked against
the assessment requirements, tested in the browser and API, reviewed
against PostgreSQL behavior, and corrected when implementation flaws
were discovered.

---

## 1. AI Tools and Development Approach

The primary AI-assisted workflow used ChatGPT for:

- breaking the assessment into implementation milestones;
- generating initial TypeScript, SQL, React, and API structures;
- reviewing role-based access-control boundaries;
- suggesting PostgreSQL transaction and audit approaches;
- creating automated test cases;
- reviewing validation and defensive input handling;
- identifying requirement mismatches during final compliance review;
- documenting architecture and implementation decisions.

The project was not implemented through a single large AI prompt.

Instead, work was divided into small, testable units such as:

- authentication and role enforcement;
- recipe and component persistence;
- cutting order creation;
- verification count entry;
- approval and rejection rules;
- re-cut handling;
- sewing queue filtering;
- sewing assembly start;
- automated workflow tests;
- final compliance and security review.

Each unit was tested before the next one was added.

---

## 2. Prompting Strategy

The most effective prompting strategy was to give the AI a narrow task
with explicit constraints and then verify the result before continuing.

Examples of constraints repeatedly supplied to the AI included:

- follow the assessment specification exactly;
- do not allow a batch into sewing without verification;
- keep verifier identity and timestamps server-derived;
- enforce role restrictions in the API, not only in the UI;
- reject approval when any component count is RED, missing, or uncounted;
- use PostgreSQL with the `pg` driver and SQL migrations;
- keep verification audit records immutable;
- use atomic Git commits;
- do not introduce additional frameworks or an ORM;
- preserve exact recipe and component data;
- test security-sensitive behavior before committing.

This reduced the risk of allowing AI-generated code to silently expand
the project scope or weaken the production gate.

---

## 3. Real AI Flaw #1 — Nullable PostgreSQL CHECK Constraint

### Problem

An early AI-assisted database migration used a CHECK constraint whose
logic did not fully account for PostgreSQL NULL semantics.

PostgreSQL CHECK expressions pass when the expression evaluates to
TRUE or UNKNOWN. Therefore, a constraint that appears correct under
ordinary boolean reasoning can still allow an invalid state when a
nullable column causes the expression to evaluate to UNKNOWN.

This created a defensive-integrity weakness in the original migration.

### Detection

The schema was reviewed specifically for invalid state combinations
rather than assuming the generated CHECK expression was sufficient.

The NULL behavior was identified as unsafe.

### Human Refactoring

A follow-up migration (`002`) hardened the constraint so nullable
values could not bypass the intended state rule.

The database therefore became responsible for rejecting invalid state
combinations even if application-level validation failed.

### Lesson

AI-generated SQL must be reviewed using the database engine's actual
three-valued logic rather than ordinary two-valued boolean assumptions.

Database constraints are security and integrity boundaries, not merely
documentation.

---

## 4. Real AI Flaw #2 — Order Creation Implemented Inline Instead of as a Modal

### Problem

The first AI-assisted Cutting Supervisor interface implemented the
production order form directly inside the page.

The workflow itself worked, but the assessment explicitly required the
Day 2 order-creation workflow to use a modal.

This was therefore a requirement-compliance failure even though the
feature was functionally correct.

### Detection

During the final requirement-by-requirement review, the implemented UI
was compared again with the assessment specification.

The mismatch was identified before final delivery.

### Human Refactoring

The existing production order form was preserved and wrapped in an
accessible modal dialog.

This avoided rewriting already-tested business logic while satisfying
the specified workflow.

The form retained:

- recipe selection;
- target batch quantity;
- fabric roll ID;
- actual fabric usage;
- expected component multiplier calculations;
- wastage comparison;
- submission to verification.

This correction was committed in:

`31b3c19 fix(cutting): add order modal and immediate input validation`

### Lesson

Functional equivalence is not always assessment equivalence.

AI-generated solutions must still be checked against explicit UX and
workflow requirements, even when their underlying business behavior is
correct.

---

## 5. Real AI Flaw #3 — Floating-Point Negative Zero in Fabric Variance

### Problem

The original fabric variance calculation directly subtracted
JavaScript floating-point values.

For decimal recipe values, mathematically equal values could still
produce a tiny negative floating-point result.

For example, a standard value derived from a decimal multiplier could
internally differ slightly from a user-entered decimal representing the
same mathematical quantity.

The UI then displayed:

`-0.00%`

Because the unrounded internal value was negative, the interface also
selected the negative/yellow variance state even though actual fabric
usage was effectively equal to expected usage.

### Detection

The issue was discovered during manual browser testing of a case where
actual fabric usage exactly matched expected fabric usage.

The displayed negative zero made the numerical problem visible.

### Human Refactoring

A normalization helper was introduced to treat insignificant
floating-point representation noise as exactly zero while preserving
real shortages and excess values.

Regression tests were added for:

- mathematically equal decimal values;
- genuine negative variance;
- genuine positive variance.

The project therefore no longer relies on formatted output alone to
hide floating-point error.

### Lesson

AI-generated numeric logic should not assume decimal business values
can be compared safely using raw binary floating-point subtraction.

Displayed rounding and business-state classification must be based on
the same normalized calculation.

---

## 6. Real AI Flaw #4 — Verifier UI Mixed Draft State with Persisted State

### Problem

The first verifier component-count implementation updated the component
object immediately when the verifier typed a new count.

The same component object was also treated as the last successfully
saved value.

When the input lost focus, the application sent the new value to the
server.

This created a synchronization flaw:

1. the UI changed the component value;
2. the save request was sent;
3. if the request failed, rollback logic could read the already-mutated
   component value;
4. the interface could therefore restore the unsaved value instead of
   the last server-confirmed value.

It also blurred the distinction between a live preview and a persisted
verification count.

### Detection

The problem was found during a state-management audit after the main
workflow was already functional.

The code was reviewed specifically for failure behavior, not only the
successful request path.

### Human Refactoring

Verifier input state was separated into:

- server-confirmed component state;
- local count drafts;
- local validation errors;
- saving state.

The traffic-light status can still preview immediately, but approval is
blocked while a component has:

- an invalid count;
- an unsaved draft;
- an active save request.

Only a successfully returned API response updates the persisted-looking
component state.

If the save fails, the draft is discarded and the field returns to the
last server-confirmed value.

Automated count-validation tests were also added.

This change was committed in:

`9fa59fc fix(validation): harden verifier and recut inputs`

### Lesson

Optimistic UI updates are not automatically safe for workflow gates.

For a production authorization checkpoint, the UI should distinguish
between a user's draft value and a value confirmed by the backend.

---

## 7. Human Refactoring and Defensive Architecture

Several architectural choices were deliberately kept outside the
client-side trust boundary.

### Server-derived identity

Verifier and sewing-supervisor identity are derived from the
authenticated server session.

The client cannot provide a trusted verifier or supervisor ID.

This prevents request-body identity spoofing.

### Server-derived timestamps

Verification and sewing timestamps are generated by the server and
database workflow.

The browser is not trusted to provide authoritative audit timestamps.

### Role enforcement

Role restrictions exist at the API boundary.

Examples include:

- a non-verifier cannot approve a cutting batch;
- a Cutting Supervisor cannot perform verifier actions;
- only the Sewing Supervisor can start sewing assembly.

UI visibility is treated as convenience, not authorization.

### Verification approval gate

Approval requires all required components to have counts.

A component shortage produces RED status.

Any RED count blocks approval.

Missing or uncounted components also block approval.

These rules are enforced by the backend even if a client attempts to
bypass the disabled UI button.

### Sewing queue gate

The sewing queue database query explicitly filters cutting orders using:

`WHERE status = 'VERIFIED'`

The queue does not rely on a URL parameter or client-side filtering to
decide whether an order is eligible.

Starting sewing also performs backend verification before transitioning
the order to `IN_SEWING`.

### Immutable verification history

Verification decisions are preserved as audit records containing the
decision, verifier attribution, timestamp, component snapshots,
variances, and fabric wastage information.

Re-cutting creates a new revision instead of overwriting an earlier
verification decision.

This preserves the history of rejected and corrected batches.

---

## 8. Defensive Validation

Validation exists at multiple layers.

### Cutting order creation

The UI rejects:

- empty recipe selection;
- non-positive garment quantities;
- decimal garment quantities;
- nonnumeric garment quantities;
- empty fabric roll IDs;
- non-positive or nonnumeric fabric usage.

Fabric usage intentionally accepts positive decimal measurements.

### Verification counts

Component counts accept only non-negative whole numbers.

Examples:

- `0` is valid and produces RED when expected is greater than zero;
- exact expected quantity produces GREEN;
- excess quantity produces YELLOW;
- `-1`, `2.5`, `abc`, and scientific-notation input are rejected.

### Rejection

Rejecting a verification requires a non-empty reason.

The backend also enforces this rule.

### Re-cut

A re-cut requires:

- a positive additional fabric quantity;
- a non-empty re-cut reason.

The original verification audit is preserved.

---

## 9. Automated Testing

Vitest was added after the core workflow stabilized.

The final automated suite currently contains 37 tests across eight test
files.

The tests cover the mandatory production-gate scenarios and additional
defensive cases.

Important coverage includes:

- all GREEN components can be approved;
- any RED component blocks approval;
- rejection without a reason fails;
- non-verifiers receive HTTP 403 when attempting approval;
- missing or uncounted components block approval;
- YELLOW excess counts may still be approved;
- the sewing queue query requires VERIFIED status;
- pending orders cannot start sewing;
- orders without valid approval audit cannot start sewing;
- authenticated sewing-supervisor identity is used instead of a
  client-supplied identity;
- invalid re-cut input is rejected;
- verification count parsing rejects invalid numeric formats;
- floating-point fabric equality normalizes to zero.

The test suite is executed with:

`npm test`

The project is also checked with:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `git diff --check`

---

## 10. Dependency Security Review

The production dependency audit reports:

`0 vulnerabilities`

The complete dependency audit reports five high-severity findings in a
development-only lint dependency chain:

`eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces`

The affected package is not exposed through an application endpoint.

`npm audit fix --force` currently proposes a breaking downgrade of the
Next.js ESLint configuration, so that change was deliberately not
applied.

The issue is documented separately in:

`docs/SECURITY_NOTES.md`

This is treated as an outstanding development-tooling dependency issue,
not as a silently resolved vulnerability.

---

## 11. What AI Improved

AI assistance was particularly useful for:

- quickly generating repetitive API and test scaffolding;
- identifying edge cases to test;
- translating workflow requirements into backend guards;
- reviewing SQL queries for security-sensitive filters;
- generating first-pass validation logic;
- accelerating documentation;
- maintaining a consistent incremental implementation plan.

This reduced development time while keeping each change small enough to
review.

---

## 12. Where Human Review Was Essential

The largest improvements came from reviewing AI output rather than
accepting it as final.

Human review caught:

- PostgreSQL NULL constraint semantics;
- an explicit modal requirement missed by the generated UI;
- JavaScript floating-point equality behavior;
- a verifier optimistic-state synchronization flaw;
- immediate-validation gaps;
- dependency-audit findings that should not be "fixed" using a forced
  breaking downgrade.

These cases demonstrate why AI output was treated as draft engineering
work rather than authoritative implementation.

---

## 13. Final Development Principle

The project followed one defensive rule throughout the final
implementation:

> The browser may help the user understand the workflow, but it is not
> trusted to authorize the workflow.

Critical decisions such as role authorization, verification approval,
audit identity, timestamps, and sewing eligibility are enforced by the
server and database-backed workflow.

AI accelerated implementation, but requirement review, failure-path
analysis, browser testing, automated testing, and final acceptance
remained human-controlled.
