-- CreateTable
CREATE TABLE "TreatmentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "bookingId" TEXT,
    "patientName" TEXT NOT NULL DEFAULT '',
    "patientPhone" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL,
    "tooth" INTEGER NOT NULL,
    "procedure" TEXT NOT NULL,
    "surfaces" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TreatmentRecord_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TreatmentRecord_doctorId_date_idx" ON "TreatmentRecord"("doctorId", "date");

-- CreateIndex
CREATE INDEX "TreatmentRecord_doctorId_tooth_idx" ON "TreatmentRecord"("doctorId", "tooth");

-- CreateIndex
CREATE INDEX "TreatmentRecord_doctorId_visitId_idx" ON "TreatmentRecord"("doctorId", "visitId");

-- CreateIndex
CREATE INDEX "TreatmentRecord_bookingId_idx" ON "TreatmentRecord"("bookingId");
