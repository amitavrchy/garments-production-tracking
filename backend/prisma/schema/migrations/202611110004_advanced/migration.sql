-- Advanced manufacturing suite: tenant-scoped operational tables.
CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "paymentTerms" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Supplier_factoryId_code_key" ON "Supplier" ("factoryId", "code");
CREATE UNIQUE INDEX "Supplier_id_factoryId_key" ON "Supplier" (id,"factoryId");
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "bomItemId" TEXT NOT NULL,
  "qty" DOUBLE PRECISION NOT NULL,
  "unitCostMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "exchangeRate" DOUBLE PRECISION NOT NULL,
  "dueDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "approvedBy" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PurchaseOrder_factoryId_number_key" ON "PurchaseOrder" ("factoryId", "number");
CREATE UNIQUE INDEX "PurchaseOrder_id_factoryId_key" ON "PurchaseOrder" (id,"factoryId");
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "MaterialLot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "lotNo" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "bomItemId" TEXT NOT NULL,
  "warehouse" TEXT NOT NULL,
  "bin" TEXT NOT NULL,
  "shade" TEXT NOT NULL,
  "gsm" DOUBLE PRECISION NOT NULL,
  "widthCm" DOUBLE PRECISION NOT NULL,
  "qty" DOUBLE PRECISION NOT NULL,
  "issuedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "testResult" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MaterialLot_factoryId_lotNo_key" ON "MaterialLot" ("factoryId", "lotNo");
CREATE UNIQUE INDEX "MaterialLot_id_factoryId_key" ON "MaterialLot" (id,"factoryId");
ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "LotIssue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "qty" DOUBLE PRECISION NOT NULL,
  "kind" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "LotIssue_id_factoryId_key" ON "LotIssue" (id,"factoryId");
ALTER TABLE "LotIssue" ADD CONSTRAINT "LotIssue_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "Bundle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "cuttingId" TEXT NOT NULL,
  "lineId" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Bundle_factoryId_code_key" ON "Bundle" ("factoryId", "code");
CREATE UNIQUE INDEX "Bundle_id_factoryId_key" ON "Bundle" (id,"factoryId");
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "BundleEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "bundleId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "BundleEvent_id_factoryId_key" ON "BundleEvent" (id,"factoryId");
ALTER TABLE "BundleEvent" ADD CONSTRAINT "BundleEvent_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "Downtime" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "lineId" TEXT NOT NULL,
  "machineId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "minutes" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Downtime_id_factoryId_key" ON "Downtime" (id,"factoryId");
ALTER TABLE "Downtime" ADD CONSTRAINT "Downtime_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "Maintenance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "machineId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "assignedTo" TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  "spareCostMinor" INTEGER NOT NULL,
  "resolution" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "completedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Maintenance_id_factoryId_key" ON "Maintenance" (id,"factoryId");
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "Attendance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "clockIn" INTEGER NOT NULL,
  "clockOut" INTEGER NOT NULL,
  "breakMinutes" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "workedMinutes" INTEGER NOT NULL,
  "overtimeMinutes" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Attendance_workerId_date_key" ON "Attendance" ("workerId", "date");
CREATE UNIQUE INDEX "Attendance_id_factoryId_key" ON "Attendance" (id,"factoryId");
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "WorkerSkill" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "efficiency" DOUBLE PRECISION NOT NULL,
  "trainedDate" TEXT NOT NULL,
  "validUntil" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "WorkerSkill_workerId_operationId_key" ON "WorkerSkill" ("workerId", "operationId");
CREATE UNIQUE INDEX "WorkerSkill_id_factoryId_key" ON "WorkerSkill" (id,"factoryId");
ALTER TABLE "WorkerSkill" ADD CONSTRAINT "WorkerSkill_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "StationPlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "lineId" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "operators" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "StationPlan_lineId_operationId_date_key" ON "StationPlan" ("lineId", "operationId", "date");
CREATE UNIQUE INDEX "StationPlan_id_factoryId_key" ON "StationPlan" (id,"factoryId");
ALTER TABLE "StationPlan" ADD CONSTRAINT "StationPlan_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "QualityAudit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "lineId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "lotSize" INTEGER NOT NULL,
  "sampleSize" INTEGER NOT NULL,
  "criticalCount" INTEGER NOT NULL,
  "majorCount" INTEGER NOT NULL,
  "minorCount" INTEGER NOT NULL,
  "acceptMajor" INTEGER NOT NULL,
  "acceptMinor" INTEGER NOT NULL,
  "date" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "QualityAudit_id_factoryId_key" ON "QualityAudit" (id,"factoryId");
ALTER TABLE "QualityAudit" ADD CONSTRAINT "QualityAudit_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "CorrectiveAction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "auditId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "rootCause" TEXT NOT NULL,
  "containment" TEXT NOT NULL,
  "corrective" TEXT NOT NULL,
  "preventive" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "verifiedBy" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "CorrectiveAction_id_factoryId_key" ON "CorrectiveAction" (id,"factoryId");
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "CostSheet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "laborMinuteMinor" INTEGER NOT NULL,
  "overheadMinor" INTEGER NOT NULL,
  "packingMinor" INTEGER NOT NULL,
  "freightMinor" INTEGER NOT NULL,
  "sellingMinor" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "materialMinor" INTEGER NOT NULL DEFAULT 0,
  "totalMinor" INTEGER NOT NULL DEFAULT 0,
  "marginPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "breakdown" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "CostSheet_id_factoryId_key" ON "CostSheet" (id,"factoryId");
ALTER TABLE "CostSheet" ADD CONSTRAINT "CostSheet_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "ComplianceCheck" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "evidenceUrl" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reviewedBy" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "ComplianceCheck_id_factoryId_key" ON "ComplianceCheck" (id,"factoryId");
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "CapacityScenario" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" TEXT NOT NULL,
  "days" INTEGER NOT NULL,
  "efficiency" DOUBLE PRECISION NOT NULL,
  "overtimeMinutes" INTEGER NOT NULL,
  "operatorsOverride" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "result" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "CapacityScenario_id_factoryId_key" ON "CapacityScenario" (id,"factoryId");
ALTER TABLE "CapacityScenario" ADD CONSTRAINT "CapacityScenario_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "Subcontract" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "receivedQty" INTEGER NOT NULL,
  "sentDate" TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Subcontract_id_factoryId_key" ON "Subcontract" (id,"factoryId");
ALTER TABLE "Subcontract" ADD CONSTRAINT "Subcontract_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "SustainabilityRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "energyKwh" DOUBLE PRECISION NOT NULL,
  "waterLiters" DOUBLE PRECISION NOT NULL,
  "scrapKg" DOUBLE PRECISION NOT NULL,
  "recycledKg" DOUBLE PRECISION NOT NULL,
  "co2Factor" DOUBLE PRECISION NOT NULL,
  "notes" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "SustainabilityRecord_id_factoryId_key" ON "SustainabilityRecord" (id,"factoryId");
ALTER TABLE "SustainabilityRecord" ADD CONSTRAINT "SustainabilityRecord_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;
CREATE TABLE "MutationReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "factoryId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "MutationReceipt_factoryId_actorId_key_key" ON "MutationReceipt" ("factoryId", "actorId", "key");
CREATE UNIQUE INDEX "MutationReceipt_id_factoryId_key" ON "MutationReceipt" (id,"factoryId");
ALTER TABLE "MutationReceipt" ADD CONSTRAINT "MutationReceipt_factory_fk" FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT;

-- Preserve factory boundaries in relational references.
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fk" FOREIGN KEY ("supplierId","factoryId") REFERENCES "Supplier" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_orderId_fk" FOREIGN KEY ("orderId","factoryId") REFERENCES "BuyerOrder" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_bomItemId_fk" FOREIGN KEY ("bomItemId","factoryId") REFERENCES "BomItem" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_supplierId_fk" FOREIGN KEY ("supplierId","factoryId") REFERENCES "Supplier" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_orderId_fk" FOREIGN KEY ("orderId","factoryId") REFERENCES "BuyerOrder" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_bomItemId_fk" FOREIGN KEY ("bomItemId","factoryId") REFERENCES "BomItem" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "LotIssue" ADD CONSTRAINT "LotIssue_lotId_fk" FOREIGN KEY ("lotId","factoryId") REFERENCES "MaterialLot" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "LotIssue" ADD CONSTRAINT "LotIssue_orderId_fk" FOREIGN KEY ("orderId","factoryId") REFERENCES "BuyerOrder" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_cuttingId_fk" FOREIGN KEY ("cuttingId","factoryId") REFERENCES "CuttingRecord" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_lineId_fk" FOREIGN KEY ("lineId","factoryId") REFERENCES "Line" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Downtime" ADD CONSTRAINT "Downtime_lineId_fk" FOREIGN KEY ("lineId","factoryId") REFERENCES "Line" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Downtime" ADD CONSTRAINT "Downtime_machineId_fk" FOREIGN KEY ("machineId","factoryId") REFERENCES "Machine" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_machineId_fk" FOREIGN KEY ("machineId","factoryId") REFERENCES "Machine" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_assignedTo_fk" FOREIGN KEY ("assignedTo","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_workerId_fk" FOREIGN KEY ("workerId","factoryId") REFERENCES "Worker" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "WorkerSkill" ADD CONSTRAINT "WorkerSkill_workerId_fk" FOREIGN KEY ("workerId","factoryId") REFERENCES "Worker" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "WorkerSkill" ADD CONSTRAINT "WorkerSkill_operationId_fk" FOREIGN KEY ("operationId","factoryId") REFERENCES "Operation" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "StationPlan" ADD CONSTRAINT "StationPlan_lineId_fk" FOREIGN KEY ("lineId","factoryId") REFERENCES "Line" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "StationPlan" ADD CONSTRAINT "StationPlan_operationId_fk" FOREIGN KEY ("operationId","factoryId") REFERENCES "Operation" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "QualityAudit" ADD CONSTRAINT "QualityAudit_orderId_fk" FOREIGN KEY ("orderId","factoryId") REFERENCES "BuyerOrder" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "QualityAudit" ADD CONSTRAINT "QualityAudit_lineId_fk" FOREIGN KEY ("lineId","factoryId") REFERENCES "Line" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_auditId_fk" FOREIGN KEY ("auditId","factoryId") REFERENCES "QualityAudit" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_ownerId_fk" FOREIGN KEY ("ownerId","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "CostSheet" ADD CONSTRAINT "CostSheet_orderId_fk" FOREIGN KEY ("orderId","factoryId") REFERENCES "BuyerOrder" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_ownerId_fk" FOREIGN KEY ("ownerId","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Subcontract" ADD CONSTRAINT "Subcontract_supplierId_fk" FOREIGN KEY ("supplierId","factoryId") REFERENCES "Supplier" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Subcontract" ADD CONSTRAINT "Subcontract_orderId_fk" FOREIGN KEY ("orderId","factoryId") REFERENCES "BuyerOrder" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "SustainabilityRecord" ADD CONSTRAINT "SustainabilityRecord_orderId_fk" FOREIGN KEY ("orderId","factoryId") REFERENCES "BuyerOrder" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "LotIssue" ADD CONSTRAINT "LotIssue_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "BundleEvent" ADD CONSTRAINT "BundleEvent_actorId_fk" FOREIGN KEY ("actorId","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Downtime" ADD CONSTRAINT "Downtime_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "WorkerSkill" ADD CONSTRAINT "WorkerSkill_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "StationPlan" ADD CONSTRAINT "StationPlan_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "QualityAudit" ADD CONSTRAINT "QualityAudit_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "CostSheet" ADD CONSTRAINT "CostSheet_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "CapacityScenario" ADD CONSTRAINT "CapacityScenario_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "Subcontract" ADD CONSTRAINT "Subcontract_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "SustainabilityRecord" ADD CONSTRAINT "SustainabilityRecord_createdBy_fk" FOREIGN KEY ("createdBy","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "MutationReceipt" ADD CONSTRAINT "MutationReceipt_actorId_fk" FOREIGN KEY ("actorId","factoryId") REFERENCES "User" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "BundleEvent" ADD CONSTRAINT "BundleEvent_bundle_fk" FOREIGN KEY ("bundleId","factoryId") REFERENCES "Bundle" (id,"factoryId") ON DELETE RESTRICT;
ALTER TABLE "MaterialLot" ADD CONSTRAINT "lot_quantity_valid" CHECK (qty>0 AND "issuedQty">=-0.000001 AND "issuedQty"<=qty+0.000001);
ALTER TABLE "Attendance" ADD CONSTRAINT "attendance_minutes_valid" CHECK ("workedMinutes">=0 AND "overtimeMinutes">=0 AND "workedMinutes"<=1440);
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "purchase_positive" CHECK (qty>0 AND "unitCostMinor">=0 AND "exchangeRate">0);
ALTER TABLE "QualityAudit" ADD CONSTRAINT "sample_valid" CHECK ("sampleSize">0 AND "sampleSize"<="lotSize");
ALTER TABLE "Subcontract" ADD CONSTRAINT "subcontract_quantity_valid" CHECK (qty>0 AND "receivedQty">=0 AND "receivedQty"<=qty);
