/**
 * MongoDB Cleanup Script — Post Agent Refactor
 * 
 * Removes stale fields from the agent token refactor:
 * 1. Deletes all BoardAccess docs (they lack agentId, will be re-created)
 * 2. Clears stale agentId values on Cards (pointed to old BoardAccess IDs)
 * 3. Clears stale assigneeId values on Cards (field removed from schema)
 * 4. Removes orphan fields (agentName, agentToken, shareToken) from BoardAccess
 * 
 * Usage: npx ts-node scripts/cleanup-stale-fields.ts
 * 
 * Requires DATABASE_URL in .env
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting stale field cleanup...\n');

  // 1. Count and delete all BoardAccess documents
  const baCount = await prisma.boardAccess.count();
  console.log(`📋 BoardAccess documents: ${baCount}`);
  if (baCount > 0) {
    const { count } = await prisma.boardAccess.deleteMany({});
    console.log(`   ✅ Deleted ${count} BoardAccess documents\n`);
  } else {
    console.log('   ⏭️  No BoardAccess to delete\n');
  }

  // 2. Clear stale agentId on Cards (pointed to old BoardAccess)
  //    We unset these via raw MongoDB since Prisma can't $unset
  const cardsWithAgent = await prisma.card.count({
    where: { agentId: { not: null } },
  });
  console.log(`🏷️  Cards with agentId: ${cardsWithAgent}`);
  if (cardsWithAgent > 0) {
    await prisma.$runCommandRaw({
      update: 'Card',
      updates: [
        {
          q: { agentId: { $ne: null } },
          u: { $unset: { agentId: '' } },
          multi: true,
        },
      ],
    });
    console.log(`   ✅ Cleared agentId on ${cardsWithAgent} cards\n`);
  } else {
    console.log('   ⏭️  No stale agentId to clear\n');
  }

  // 3. Remove stale assigneeId from Cards (via raw MongoDB $unset)
  //    assigneeId was removed from schema, so we can't use Prisma's typed query
  const assigneeResult: any = await prisma.$runCommandRaw({
    count: 'Card',
    query: { assigneeId: { $exists: true, $ne: null } },
  });
  const cardsWithAssignee = assigneeResult?.n ?? 0;
  console.log(`👤 Cards with stale assigneeId: ${cardsWithAssignee}`);
  if (cardsWithAssignee > 0) {
    await prisma.$runCommandRaw({
      update: 'Card',
      updates: [
        {
          q: { assigneeId: { $exists: true, $ne: null } },
          u: { $unset: { assigneeId: '' } },
          multi: true,
        },
      ],
    });
    console.log(`   ✅ Unset assigneeId on ${cardsWithAssignee} cards\n`);
  } else {
    console.log('   ⏭️  No stale assigneeId to clear\n');
  }

  // 4. Remove stale agentName/agentToken/shareToken from BoardAccess (if any survive)
  //    These fields are ignored by Prisma but waste space
  await prisma.$runCommandRaw({
    update: 'BoardAccess',
    updates: [
      {
        q: { $or: [
          { agentName: { $exists: true } },
          { agentToken: { $exists: true } },
          { shareToken: { $exists: true } },
        ]},
        u: { $unset: { agentName: '', agentToken: '', shareToken: '' } },
        multi: true,
      },
    ],
  });
  console.log('🧼 Cleaned orphan fields (agentName, agentToken, shareToken) from BoardAccess\n');

  console.log('✨ Cleanup complete!');
}

main()
  .catch((e: Error) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
