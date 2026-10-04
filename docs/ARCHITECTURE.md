# ApparelFlow ERP - System Architecture

## 1. Project Scope

Implement the Cutting Operations & Gatekeeper Verification
Terminal specified in the Webtezza practical assessment.

The application includes:
- Cutting Supervisor operations.
- Cutting Verifier QC operations.
- Sewing Supervisor operations.
- Server-enforced authentication and RBAC.
- Persistent relational data and immutable audit evidence.

The remaining modules of the ERP are outside the project scope.

## 2. Technology Architecture

- Development OS: Ubuntu 24.04 LTS.
- Application: Next.js App Router.
- Language: TypeScript.
- Frontend: React and Tailwind CSS.
- Backend: Next.js API route handlers and server-only services.
- Database: PostgreSQL.
- Deployment: Vercel.

The browser communicates with authenticated server endpoints.

The backend validates permissions, request payloads,
manufacturing rules and state transitions.

Database operations and sensitive business logic are never
trusted to client-side validation alone.

## 3. Application Layers

Presentation:
- Login and demo credential panel.
- Cutting Supervisor dashboard.
- Cutting Verifier terminal.
- Sewing Supervisor dashboard.
- Accessible, high-contrast forms.

API:
- Authentication and session validation.
- Request validation.
- Role-based authorization.
- Appropriate HTTP responses.

Service:
- Order creation and submission.
- Fabric accounting.
- Component counting.
- Verification and rejection.
- Re-cutting.
- Sewing handoff.
- Manufacturing state-transition rules.

Persistence:
- PostgreSQL relational tables.
- Foreign keys and database constraints.
- Transactional updates.
- Permanent audit evidence.

## 4. Database Schema

Use UUID primary keys, foreign keys, indexes, uniqueness
constraints and timezone-aware timestamps.

Use PostgreSQL NUMERIC for fabric measurements and
wastage percentages.

Use integer quantities for garments and components.

### 4.1 users

- id: UUID, primary key.
- email: unique, required.
- password_hash: required.
- role: required.
- full_name: required.
- created_at: timestamp.

Allowed roles:
- cutting_supervisor
- cutting_verifier
- sewing_supervisor

### 4.2 sessions

- id: UUID, primary key.
- user_id: foreign key to users.
- token_hash: unique, required.
- expires_at: timestamp.
- created_at: timestamp.

Store the raw session token only in the user's cookie.

Store a cryptographic hash of the token in PostgreSQL.

Use HttpOnly cookies and environment-appropriate
Secure and SameSite settings.

### 4.3 recipes

- id: UUID, primary key.
- recipe_code: unique, required.
- name: required.
- category: required.
- std_fabric_yards: NUMERIC, positive.
- wastage_cap: NUMERIC, non-negative.

Seed REC-BL01 and REC-CT02 with the exact specifications
provided in the assessment.

### 4.4 recipe_components

- id: UUID, primary key.
- recipe_id: foreign key to recipes.
- component_name: required.
- pieces_per_garment: positive integer.
- image_url: nullable.

Each recipe has multiple components.

### 4.5 cutting_orders

- id: UUID, primary key.
- order_no: unique, required.
- recipe_id: foreign key to recipes.
- target_qty: positive integer.
- fabric_roll_id: required.
- actual_fabric_yds: NUMERIC, cumulative total.
- status: required.
- created_by: foreign key to users.
- revision: positive integer.
- created_at: timestamp.
- updated_at: timestamp.
- submitted_at: nullable timestamp.
- verified_at: nullable timestamp.
- sewing_started_at: nullable timestamp.
- sewing_started_by: nullable foreign key to users.

The actual_fabric_yds column represents the sum of all
fabric entries for the order.

Only trusted backend transactions may update this total.

### 4.6 cutting_fabric_entries

- id: UUID, primary key.
- order_id: foreign key to cutting_orders.
- entry_type: ORIGINAL or RECUT.
- fabric_yds: positive NUMERIC.
- recorded_by: foreign key to users.
- reason: nullable for ORIGINAL, required for RECUT.
- created_at: timestamp.

Record one ORIGINAL entry per order.

Record additional fabric consumption using RECUT entries.

Preserve individual entries rather than replacing
previous measurements.

Fabric total = SUM(fabric_yds) for the order.

Update the fabric entries and cumulative total within
the same database transaction.

### 4.7 verification_items

- id: UUID, primary key.
- order_id: foreign key to cutting_orders.
- component_id: foreign key to recipe_components.
- expected_qty: positive integer.
- actual_qty: nullable non-negative integer.
- status: nullable GREEN, YELLOW or RED.
- updated_at: timestamp.

Enforce uniqueness for order_id and component_id.

Expected quantities are calculated from the recipe and
target batch quantity when the order is created.

NULL actual_qty means the component is uncounted.

A recorded zero is not the same as an uncounted component.

GREEN: actual_qty == expected_qty.
YELLOW: actual_qty > expected_qty.
RED: actual_qty < expected_qty.

Calculate and validate status on the server.

### 4.8 verification_logs

- id: UUID, primary key.
- order_id: foreign key to cutting_orders.
- verifier_id: foreign key to users.
- order_revision: positive integer.
- decision: APPROVED or REJECTED.
- rejection_note: nullable for approval.
- wastage_pct: NUMERIC.
- actual_fabric_yds: NUMERIC snapshot.
- timestamp: server-generated timestamp.

A rejection requires a non-empty reason.

Allow only one final decision per order revision.

Historical records must survive subsequent re-cutting.

Completed records are append-only and protected against
application-level modification and deletion.

### 4.9 verification_log_items

- id: UUID, primary key.
- verification_log_id: foreign key to verification_logs.
- component_id: foreign key to recipe_components.
- expected_qty: positive integer.
- actual_qty: nullable non-negative integer.
- status: nullable GREEN, YELLOW or RED.
- variance: nullable integer.

Enforce uniqueness for verification_log_id and component_id.

Variance = actual_qty - expected_qty.

Copy the component data when a verification decision
is recorded.

An uncounted item has NULL actual_qty, status and variance.

These historical snapshots are immutable.

## 5. Manufacturing State Machine

Persist these order statuses:

- CUTTING_IN_PROGRESS
- PENDING_VERIFICATION
- REJECTED
- VERIFIED
- IN_SEWING

Allowed transitions:

CUTTING_IN_PROGRESS -> PENDING_VERIFICATION
Actor: Cutting Supervisor.

PENDING_VERIFICATION -> REJECTED
Actor: Cutting Verifier.
Requires a non-empty rejection reason.

PENDING_VERIFICATION -> VERIFIED
Actor: Cutting Verifier.
Requires complete component counts and no shortages.

REJECTED -> CUTTING_IN_PROGRESS
Actor: Cutting Supervisor.
Begins a new re-cutting and verification cycle.

VERIFIED -> IN_SEWING
Actor: Sewing Supervisor.

All other transitions are prohibited.

An order can be created as a cutting draft or created
and submitted through an atomic backend operation.

The order revision identifies the verification cycle.

When re-cutting begins, increment the revision.

Preserve previous verification logs and snapshots.

Clear current verification counts before the next QC
submission so that every component is counted again.

## 6. Fabric Wastage

Expected fabric:

target_qty * recipe.std_fabric_yards

Actual fabric:

SUM(cutting_fabric_entries.fabric_yds)

Fabric wastage percentage:

((actual_fabric - expected_fabric) / expected_fabric) * 100

Calculate wastage on the backend.

Store the value and actual fabric snapshot when a
verification decision is recorded.

Compare wastage with the recipe's wastage cap.

Exceeding the cap produces a warning and audit evidence.

Excess wastage alone does not block batch approval.

## 7. Verification Hard Stop

An approval request must:

1. Authenticate the server-side session.
2. Require the cutting_verifier role.
3. Confirm that the order is PENDING_VERIFICATION.
4. Lock the order within a database transaction.
5. Load all expected components and recorded counts.
6. Reject missing or uncounted components.
7. Reject every component shortage.
8. Recalculate count statuses on the server.
9. Calculate cumulative fabric wastage.
10. Write verification logs and component snapshots.
11. Set the order status to VERIFIED.
12. Commit the transaction.

Return HTTP 403 for unauthorized approval attempts.

Return HTTP 422 for incomplete or shortage approvals.

Do not trust client-supplied verifier IDs, timestamps,
computed statuses or status-transition requests.

A failure must roll back the entire approval transaction.

Use database-level protections against updates and
deletes of completed verification evidence.

## 8. Rejection and Re-cutting

Rejecting a batch requires a mandatory reason.

Persist a permanent rejection log and snapshots of the
available component counts.

Mark the order REJECTED.

The Cutting Supervisor can begin re-cutting.

Record additional fabric consumption separately.

Increment the order revision for the new cycle.

Require fresh component counting after resubmission.

Never modify or delete previous verification records.

## 9. Sewing Queue

Only the sewing_supervisor role can access sewing APIs.

The waiting queue must enforce the following database
condition:

WHERE cutting_orders.status = 'VERIFIED'

Do not allow URL parameters to override this filter.

The Sewing Supervisor may inspect verified quantities,
verifier attribution, wastage and audit information.

Starting assembly transitions VERIFIED -> IN_SEWING.

IN_SEWING orders are shown in a separate active-work view.

Unverified, pending and rejected orders must never be
exposed through Sewing Supervisor endpoints.

## 10. Security

Enforce authentication and authorization on the server.

Perform role checks before attempting protected mutations.

Use secure password hashing.

Protect session cookies and state-changing requests
against CSRF and unauthorized cross-origin access.

Validate all request payloads on the backend.

Restrict each API to the minimum required role.

Use parameterized database access.

Do not expose database credentials to the browser.

Do not allow editing or deletion of approved audit records.

Treat frontend buttons and route visibility as usability
features, not as security boundaries.

## 11. Input Validation

Target quantities must be positive integers.

Component counts must be non-negative integers.

Fabric measurements must be positive decimal values.

Required text inputs cannot be empty or whitespace-only.

Reject invalid, negative and non-numeric inputs.

Reject decimal values in integer-only fields.

Display immediate, accessible inline validation errors.

Repeat authoritative validation on the backend.

## 12. Automated Verification

Mandatory tests:

1. Authenticated Verifier approves an all-GREEN batch.
2. Any RED component blocks approval.
3. Rejection without a reason fails.
4. Non-verifier approval returns HTTP 403.
5. Unapproved orders are absent from the Sewing Queue.

Additional tests include:

- YELLOW components may pass.
- Missing and NULL counts block approval.
- Zero is handled as a recorded component count.
- Invalid input is rejected.
- Unauthorized role operations fail.
- Client-supplied audit identities are ignored.
- Illegal state transitions fail.
- Re-cutting preserves historical records.
- Fabric totals include original and additional usage.
- Approved audit evidence cannot be modified.
- Failed approval transactions leave no partial results.
- Refreshing the application preserves database state.

## 13. Deployment and Documentation

Deploy the application to Vercel.

Use a persistent cloud-hosted PostgreSQL database.

Keep secrets in environment variables outside Git.

Document the schema, architecture and demo credentials
in README.md.

Maintain REQUIREMENTS_CHECKLIST.md.

Maintain honest AI usage and correction records in
AI_OPTIMIZATION_REPORT.md.

Maintain meaningful, atomic Git commits.

Verify the public deployment and complete the
assessment's five-minute evaluator checklist.
