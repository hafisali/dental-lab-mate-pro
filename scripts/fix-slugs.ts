import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const labs = await prisma.lab.findMany();
  for (const lab of labs) {
    if (lab.slug === null || lab.slug === undefined) {
      const slug = lab.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'clinic';
      await prisma.lab.update({
        where: { id: lab.id },
        data: {
          slug,
          planTier: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      console.log('Updated lab:', lab.name, '->', slug);
    }
  }
}

main().then(() => prisma.$disconnect());
