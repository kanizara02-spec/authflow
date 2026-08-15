import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import argon2 from "argon2";

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@authflow.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!12345";

  const adminPasswordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPasswordHash, status: "ACTIVE" },
    create: {
      email: adminEmail,
      fullName: "AuthFlow Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      securitySettings: { create: {} },
    },
  });
  console.log(`Seeded admin user: ${adminEmail} / ${adminPassword} (change this immediately outside local dev)`);

  const demoPasswordHash = await argon2.hash("DemoUser!2024", { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email: "demo@authflow.local" },
    update: { passwordHash: demoPasswordHash, status: "ACTIVE" },
    create: {
      email: "demo@authflow.local",
      fullName: "Demo User",
      passwordHash: demoPasswordHash,
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      securitySettings: { create: {} },
    },
  });
  console.log("Seeded demo user: demo@authflow.local / DemoUser!2024");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
