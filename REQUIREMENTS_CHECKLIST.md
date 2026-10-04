# ApparelFlow ERP - Requirements Checklist

Source: Webtezza Software Engineering Intern Practical Challenge
Scope: Production Batch Verification & Sewing Queue Gate
Target workload: 4 calendar days / 28-32 focused engineering hours

Legend:
- [ ] Not completed
- [x] Implemented and verified

## 1. Project Foundation (PDF Sections 1-4)

- [x] Create the GitHub repository.
- [x] Configure the Ubuntu development environment.
- [x] Initialize Next.js with TypeScript and Tailwind CSS.
- [x] Establish a successful development and production build.
- [x] Establish the initial atomic Git commit.
- [ ] Implement the complete Cutting Operations & Gatekeeper Terminal.
- [ ] Maintain the scope of the assigned module, not the entire ERP.
- [ ] Provide a working, publicly deployed full-stack application.

## 2. Authentication and RBAC (PDF Section 5)

- [ ] Implement real user authentication.
- [ ] Store passwords securely as password hashes.
- [ ] Implement secure server-side sessions.
- [ ] Implement authentication-aware navigation.
- [ ] Provide a visible role switcher/demo credential panel.
- [ ] Seed demo credentials for all three roles.
- [ ] Enforce permissions on the backend.

### Cutting Supervisor - cutting_supervisor

- [ ] Allow cutting order creation from production recipes.
- [ ] Allow target batch quantity entry.
- [ ] Allow fabric roll and fabric usage entry.
- [ ] Allow tracking of cutting progress.
- [ ] Prevent verification approval and rejection.
- [ ] Prevent access to the Sewing Queue.

### Cutting Verifier - cutting_verifier

- [ ] Provide an isolated QC verification workspace.
- [ ] Allow actual component count entry.
- [ ] Display component traffic-light statuses.
- [ ] Allow valid batch approval.
- [ ] Allow batch rejection with a mandatory reason.
- [ ] Prevent cutting order creation.
- [ ] Prevent recipe editing.
- [ ] Prevent access to the Sewing Queue.

### Sewing Supervisor - sewing_supervisor

- [ ] Display verified batches available for assembly.
- [ ] Display piece counts and verification information.
- [ ] Display verifier attribution and audit notes.
- [ ] Allow starting sewing assembly.
- [ ] Hide unverified, pending and rejected orders.
- [ ] Prevent unauthorized cutting and verification actions.

## 3. Manufacturing State Machine (PDF Section 6)

- [ ] Represent cutting work in progress.
- [ ] Support transition to PENDING_VERIFICATION.
- [ ] Support component-by-component count QC.
- [ ] Support REJECTED with a mandatory reason.
- [ ] Return rejected batches for re-cutting.
- [ ] Support corrected batch resubmission.
- [ ] Support VERIFIED after successful approval.
- [ ] Release verified batches into the Sewing Queue.
- [ ] Support starting sewing assembly.
- [ ] Reject illegal state transitions on the server.
- [ ] Preserve historical verification and rejection attempts.

### Immutable Verification Evidence

- [ ] Store the authenticated verifier's user ID.
- [ ] Store a server-generated verification timestamp.
- [ ] Store the verified component counts.
- [ ] Store component count variances.
- [ ] Store the calculated fabric wastage percentage.
- [ ] Prevent modification of completed verification evidence.
- [ ] Preserve the evidence during the sewing handoff.

## 4. Production Recipes (PDF Section 7.1)

### Recipe A - Casual Blouse

- [ ] Seed recipe REC-BL01.
- [ ] Set category to Blouse.
- [ ] Set standard fabric to 1.8 yards per garment.
- [ ] Set wastage cap to 5.0%.
- [ ] Seed Front Body Panel: 1 per garment.
- [ ] Seed Back Body Panel: 1 per garment.
- [ ] Seed Sleeves (Left & Right): 2 per garment.
- [ ] Seed Collar & Stand: 1 per garment.
- [ ] Seed Sleeve Cuffs: 2 per garment.

### Recipe B - Crop Top

- [ ] Seed recipe REC-CT02.
- [ ] Set category to Crop Top.
- [ ] Set standard fabric to 1.1 yards per garment.
- [ ] Set wastage cap to 8.0%.
- [ ] Seed Front Chest Panel: 1 per garment.
- [ ] Seed Back Support Panel: 1 per garment.
- [ ] Seed Neck Binding Strip: 1 per garment.
- [ ] Seed Hem Elastic Casing: 1 per garment.
- [ ] Seed Side Strap Accents: 2 per garment.

## 5. Cutting Order Engine (PDF Section 7.2)

- [ ] Provide a cutting order creation interface.
- [ ] Require a valid recipe ID.
- [ ] Require a positive integer target batch quantity.
- [ ] Require a fabric roll ID.
- [ ] Require actual fabric usage in yards.
- [ ] Calculate expected counts for every recipe component.
- [ ] Apply target quantity * pieces per garment.
- [ ] Persist the order and expected component counts.
- [ ] Transition submitted orders to PENDING_VERIFICATION.
- [ ] Attribute order creation to the authenticated Supervisor.

## 6. Verification Terminal (PDF Sections 7.3-7.4)

- [ ] Display every expected recipe component.
- [ ] Allow the Verifier to enter actual component counts.
- [ ] Calculate status as actual == expected: GREEN.
- [ ] Calculate status as actual > expected: YELLOW.
- [ ] Calculate status as actual < expected: RED.
- [ ] Show traffic-light feedback in real time.
- [ ] Record surplus quantities for YELLOW components.
- [ ] Allow YELLOW components to pass verification.
- [ ] Disable approval when any component is RED.
- [ ] Disable approval for missing or uncounted components.
- [ ] Independently enforce approval conditions on the API.
- [ ] Reject shortage approval requests with HTTP 422.
- [ ] Require a non-empty reason when rejecting a batch.
- [ ] Return rejected work to the Cutting Supervisor.
- [ ] Never allow an incomplete batch into the Sewing Queue.

## 7. Sewing Handoff and Wastage (PDF Section 7.5)

- [ ] Make approved orders available in the Sewing Queue.
- [ ] Display only VERIFIED orders in the waiting queue.
- [ ] Show verified component counts.
- [ ] Show verifier attribution.
- [ ] Show relevant verification audit information.
- [ ] Implement Start Sewing Assembly.
- [ ] Calculate expected fabric as target quantity * standard fabric.
- [ ] Calculate wastage percentage on the backend.
- [ ] Use ((actual - expected) / expected) * 100.
- [ ] Persist the wastage percentage.
- [ ] Compare wastage against the recipe's wastage cap.

## 8. Persistent Relational Database (PDF Section 8)

- [ ] Configure a persistent PostgreSQL database.
- [ ] Establish database migrations.
- [ ] Define foreign keys and relational constraints.
- [ ] Define appropriate indexes.

### users

- [ ] id
- [ ] email
- [ ] password_hash
- [ ] role
- [ ] full_name
- [ ] created_at
- [ ] Relationships to orders and verifications.

### recipes

- [ ] id
- [ ] recipe_code
- [ ] name
- [ ] category
- [ ] std_fabric_yards
- [ ] wastage_cap
- [ ] Relationships to components and orders.

### recipe_components

- [ ] id
- [ ] recipe_id
- [ ] component_name
- [ ] pieces_per_garment
- [ ] image_url
- [ ] Foreign key to the recipe.

### cutting_orders

- [ ] id
- [ ] order_no
- [ ] recipe_id
- [ ] target_qty
- [ ] fabric_roll_id
- [ ] actual_fabric_yds
- [ ] status
- [ ] created_by
- [ ] Relevant timestamps
- [ ] Relationships to recipes, users and items.

### verification_items

- [ ] id
- [ ] order_id
- [ ] component_id
- [ ] expected_qty
- [ ] actual_qty
- [ ] GREEN/YELLOW/RED status
- [ ] Relationships to orders and components.

### verification_logs

- [ ] id
- [ ] order_id
- [ ] verifier_id
- [ ] APPROVED/REJECTED decision
- [ ] rejection_note
- [ ] wastage_pct
- [ ] timestamp
- [ ] Relationships to orders and verifiers.

## 9. Server-Side Security (PDF Section 9)

- [ ] Authenticate protected requests on the server.
- [ ] Enforce RBAC independently of the frontend.
- [ ] Return HTTP 403 for non-verifier approval attempts.
- [ ] Return HTTP 422 for incomplete or shortage approvals.
- [ ] Enforce the Sewing Queue VERIFIED filter in SQL.
- [ ] Prevent query-parameter manipulation from leaking orders.
- [ ] Derive verifier identity from authenticated context.
- [ ] Generate authoritative timestamps on the server.
- [ ] Never trust client-provided roles or audit identities.
- [ ] Prevent direct API calls from bypassing the state machine.
- [ ] Validate incoming payloads on the backend.
- [ ] Prevent unauthorized status overrides.
- [ ] Handle invalid requests with appropriate error responses.

## 10. Automated Testing (PDF Section 10)

### Five Mandatory Tests

- [ ] All-GREEN batch: authenticated Verifier can approve.
- [ ] RED component: approval is blocked.
- [ ] Rejection without a reason: backend rejects the request.
- [ ] Non-verifier approval: backend returns HTTP 403.
- [ ] Unapproved orders: excluded from the Sewing Queue query.

### Additional Defensive Tests

- [ ] YELLOW excess does not automatically block approval.
- [ ] Missing component count prevents approval.
- [ ] Uncounted component prevents approval.
- [ ] Invalid quantities are rejected.
- [ ] Unauthorized order creation is rejected.
- [ ] Sewing Supervisor cannot access pending orders.
- [ ] Audit identity cannot be spoofed through request data.
- [ ] Illegal state transitions are rejected.
- [ ] Historical verification evidence remains unchanged.
- [ ] Tests run successfully through npm test or equivalent.

## 11. UI, Accessibility and Persistence (PDF Section 11)

- [ ] Provide high-contrast, readable input text.
- [ ] Avoid white text on white input backgrounds.
- [ ] Ensure dropdown options are readable.
- [ ] Ensure search fields are readable.
- [ ] Ensure focused input states have adequate contrast.
- [ ] Provide immediate inline input errors.
- [ ] Reject empty required fields.
- [ ] Reject negative numeric values.
- [ ] Reject non-numeric values in numeric fields.
- [ ] Reject decimal values in integer-only fields.
- [ ] Reject invalid numeric payloads on the backend.
- [ ] Ensure usable layouts across common screen sizes.
- [ ] Persist created orders across reloads.
- [ ] Persist component counts across reloads.
- [ ] Persist status transitions across reloads.
- [ ] Persist audit logs across reloads.
- [ ] Use the persistent cloud database as the data source.

## 12. AI Optimization Report (PDF Section 12)

- [ ] Create AI_OPTIMIZATION_REPORT.md at repository root.
- [ ] Document the actual AI tools used.
- [ ] Document the tasks and prompting approaches.
- [ ] Identify at least two genuine flawed AI-code instances.
- [ ] Explain the consequences of each flaw.
- [ ] Document the human refactoring and corrections.
- [ ] Explain the defensive architecture.
- [ ] Explain state-machine and authorization safeguards.
- [ ] Ensure the report accurately reflects actual development.

## 13. Four-Day Milestones (PDF Section 13)

### Day 1 - Architecture, Database and Repository

- [x] Initialize the application repository.
- [ ] Complete architecture and database design.
- [ ] Configure the relational database.
- [ ] Seed production recipes.
- [ ] Deploy the application skeleton to the cloud.

### Day 2 - Supervisor and Order Engine

- [ ] Build the role switcher/demo credential panel.
- [ ] Build the order creation modal.
- [ ] Implement the dynamic component multiplier.
- [ ] Implement order validation.

### Day 3 - Verifier and Hard Stop

- [ ] Build the verification workspace.
- [ ] Implement the traffic-light logic.
- [ ] Implement the server-side gatekeeper.
- [ ] Implement the rejection note workflow.

### Day 4 - Sewing, Testing and Documentation

- [ ] Build the Sewing Queue.
- [ ] Complete automated tests.
- [ ] Perform the UI contrast audit.
- [ ] Complete the AI optimization report.

## 14. Submission Deliverables (PDF Section 14)

- [ ] Provide a live, publicly accessible deployed URL.
- [ ] Provide a public GitHub repository.
- [ ] Maintain meaningful, atomic commit history.
- [ ] Include AI_OPTIMIZATION_REPORT.md in the root.
- [ ] Include README.md in the root.
- [ ] Explain the architecture in the README.
- [ ] Document the relational schema in the README.
- [ ] Document demo credentials for all three roles.
- [ ] Provide an executable and passing automated test suite.

## 15. Evaluation Rubric (PDF Section 15)

- [ ] Domain and business logic - 15%.
- [ ] Gatekeeper hard stop - 20%.
- [ ] Role isolation and RBAC - 15%.
- [ ] Database and architecture - 15%.
- [ ] UI contrast and usability - 15%.
- [ ] Automated tests and edge cases - 10%.
- [ ] AI candor and optimization - 10%.

## 16. Evaluator's Five-Minute Audit (PDF Section 16)

- [ ] Contrast: inspect every input and dropdown.
- [ ] RBAC: Verifier cannot access order creation.
- [ ] RBAC: Sewing cannot see unverified batches.
- [ ] Shortage: RED disables the approval button.
- [ ] Shortage: the backend independently blocks approval.
- [ ] Handoff: an approved GREEN batch reaches Sewing.
- [ ] Persistence: verified batches survive a page refresh.
- [ ] Repository: inspect meaningful Git commits.
- [ ] Testing: automated tests pass.
- [ ] AI report: demonstrate real code review and corrections.

## 17. Agreed Engineering Interpretations

These decisions clarify requirements that the assessment
does not completely specify.

- [ ] Use Next.js, TypeScript, PostgreSQL and Vercel.
- [ ] Use three real demo accounts with server-side sessions.
- [ ] Treat count QC as part of the verification workflow.
- [ ] Allow integer component counts, including zero.
- [ ] Require positive integer target batch quantities.
- [ ] Allow decimal measurements for fabric yards.
- [ ] Warn and audit when fabric wastage exceeds its cap.
- [ ] Do not block approval solely for excess fabric wastage.
- [ ] Preserve rejection records during re-cutting.
- [ ] Require fresh verification after re-cutting.
- [ ] Introduce IN_SEWING when assembly starts.
- [ ] Keep the VERIFIED waiting queue separate from
      orders whose sewing assembly has started.
- [ ] Preserve immutable approval evidence.

## 18. Security and Quality Follow-Up

- [ ] Recheck outstanding development dependency advisories.
- [ ] Ensure production dependencies have no known high
      or critical vulnerabilities at final submission.
- [ ] Verify production environment variable configuration.
- [ ] Ensure secrets are excluded from Git.
- [ ] Execute the final production build.
- [ ] Execute the final lint check.
- [ ] Execute the complete automated test suite.
- [ ] Verify deployment and database connectivity.
- [ ] Complete the final end-to-end demonstration.
