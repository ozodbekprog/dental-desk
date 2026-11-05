-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "rev" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Record_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Record" ("clinicId", "collection", "createdAt", "data", "docId", "id", "updatedAt") SELECT "clinicId", "collection", "createdAt", "data", "docId", "id", "updatedAt" FROM "Record";
DROP TABLE "Record";
ALTER TABLE "new_Record" RENAME TO "Record";
CREATE INDEX "Record_clinicId_collection_idx" ON "Record"("clinicId", "collection");
CREATE INDEX "Record_clinicId_updatedAt_idx" ON "Record"("clinicId", "updatedAt");
CREATE UNIQUE INDEX "Record_clinicId_collection_docId_key" ON "Record"("clinicId", "collection", "docId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
