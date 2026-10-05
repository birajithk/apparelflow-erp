# ApparelFlow ERP

ApparelFlow is a full-stack production execution system for garment manufacturing.

This project implements the **Cutting Operations & Gatekeeper Verification** workflow, where cutting batches must pass component-level quality verification before they can be released to the sewing floor.

The core engineering objective is to enforce this manufacturing checkpoint on the **server**, so a shortage or unauthorized user cannot bypass the workflow through frontend manipulation or direct API requests.

## Project Scope

The application focuses on three factory roles:

| Role | Responsibility |
|---|---|
| Cutting Supervisor | Creates cutting batches, records fabric usage, and handles rejected batches requiring re-cutting |
| Cutting Verifier | Counts cut components, receives GREEN / YELLOW / RED status feedback, and approves or rejects batches |
| Sewing Supervisor | Receives verified batches and starts sewing assembly |

The project intentionally implements this production checkpoint rather than the entire ApparelFlow ERP platform.

## Current Implementation Status

| Area | Status |
|---|---|
| Authentication | Implemented |
| Server-side sessions | Implemented |
| Role-based API authorization | Implemented |
| Production recipe seeding | Implemented |
| Cutting order creation | Implemented |
| Component multiplier engine | Implemented |
| Verification terminal | Implemented |
| GREEN / YELLOW / RED count logic | Implemented |
| Server-side shortage hard stop | Implemented |
| Approval and rejection workflow | Implemented |
| Immutable verification audit records | Implemented |
| Rejected batch re-cut/resubmission | Implemented |
| Fabric usage / wastage calculation | Implemented |
| Sewing Supervisor queue | In progress |
| Automated test suite | Planned after core workflow completion |
| Production deployment | Add public URL after deployment |

## Screenshots

### Cutting Supervisor

![Cutting Supervisor](docs/screenshots/cutting-supervisor.png)

The Cutting Supervisor creates production batches from seeded garment recipes. Expected component quantities are generated automatically from the target quantity and recipe component multipliers.

### Verification Terminal

![Verification Terminal](docs/screenshots/verifier-green.png)

The Cutting Verifier records actual cut-piece quantities for every required component.

### Server-Enforced Shortage Gate

![Shortage Hard Stop](docs/screenshots/verifier-red-hard-stop.png)

Any component shortage is marked **RED**. A batch containing a shortage cannot be approved.

### Re-cut Workflow

![Rejected Batch Re-cut](docs/screenshots/rejected-batch-recut.png)

Rejected batches return to the Cutting Supervisor, where additional fabric use and the re-cut reason are recorded before the batch is submitted for a fresh verification cycle.

> The Sewing Supervisor screenshot will be added when the Sewing Queue workflow is complete.

## Core Manufacturing Rules

For each component:

```text
Expected Quantity = Target Garment Quantity × Pieces Per Garment
```

Verification status is calculated as:

```text
GREEN  → Actual Quantity = Expected Quantity
YELLOW → Actual Quantity > Expected Quantity
RED    → Actual Quantity < Expected Quantity
```

GREEN and YELLOW components may pass verification.

A single RED component blocks batch approval.

The approval rule is enforced independently on the backend. Frontend button states are treated only as usability controls and are not trusted as a security boundary.

## Manufacturing Workflow

```text
Cutting Supervisor
        |
        v
Create Cutting Order
        |
        v
PENDING_VERIFICATION
        |
        v
Cutting Verifier
        |
        +----------------------+
        |                      |
        v                      v
     APPROVED               REJECTED
        |                      |
        v                      v
     VERIFIED          Cutting Supervisor
        |                      |
        |                Re-cut / Resubmit
        |                      |
        +<---------------------+
        |
        v
Sewing Queue
```

The Sewing Queue handoff is the next workflow being completed.

## Architecture

ApparelFlow uses a layered full-stack architecture:

```text
Browser / React UI
        |
        v
Next.js App Router
        |
        v
API Route Handlers
        |
        v
Authentication + RBAC Guards
        |
        v
Server-only Domain Services
        |
        v
PostgreSQL
```

Business rules are implemented in server-only services rather than relying on browser state.

Examples include:

- authentication and role validation;
- cutting-order creation;
- component multiplier calculations;
- component-count verification;
- approval hard-stop validation;
- rejection processing;
- re-cut transactions;
- wastage calculation;
- immutable verification audit creation.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the detailed architecture.

## Technology Stack

- **Framework:** Next.js 16 App Router
- **Frontend:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL
- **Database driver:** `pg`
- **Authentication:** Server-side database sessions
- **Password hashing:** `bcryptjs`
- **Deployment target:** Vercel

## Database Model

The main relational entities are:

### `users`

Stores authenticated factory users and their assigned roles.

### `sessions`

Stores hashed server-side authentication session tokens and expiry timestamps.

### `recipes`

Stores garment production recipes including standard fabric requirements and wastage caps.

### `recipe_components`

Stores the individual cut components required for each garment recipe.

### `cutting_orders`

Stores production batches, quantities, fabric usage, manufacturing state, revision number, and timestamps.

### `cutting_fabric_entries`

Stores immutable original and re-cut fabric consumption records.

### `verification_items`

Stores expected quantities, actual quantities, and the current GREEN / YELLOW / RED status of every component.

### `verification_logs`

Stores the permanent verification decision, authenticated verifier, order revision, wastage percentage, fabric snapshot, and decision timestamp.

### `verification_log_items`

Stores immutable component-level snapshots associated with each verification decision.

Database constraints provide an additional integrity layer for valid roles, quantities, verification states, and audit records.

## Security Design

Security-sensitive decisions are enforced on the server.

Protected API routes authenticate the current session and verify the required role before executing business operations.

For example:

```text
POST /api/cutting/orders
Required role: cutting_supervisor

PATCH /api/verification/count
Required role: cutting_verifier

POST /api/verification/decision
Required role: cutting_verifier

POST /api/cutting/recut
Required role: cutting_supervisor
```

The authenticated user ID is obtained from the server session rather than accepted from request payloads.

Verification approval performs authoritative checks inside a database transaction.

Approval is rejected when:

- the batch is not awaiting verification;
- required components are missing;
- one or more components have not been counted;
- any component has a RED shortage status.

Verification and fabric audit records are protected against application-level update or deletion using PostgreSQL triggers.

## Seeded Production Recipes

Two production recipes are provided for demonstration.

**Casual Blouse — `REC-BL01`**

Standard fabric: 1.8 yards per garment  
Wastage cap: 5%

Components include Front Body Panel, Back Body Panel, Sleeves, Collar & Stand, and Sleeve Cuffs.

**Crop Top — `REC-CT02`**

Standard fabric: 1.1 yards per garment  
Wastage cap: 8%

Components include Front Chest Panel, Back Support Panel, Neck Binding Strip, Hem Elastic Casing, and Side Strap Accents.

## Demo Accounts

The project provides one demo account for each factory role.

| Role | Email | Password |
|---|---|---|
| Cutting Supervisor | `cutting.supervisor@apparelflow.demo` | `cutting.supervisor@2026` |
| Cutting Verifier | `cutting.verifier@apparelflow.demo` | `cutting.verifier@2026` |
| Sewing Supervisor | `sewing.supervisor@apparelflow.demo` | `sewing.supervisor@2026` |

These credentials are intentionally provided for application evaluation.

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` based on `.env.example`.

```env
DATABASE_URL="postgresql://..."
DIRECT_DATABASE_URL="postgresql://..."
```

`DATABASE_URL` is used by the application.

`DIRECT_DATABASE_URL` is used for migrations and database seeding.

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Seed demo users

```bash
npm run db:seed:users
```

Production recipes are installed through the database migrations.

### 5. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Quality Checks

The current application can be checked with:

```bash
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Automated domain tests will be added once the remaining core Sewing Queue workflow is complete.

The planned mandatory test coverage includes:

1. An all-GREEN batch can be approved by an authenticated Cutting Verifier.
2. A RED component blocks approval.
3. Rejection without a reason is rejected by the backend.
4. A non-verifier receives `403 Forbidden` when attempting verification approval.
5. Unapproved batches never appear in the Sewing Queue.

## Project Structure

```text
apparelflow-erp/
├── database/
│   └── migrations/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY_NOTES.md
│   └── screenshots/
├── scripts/
│   ├── migrate.mjs
│   └── seed-demo-users.mjs
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── login/
│   │   └── page.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── cutting/
│   │   └── verification/
│   └── server/
│       ├── auth/
│       ├── cutting/
│       ├── db/
│       ├── orders/
│       ├── recipes/
│       └── verification/
└── package.json
```

## Remaining Work

The immediate remaining core functionality is the **Sewing Supervisor workflow**:

```text
VERIFIED
   |
   v
Sewing Queue
   |
   v
Start Sewing Assembly
   |
   v
IN_SEWING
```

The Sewing Queue must expose only verified batches and enforce that filtering on the server/database side.

After that workflow stabilizes, the automated tests and final deployment verification will be completed.

## Engineering Principles

This implementation follows several important rules:

- authentication decisions are made on the server;
- roles are enforced by backend API guards;
- frontend visibility is not treated as authorization;
- manufacturing state transitions are controlled by server logic;
- database transactions protect multi-step operations;
- verification identities and timestamps come from trusted server context;
- audit evidence is preserved rather than overwritten;
- rejected batches begin a fresh verification revision;
- database constraints provide defense in depth.

The primary goal is not merely to display the manufacturing workflow, but to make invalid production transitions difficult to bypass.