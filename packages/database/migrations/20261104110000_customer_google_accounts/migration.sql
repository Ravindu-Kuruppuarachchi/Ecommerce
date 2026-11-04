ALTER TABLE "Customer" ADD COLUMN "googleSubject" TEXT,
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "savedAddress" JSONB;

CREATE UNIQUE INDEX "Customer_storeId_googleSubject_key" ON "Customer"("storeId", "googleSubject");

CREATE TABLE "CustomerSession" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");
CREATE INDEX "CustomerSession_customerId_idx" ON "CustomerSession"("customerId");
CREATE INDEX "CustomerSession_storeId_expiresAt_idx" ON "CustomerSession"("storeId", "expiresAt");
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
