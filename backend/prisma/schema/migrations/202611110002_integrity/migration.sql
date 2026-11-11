-- Tenant-aware database references supplement the application validation registry.
DO $$
DECLARE item RECORD;
BEGIN
  FOR item IN SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='factoryId'
  LOOP
    EXECUTE format('CREATE UNIQUE INDEX %I ON %I (id, "factoryId")', item.table_name || '_id_factoryId_key', item.table_name);
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("factoryId") REFERENCES "Factory"(id) ON DELETE RESTRICT', item.table_name, item.table_name || '_factory_fk');
  END LOOP;
END $$;

DO $$
DECLARE item RECORD;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('Line','floorId','Floor'),('Machine','lineId','Line'),
    ('BomItem','styleId','Style'),('Operation','styleId','Style'),
    ('BuyerOrder','buyerId','Buyer'),('BuyerOrder','styleId','Style'),
    ('OrderQuantity','orderId','BuyerOrder'),('Milestone','orderId','BuyerOrder'),
    ('MaterialMovement','orderId','BuyerOrder'),('MaterialMovement','bomItemId','BomItem'),
    ('LineAssignment','lineId','Line'),('LineAssignment','workerId','Worker'),
    ('Allocation','lineId','Line'),('Allocation','orderId','BuyerOrder'),
    ('CuttingRecord','orderId','BuyerOrder'),
    ('HourlyProduction','orderId','BuyerOrder'),('HourlyProduction','lineId','Line'),('HourlyProduction','enteredBy','User'),
    ('QcInspection','orderId','BuyerOrder'),('QcInspection','lineId','Line'),
    ('FinishingRecord','orderId','BuyerOrder'),('Shipment','orderId','BuyerOrder'),
    ('PackingCarton','orderId','BuyerOrder'),('PackingCarton','shipmentId','Shipment'),
    ('PieceRateEntry','workerId','Worker'),('PieceRateEntry','orderId','BuyerOrder'),('PieceRateEntry','operationId','Operation'),
    ('AuditLog','actorId','User')
  ) AS refs(source, field, target)
  LOOP
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I, "factoryId") REFERENCES %I(id, "factoryId") ON DELETE RESTRICT', item.source, item.source || '_' || item.field || '_fk', item.field, item.target);
  END LOOP;
END $$;

ALTER TABLE "HourlyProduction" ADD CONSTRAINT "hourly_valid" CHECK (
  "producedPcs">=0 AND "inputPcs">=0 AND operators>0 AND "hourStart" BETWEEN 0 AND 23 AND "availableMinutes">0
);
ALTER TABLE "QcInspection" ADD CONSTRAINT "qc_valid" CHECK (
  "inspectedPcs">0 AND "defectCount">=0 AND "reworkPcs">=0 AND "rejectedPcs">=0 AND "resolvedPcs" BETWEEN 0 AND "reworkPcs" AND "reworkPcs"+"rejectedPcs"<="inspectedPcs"
);
ALTER TABLE "PieceRateEntry" ADD CONSTRAINT "piece_earnings_valid" CHECK (
  pcs>0 AND "rateMinor">=0 AND "amountMinor"=pcs*"rateMinor"
);
ALTER TABLE "OrderQuantity" ADD CONSTRAINT "quantity_positive" CHECK (qty>0);
ALTER TABLE "CuttingRecord" ADD CONSTRAINT "cutting_positive" CHECK (qty>0);
ALTER TABLE "FinishingRecord" ADD CONSTRAINT "finishing_positive" CHECK (qty>0);
ALTER TABLE "PackingCarton" ADD CONSTRAINT "carton_positive" CHECK (pcs>0);
ALTER TABLE "MaterialMovement" ADD CONSTRAINT "movement_positive" CHECK (qty>0);
ALTER TABLE "LineAssignment" ADD CONSTRAINT "hours_valid" CHECK (hours>0 AND hours<=24);
