import { createPrismaClient } from "../lib/prisma-client";
import bcrypt from "bcryptjs";

const prisma = createPrismaClient();

async function main() {
  const email = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL va ADMIN_PASSWORD .env faylida bo'lishi kerak");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD kamida 8 belgi bo'lsin");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: "Super Admin", passwordHash, role: "super" },
    update: { passwordHash, role: "super", clinicId: null },
  });

  console.log(`Super admin tayyor: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
