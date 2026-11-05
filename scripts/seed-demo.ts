import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { demoRecords } from "../lib/demo";

const prisma = new PrismaClient();
const reset = process.argv.includes("--reset");

async function main() {
  let clinic = await prisma.clinic.findUnique({ where: { slug: "demo" } });

  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        name: "Demo Klinika",
        slug: "demo",
        plan: "clinic",
        status: "active",
      },
    });
    console.log("Demo clinic created.");
  } else if (reset) {
    await prisma.record.deleteMany({ where: { clinicId: clinic.id } });
    await prisma.clinic.update({
      where: { id: clinic.id },
      data: { name: "Demo Klinika", plan: "clinic", status: "active" },
    });
    console.log("Demo records cleared.");
  }

  let owner = await prisma.user.findFirst({
    where: { clinicId: clinic.id, role: "owner" },
  });
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        clinicId: clinic.id,
        name: "Demo Klinika",
        email: "demo@dentaldesk.uz",
        passwordHash: await bcrypt.hash(randomUUID(), 10),
        role: "owner",
      },
    });
    console.log("Demo owner created.");
  }

  const count = await prisma.record.count({ where: { clinicId: clinic.id } });
  if (count === 0) {
    const records = demoRecords();
    await prisma.record.createMany({
      data: records.map((r) => ({
        clinicId: clinic.id,
        collection: r.collection,
        docId: r.docId,
        data: JSON.stringify(r.data),
      })),
    });
    console.log(`Seeded ${records.length} demo records.`);
  } else {
    console.log(`Demo clinic already has ${count} records.`);
  }

  console.log(`Demo clinic: ${clinic.id} (slug: demo)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
