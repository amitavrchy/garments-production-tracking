-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "invoiceNo" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "deliveryDate" TEXT NOT NULL,
    "shippedAt" TIMESTAMP(3),

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingCarton" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "cartonNo" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "pcs" INTEGER NOT NULL,

    CONSTRAINT "PackingCarton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceRateEntry" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "pcs" INTEGER NOT NULL,
    "rateMinor" INTEGER NOT NULL,
    "amountMinor" INTEGER NOT NULL,

    CONSTRAINT "PieceRateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "calculatedBy" TEXT,
    "approvedBy" TEXT,
    "breakdown" JSONB,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Style" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "smv" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Style_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BomItem" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "consumptionPerPc" DOUBLE PRECISION NOT NULL,
    "wastageBps" INTEGER NOT NULL DEFAULT 0,
    "uom" TEXT NOT NULL,

    CONSTRAINT "BomItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "smv" DOUBLE PRECISION NOT NULL,
    "pieceRateMinor" INTEGER NOT NULL,
    "machineType" TEXT NOT NULL DEFAULT 'SNLS',

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerOrder" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "deliveryDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderQuantity" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "OrderQuantity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialMovement" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "bomItemId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "MaterialMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',

    CONSTRAINT "Factory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Line" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "targetManpower" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "Line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skillGrade" TEXT NOT NULL DEFAULT 'B',

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineAssignment" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 8,

    CONSTRAINT "LineAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "lineIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "target" INTEGER NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuttingRecord" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "layNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "date" TEXT NOT NULL,

    CONSTRAINT "CuttingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyProduction" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "hourStart" INTEGER NOT NULL,
    "producedPcs" INTEGER NOT NULL,
    "inputPcs" INTEGER NOT NULL,
    "operators" INTEGER NOT NULL,
    "availableMinutes" INTEGER NOT NULL DEFAULT 60,
    "enteredBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "HourlyProduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcInspection" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "inspectedPcs" INTEGER NOT NULL,
    "defectCode" TEXT NOT NULL,
    "defectCount" INTEGER NOT NULL,
    "reworkPcs" INTEGER NOT NULL,
    "resolvedPcs" INTEGER NOT NULL DEFAULT 0,
    "rejectedPcs" INTEGER NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "QcInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishingRecord" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "FinishingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_factoryId_invoiceNo_key" ON "Shipment"("factoryId", "invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "PackingCarton_shipmentId_cartonNo_key" ON "PackingCarton"("shipmentId", "cartonNo");

-- CreateIndex
CREATE INDEX "PieceRateEntry_factoryId_workerId_date_idx" ON "PieceRateEntry"("factoryId", "workerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_factoryId_code_key" ON "Buyer"("factoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Style_factoryId_code_key" ON "Style"("factoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Operation_styleId_seq_key" ON "Operation"("styleId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerOrder_factoryId_buyerId_poNumber_key" ON "BuyerOrder"("factoryId", "buyerId", "poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OrderQuantity_orderId_color_size_key" ON "OrderQuantity"("orderId", "color", "size");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_factoryId_name_key" ON "Floor"("factoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Line_factoryId_code_key" ON "Line"("factoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_factoryId_code_key" ON "Machine"("factoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_factoryId_employeeCode_key" ON "Worker"("factoryId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "LineAssignment_workerId_date_lineId_key" ON "LineAssignment"("workerId", "date", "lineId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuditLog_factoryId_at_idx" ON "AuditLog"("factoryId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Allocation_lineId_date_key" ON "Allocation"("lineId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyProduction_lineId_date_hourStart_key" ON "HourlyProduction"("lineId", "date", "hourStart");

