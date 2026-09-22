// One-off utility: delete a User row by email, if it exists.
//
// Written for Fase 0 (22 Sep 2026): bari@gmail.com was one of the 5
// personal accounts migrated from Login.tsx's hardcoded demoAccounts
// into prisma/seed.ts's demoUsers (see that file's comment), then
// explicitly excluded again by request before this seed had necessarily
// been run everywhere. If `npm run db:seed` already created that row in
// a given database, this removes it; if it was never created there,
// this is a safe no-op.
//
// Session.userId cascades on delete (schema.prisma), so removing the
// user is enough for that relation. Other relations to User
// (DistributorSubmittedBy/DecidedBy, StoreSubmittedBy/DecidedBy,
// TaskOwner, OpportunityOwner, AuditLogEntry) do NOT cascade -- if the
// account has already submitted/decided/owned anything, the delete
// below fails with a foreign-key error instead of silently orphaning
// those rows, which is intentional: investigate before forcing it.
//
// Run with: npx tsx prisma/scripts/remove-user.ts <email>
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx prisma/scripts/remove-user.ts <email>');
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`No user found with email "${email}" -- nothing to remove.`);
    return;
  }

  await prisma.user.delete({ where: { id: user.id } });
  console.log(`Removed user "${email}" (id ${user.id}, role ${user.role}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
