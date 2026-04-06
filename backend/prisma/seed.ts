import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Database...");
  
  // Clean up
  await prisma.examEvent.deleteMany({});
  await prisma.appeal.deleteMany({});
  await prisma.session.deleteMany({});

  // Seed session 1: Normal user
  const s1 = await prisma.session.create({
      data: {
          studentId: 'SE123001',
          resumeToken: 'normal_token_123',
          accessibilityMode: false,
          status: 'ACTIVE',
          riskScore: 0
      }
  });

  // Seed session 2: Flagged user (Suspended)
  const s2 = await prisma.session.create({
      data: {
          studentId: 'SE123049',
          resumeToken: 'suspended_token_456',
          accessibilityMode: false,
          status: 'SUSPENDED',
          riskScore: 120
      }
  });

  // Events for session 2
  await prisma.examEvent.createMany({
      data: [
          { sessionId: s2.id, clientSeqNo: 1, eventType: 'TAB_SWITCH', weight: 30, timestamp: new Date() },
          { sessionId: s2.id, clientSeqNo: 2, eventType: 'DEVTOOLS_DETECTED', weight: 100, timestamp: new Date() }
      ]
  });

  // Seed Appeal for Session 2
  await prisma.appeal.create({
      data: {
          sessionId: s2.id,
          reason: 'DevTools was opened automatically by an extension I forgot to disable.',
          status: 'PENDING'
      }
  });

  console.log("Seeding Database Complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
