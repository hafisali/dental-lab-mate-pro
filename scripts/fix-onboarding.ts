import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Mark existing labs as onboarded so they don't get stuck
  const result = await prisma.lab.updateMany({
    where: { onboardingComplete: false },
    data: { onboardingComplete: true },
  });
  console.log(`Updated ${result.count} lab(s) to onboardingComplete=true`);
}

main().then(() => prisma.$disconnect());
