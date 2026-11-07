-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DoctorProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "specialty" TEXT NOT NULL DEFAULT 'therapist',
    "licenseNo" TEXT NOT NULL DEFAULT '',
    "experience" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "contract" TEXT NOT NULL DEFAULT 'clinic',
    "status" TEXT NOT NULL DEFAULT 'active',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT NOT NULL DEFAULT '',
    "mapUrl" TEXT NOT NULL DEFAULT '',
    "priceFrom" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DoctorProfile" ("address", "bio", "contract", "createdAt", "email", "experience", "id", "isPublic", "licenseNo", "mapUrl", "name", "phone", "photoUrl", "ratingAvg", "ratingCount", "specialty", "status", "userId") SELECT "address", "bio", "contract", "createdAt", "email", "experience", "id", "isPublic", "licenseNo", "mapUrl", "name", "phone", "photoUrl", "ratingAvg", "ratingCount", "specialty", "status", "userId" FROM "DoctorProfile";
DROP TABLE "DoctorProfile";
ALTER TABLE "new_DoctorProfile" RENAME TO "DoctorProfile";
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");
CREATE INDEX "DoctorProfile_status_isPublic_idx" ON "DoctorProfile"("status", "isPublic");
CREATE INDEX "DoctorProfile_name_idx" ON "DoctorProfile"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
