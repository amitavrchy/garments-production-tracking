# Garments Production Tracking — Project Spec

> Stack: **Next.js + NestJS + Prisma + PostgreSQL + Redis/BullMQ + Socket.IO**  
> Bangladesh RMG floor system: buyer orders, style/BOM, line-wise hourly production, QC/defects, worker piece-rate salary, shipment.

---

## 1. Overview & Goals

### Product
Track apparel production from buyer PO → style BOM → cutting → sewing lines (hourly output) → QC → finishing → packing → shipment. Calculate worker earnings via piece-rate and show efficiency vs target.

### Engineering goals
- Style BOM with fabric/trim consumption + wastage %.
- Hourly line production entry with target vs actual efficiency.
- QC defect taxonomy; DHU (defects per hundred units).
- Piece-rate payroll from operation bulletin + output.
- End-to-end order balance (cut → sew → pack → ship).

### Non-goals
- Full ERP finance/GL (export payroll CSV).
- CAD/CAM nesting automation.

---

## 2. User Roles & Permissions (RBAC)

| Role | Permissions |
|------|-------------|
| `FACTORY_ADMIN` | Units, users, rates, buyers |
| `MERCHANDISER` | Buyer orders, styles, BOM, TNA |
| `IE` (Industrial Eng.) | Operation bulletin, SMV, piece rates |
| `PLANNING` | Line allocation, targets |
| `LINE_CHIEF` / `SUPERVISOR` | Hourly production entry |
| `QC` | Defect recording, audits |
| `STORE` | Fabric/trim issue & receive |
| `SHIPPING` | Cartons, packing lists, invoices |
| `ACCOUNTS` | Piece-rate approval, export |

---

## 3. Feature Modules

1. Org / factory floors / lines / machines  
2. Buyers & purchase orders (styles, colors, sizes, delivery dates)  
3. Style master + BOM + operation bulletin (SMV)  
4. Cutting orders & lay planning (basic)  
5. Line allocation & hourly production  
6. QC / defects / rework  
7. Finishing & packing  
8. Shipment & commercial docs stubs  
9. Piece-rate salary calculation  
10. Dashboards: efficiency, DHU, order WIP  

---

## 4. Advanced Business Logic

### 4.1 Order balance chain
```
OrderedQty(size,color)
CutQty → SewInput → SewOutput → Finish → Packed → Shipped
WIP constraints: SewOutput cumulative <= CutQty (+allowed cut over %)
Pack <= SewOutput - rejected scrap
Ship <= Packed
```
Warn on negative WIP; hard-block if `strictWip=true`.

### 4.2 Hourly production & efficiency
```
efficiency% = (producedPcs * SMV) / (operators * 60 * availableMinutesFactor) * 100
```
Per line per hour slot; supervisors enter pcs by size or total with size ratio default.

### 4.3 QC / DHU
```
DHU = (defectCount / inspectedPcs) * 100
```
Defect codes (stitch, stain, measurement…). Rework loop returns pcs to line WIP.

### 4.4 Piece-rate salary
```
For each worker-day:
  earnings = sum(operationCompletedPcs * operationPieceRate)
  OR line pool share: (lineOutput * bundleRate) * workerShareFactor
```
Operations from bulletin; scanning bundle tickets optional advanced. Deduct for reject attribution if configured.

### 4.5 BOM fabric requirement
```
requiredKg = sum(consumptionPerPc * orderQty) * (1 + wastage%)
compare to issued/received; alert shortage before cutting release.
```

### 4.6 Edge cases
- Color/size ratio changes after cut → remaining plan recalc.  
- Double hourly entry for same line/hour → unique constraint.  
- Mid-day operator transfer between lines.  
- Buyer revision (order qty change) with already cut goods.  
- Overtime hours factor in efficiency denominator.  
- Multiple factories / subcontract lines.

---

## 5. State Machines

**BuyerOrder**: `DRAFT → CONFIRMED → IN_PRODUCTION → PACKING → SHIPPED → CLOSED | CANCELLED`  
**Style**: `DRAFT → BOM_READY → BULLETIN_READY → ACTIVE | ARCHIVED`  
**CuttingOrder**: `PLANNED → CUTTING → COMPLETED`  
**Shipment**: `PLANNED → PACKED → DISPATCHED → DELIVERED`  
**PayrollRun**: `DRAFT → CALCULATED → APPROVED → EXPORTED`

---

## 6. Prisma Schema Draft

```prisma
model Factory { id String @id @default(cuid()) name String timezone String @default("Asia/Dhaka") }
model Floor { id String @id @default(cuid()) factoryId String name String }
model Line { id String @id @default(cuid()) floorId String code String targetManpower Int? @@unique([floorId, code]) }
model Buyer { id String @id @default(cuid()) name String code String @unique }
model BuyerOrder {
  id String @id @default(cuid())
  buyerId String
  poNumber String
  styleId String
  status String
  deliveryDate DateTime? @db.Date
  @@unique([buyerId, poNumber])
}
model OrderLineQty {
  id String @id @default(cuid())
  orderId String
  color String
  size String
  qty Int
  @@unique([orderId, color, size])
}
model Style {
  id String @id @default(cuid())
  code String @unique
  name String
  smv Decimal @db.Decimal(8,3)
  status String
}
model BomItem {
  id String @id @default(cuid())
  styleId String
  itemType String // FABRIC TRIM
  description String
  consumptionPerPc Decimal @db.Decimal(12,4)
  wastageBps Int @default(0)
  uom String
}
model OperationBulletin {
  id String @id @default(cuid())
  styleId String
  seq Int
  name String
  smv Decimal @db.Decimal(8,3)
  pieceRateMinor Int
  machineType String?
  @@unique([styleId, seq])
}
model Worker {
  id String @id @default(cuid())
  factoryId String
  employeeCode String
  name String
  skillGrade String?
  @@unique([factoryId, employeeCode])
}
model LineAssignment {
  id String @id @default(cuid())
  lineId String
  workerId String
  date DateTime @db.Date
  hours Decimal @db.Decimal(4,2) @default(8)
  @@unique([lineId, workerId, date])
}
model HourlyProduction {
  id String @id @default(cuid())
  lineId String
  orderId String
  date DateTime @db.Date
  hourStart Int // 0-23
  producedPcs Int
  operators Int
  enteredBy String?
  @@unique([lineId, orderId, date, hourStart])
}
model QcInspection {
  id String @id @default(cuid())
  orderId String
  lineId String?
  inspectedPcs Int
  at DateTime @default(now())
}
model QcDefect {
  id String @id @default(cuid())
  inspectionId String
  code String
  qty Int
}
model CuttingRecord {
  id String @id @default(cuid())
  orderId String
  color String
  size String
  qty Int
  cutAt DateTime @default(now())
}
model PackingCarton {
  id String @id @default(cuid())
  shipmentId String
  cartonNo String
  color String?
  sizeAssortment Json
  pcs Int
}
model Shipment {
  id String @id @default(cuid())
  orderId String
  status String
  invoiceNo String?
  shippedAt DateTime?
}
model PieceRateEntry {
  id String @id @default(cuid())
  workerId String
  date DateTime @db.Date
  operationId String
  pcs Int
  rateMinor Int
  amountMinor Int
  @@index([workerId, date])
}
model PayrollRun {
  id String @id @default(cuid())
  factoryId String
  periodStart DateTime @db.Date
  periodEnd DateTime @db.Date
  status String
}
```

---

## 7. REST API

- Buyers/orders/styles/BOM/bulletin CRUD  
- `POST /production/hourly`  
- `GET /production/efficiency`  
- `POST /qc/inspections`  
- Cutting & packing endpoints  
- `POST /payroll/runs/:id/calculate`  
- Dashboards `/reports/wip`, `/reports/dhu`  
- Shipments  

---

## 8. Real-time

- Line dashboard board: hourly pcs live (`line:{id}`).  
- Planning: order status changes.

---

## 9. Jobs

- Nightly efficiency aggregation  
- Payroll calculate  
- Delivery date risk alerts (behind WIP)  
- BOM shortage check before cut release  

---

## 10. Security

- Line chiefs only enter assigned lines.  
- Piece-rate approval segregation.  
- Audit edits to hourly production (version/history).

---

## 11. Caching

- Style bulletin + SMV cache.  
- Live line counters in Redis; flush periodically to DB.

---

## 12. Testing

- Unique hourly slot constraint under parallel posts.  
- WIP hard-block when sew > cut.  
- DHU formula fixtures.  
- Piece-rate sum matches bulletin rates.  
- Size breakdown totals equal order lines.

---

## 13. Folder Structure

```
garments-production-tracking/
  Project_spec.md
  frontend/  # shopfloor tablets + merchandising
  backend/
```

---

## 14. Env vars

`DATABASE_URL`, `REDIS_URL`, `JWT_*`, `APP_URL`, `CORS_ORIGINS`, `S3_*`, `SMTP_URL`, `SMS_*`, `STRICT_WIP`, `CUT_OVER_PERCENT_BPS`, `DEFAULT_SHIFT_MINUTES`

---

## 15. Milestones

1. Factory/lines/workers/buyers/orders  
2. Style BOM + bulletin  
3. Cutting + hourly production  
4. QC/DHU  
5. Packing/shipment  
6. Piece-rate payroll  
7. Dashboards + alerts  

---

## 16. Acceptance Criteria

- [ ] Cannot ship more than packed pcs per size/color.
- [ ] Efficiency report matches SMV formula fixtures.
- [ ] Duplicate hour entry rejected.
- [ ] DHU updates after defect post.
- [ ] Payroll run totals reconcile to PieceRateEntry.
- [ ] BOM shortage warning before cutting release.
- [ ] Seed: 1 factory, 4 lines, 1 style with bulletin, sample PO.

---

## 17. Agent Notes

- Use Asia/Dhaka for shift hours.  
- Keep operation bulletin as source of truth for rates.  
- Tablet-friendly large UI for hourly entry.
