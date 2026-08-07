-- CreateTable
CREATE TABLE "call_events" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "locale" TEXT,
    "source" TEXT NOT NULL DEFAULT 'detail',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_events_listingId_createdAt_idx" ON "call_events"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "call_events_createdAt_idx" ON "call_events"("createdAt");

-- AddForeignKey
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

