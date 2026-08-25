import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.job.createMany({
    data: [
      {
        type: 'TEST',
        payload: { task: 'make somethig' },
        status: 'COMPLETED',
        priority: 'HIGH',
      },
      {
        type: 'EMAIL',
        payload: { task: 'make somethig else' },
        status: 'PENDING',
        priority: 'MEDIUM',
      },
      {
        type: 'REPORT',
        payload: { task: 'complete all task' },
        status: 'FAILED',
        error: 'demo error',
        attempts: 4,
      },
    ],
  });
  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
