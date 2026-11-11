# Loom frontend

Next.js App Router / React application. This folder is an independent npm project with its own lockfile, configuration, browser tests and ignored runtime files. The repository root contains only `frontend/`, `backend/` and Git's internal `.git` metadata.

## Run

Install dependencies with `npm ci` inside this folder. Configure `.env.local` from `.env.example`, then run:

```sh
npm run dev
```

The default origin is **http://localhost:3300**. Start the API separately from `../backend`, or use `npm run dev:all` there after installing both projects.

| Route                                      | Experience                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `/`                                        | Public landing page, product tour, workflow/role tabs, capacity calculator and FAQ |
| `/login`                                   | Session sign-in                                                                    |
| `/workspace`                               | Authenticated production overview                                                  |
| `/control-tower`                           | Exception inbox, operational OEE estimate, commercial/resource pulse               |
| `/capacity`                                | Drag/drop allocation board, scenarios, station bottlenecks and qualified workers   |
| `/approvals`                               | Independent procurement/payroll/cost/quality/compliance review queue               |
| `/procurement`, `/warehouse`               | Suppliers, purchasing, fabric lots, stock issues and returns                       |
| `/traceability`                            | Bundle QR passports and checkpoint history                                         |
| `/equipment`, `/workforce`                 | Downtime, maintenance, attendance, overtime and skills                             |
| `/assurance`, `/commercial`, `/governance` | Sampling/CAPA, costing/subcontracts, compliance/resource ledger                    |
| `/documents/:shipmentId`                   | Packing list and commercial invoice; print/save PDF                                |

Original order, production, quality, material, payroll, people and report workspaces remain available in navigation.

## Verification

```sh
npm run typecheck
npm run format:check
npm run build
npm run audit
```

With a migrated/seeded backend and both servers running:

```sh
npx playwright install chromium
npm run test:e2e
```

On Windows where downloaded binaries are restricted, use installed Edge: `$env:PLAYWRIGHT_CHANNEL='msedge'` before running tests. Browser tests include public interactions, all workspaces, stock/import/planning views, QR download, independent cost approval, invoice generation and offline draft review. Test artifacts stay inside this folder and are ignored by Git.

Production submissions can be saved in IndexedDB when a network submission fails. Drafts are scoped to the signed-in user/factory. Sync uses server idempotency receipts; conflicts are preserved for review rather than overwriting records. No session token is stored in the outbox.

All HTML text uses at least 14px, with keyboard controls, focus-trapped dialogs, responsive panels and reduced-motion support. Landing preview data is explicitly illustrative; authenticated screens read persisted factory records.

See [backend setup and architecture](../backend/README.md) for deployment, accounts, APIs and business rules. Financial/capacity/emissions displays are calculated from explicit inputs; sampling is buyer-configured and does not claim standards certification.
