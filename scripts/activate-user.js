const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || "kani@test.com";
  const user = await prisma.user.update({
    where: { email },
    data: { status: "ACTIVE", emailVerifiedAt: new Date() },
  });
  console.log(`Successfully activated user: ${user.email} (${user.fullName})`);
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
