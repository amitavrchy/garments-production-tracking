# Advanced factory suite

This release deepens both production operations and business control while preserving the original order → shipment balance chain. The product has a public landing page at `/`, session entry at `/login`, and an authenticated overview at `/workspace`.

## Operational feature map

| Area                 | Implemented behavior                                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control tower        | Derived exception inbox, estimated OEE, line availability/performance/good yield, commercial and resource pulse                                                                                                  |
| Capacity board       | Seven-day line/day view; drag unstarted allocations into free slots; recorded production locks their identity; optimistic versions reject stale changes                                                          |
| Capacity scenarios   | Earliest-delivery scheduling; manpower/efficiency/overtime/horizon inputs; occupied slots and unavailable tracked equipment respected; unplanned/late pieces shown; input fingerprint prevents stale application |
| Operation balance    | SMV-based station capacity, recommended operators, bottleneck/gap and currently qualified worker suggestions; absent/on-leave, expired and fully occupied workers excluded                                       |
| Procurement          | Supplier terms, currency and explicit FX; draft/submit/independent accounts approval/receipt; receipt atomically creates held stock and a material ledger entry                                                  |
| Warehouse            | Roll/lot, shade, GSM, width, warehouse/bin and QC clearance; atomic issue/return with nonnegative stock; quantities remain grouped by unit                                                                       |
| Bundle traceability  | QR passport and scanner-text lookup; cutting quantity cap; append-only checkpoint events; role-gated handoffs and native production/finishing/packing limits                                                     |
| Equipment            | Machine-specific downtime categories and Pareto; preventive/corrective work, priority, owner, spare cost and resolution; open work controls machine status                                                       |
| Workforce            | Daily attendance, overnight clock minutes, breaks, overtime; operation skill level, achieved efficiency, training and expiry                                                                                     |
| Final assurance      | Finished-lot sampling with explicit buyer acceptance counts; critical/major/minor results; assessed records locked                                                                                               |
| CAPA                 | Root cause, containment, correction and prevention; owner/deadline; independent verification and closure                                                                                                         |
| Costing              | Approved purchase prices weighted by quantity and recorded FX; BOM consumption/wastage; SMV labor, overhead, packing/freight; reconciled BDT unit cost and margin; independent approval                          |
| Subcontracting       | Supplier/size/color job; dispatch reserves cut input; full or partial good receipt enters the existing sewn-output balance                                                                                       |
| Compliance           | Categorized requirement, severity, owner, due date, evidence/notes and independent reviewer                                                                                                                      |
| Sustainability       | Measured energy/water/scrap/recycling; explicit electricity factor for an estimated CO₂ footprint                                                                                                                |
| Approval desk        | Accessible procurement, payroll, cost, CAPA and compliance review queues; eligible reviewer controls and audited decisions                                                                                       |
| Commercial documents | Packing list and invoice from real cartons and approved selling price; print/save PDF and CSV                                                                                                                    |
| Master import        | Quoted CSV parser, preview, 500-row limit, validated/atomic buyer/worker/supplier import; duplicate failure rolls back all rows                                                                                  |
| Production outbox    | IndexedDB drafts scoped to user/factory, explicit sync/review/export/removal; actor/factory-scoped idempotency receipts prevent duplicate posting                                                                |
| Search               | Factory-scoped PO, style, worker and bundle lookup in the keyboard command palette                                                                                                                               |

## Advanced API

The existing `/api/data/:resource` endpoints now accept: `suppliers`, `purchases`, `lots`, `lotIssues`, `bundles`, `downtime`, `maintenance`, `attendance`, `skills`, `stations`, `qualityAudits`, `correctiveActions`, `costing`, `compliance`, `scenarios`, `subcontracts`, `sustainability`.

| Method | Endpoint                                        | Purpose                                                  |
| ------ | ----------------------------------------------- | -------------------------------------------------------- |
| GET    | `/api/advanced/insights?date=YYYY-MM-DD`        | Operational intelligence, scoped financial summaries     |
| GET    | `/api/advanced/balance/:lineId?date=YYYY-MM-DD` | Station balance and qualification suggestions            |
| GET    | `/api/advanced/trace/:code`                     | Bundle passport and checkpoints                          |
| GET    | `/api/advanced/shipping/:shipmentId`            | Invoice/packing document data                            |
| GET    | `/api/search?q=...`                             | Factory-scoped entity search                             |
| GET    | `/api/directory`                                | Safe active-user IDs/names/roles for ownership selectors |
| POST   | `/api/tools/import/:resource`                   | `{rows:[...]}` atomic master import                      |

Advanced records and allocation edits require `expectedVersion`; transitions include it with `status`. A stale version returns 409. Advanced operational records are retained rather than deleted. Draft suppliers, purchases, cost sheets and scenarios can be deleted only when dependencies allow it.

Lot QC action: `{action:"inspect",result:"PASS",expectedVersion:1}`. Only QC/admin can clear or fail a lot, and clearance cannot change after issue. Store-created receipts enter HOLD. Subcontract receipt optionally includes `receivedQty`, between one and the sent quantity; unreturned pieces remain in WIP.

POST creation accepts `Idempotency-Key` (10–128 characters). Same user/factory/key and body return the stored response without repeating ledger changes. Reuse with different input returns 409. The browser outbox uses this path; no server mutation is claimed until sync succeeds.

## Transparent assumptions

- The scheduler is deterministic, earliest delivery first, and fills one order per free line/day slot. It does not claim global optimality or automatic material/lead-time feasibility; review BOM readiness and critical-path tasks before release.
- Station suggestions use an explicit 80% planning assumption and the configured shift. The planner's scenario efficiency is separately editable.
- OEE is an operational estimate: recorded availability, capped SMV performance and same-day good-output yield. DHU is not treated as yield.
- Sampling uses user-entered buyer acceptance counts and does not claim ISO/ANSI table certification.
- Cost and FX are recorded inputs, not live market quotes. Resource/CO₂ reports are not external sustainability certification.
- Scanner keyboards and QR links work with the bundle code field; camera/RFID device integrations are not provisioned.
- A partial subcontract receipt closes the job at its recorded good return; outstanding pieces remain visible in cumulative WIP for reconciliation.

## Market research

The selected scope reflects established apparel planning and quality patterns: [Coats Digital FastReactPlan](https://www.coatsdigital.com/en/manufacturer/fastreactplan/) describes capacity, material and critical-path planning; [Inspectorio](https://www.inspectorio.com/) provides a reference for connected quality and supply-chain workflows. Loom's implementation is independent and only claims the behaviors verified above.
