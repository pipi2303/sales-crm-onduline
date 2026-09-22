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
// The account may already have been used for something before removal
// was requested (submitted/decided a Distributor or Store, owns a Task
// or Opportunity, or has AuditLogEntry rows as actor) -- Session.userId
// is the only relation that cascades on delete (schema.prisma); the rest
// (DistributorSubmittedBy/DecidedBy, StoreSubmittedBy/DecidedBy,
// TaskOwner, OpportunityOwner, AuditLogEntry.actor) are all optional
// (`User?`) foreign keys, so this DETACHES them (sets to null) rather
// than deleting the Distributor/Store/Task/Opportunity/audit-log rows
// themselves -- removing the account should not destroy real business
// records that happen to reference it. Prints exactly what it detached
// before deleting the user, so it's auditable.
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

  const id = user.id;
  console.log(`Found user "${email}" (id ${id}, role ${user.role}). Checking for linked records...`);

  const [
    distributorsSubmitted,
    distributorsDecided,
    storesSubmitted,
    storesDecided,
    opportunitiesOwned,
    tasksOwned,
    auditEntries,
  ] = await Promise.all([
    prisma.distributor.findMany({ where: { submittedById: id }, select: { id: true, code: true, name: true } }),
    prisma.distributor.findMany({ where: { decidedById: id }, select: { id: true, code: true, name: true } }),
    prisma.store.findMany({ where: { submittedById: id }, select: { id: true, code: true, name: true } }),
    prisma.store.findMany({ where: { decidedById: id }, select: { id: true, code: true, name: true } }),
    prisma.opportunity.findMany({ where: { ownerId: id }, select: { id: true, name: true } }),
    prisma.task.findMany({ where: { ownerId: id }, select: { id: true, title: true } }),
    prisma.auditLogEntry.count({ where: { actorId: id } }),
  ]);

  const report = [
    ['Distributor (submitted by)', distributorsSubmitted],
    ['Distributor (decided by)', distributorsDecided],
    ['Store (submitted by)', storesSubmitted],
    ['Store (decided by)', storesDecided],
    ['Opportunity (owner)', opportunitiesOwned],
    ['Task (owner)', tasksOwned],
  ] as const;

  let anyLinked = auditEntries > 0;
  for (const [label, rows] of report) {
    if (rows.length > 0) {
      anyLinked = true;
      console.log(`  - ${label}: ${rows.length} row(s) -> ${rows.map((r: any) => r.code ?? r.name ?? r.title ?? r.id).join(', ')}`);
    }
  }
  if (auditEntries > 0) {
    console.log(`  - AuditLogEntry (actor): ${auditEntries} row(s)`);
  }
  if (!anyLinked) {
    console.log('  (nothing linked)');
  }

  await prisma.$transaction([
    prisma.distributor.updateMany({ where: { submittedById: id }, data: { submittedById: null } }),
    prisma.distributor.updateMany({ where: { decidedById: id }, data: { decidedById: null } }),
    prisma.store.updateMany({ where: { submittedById: id }, data: { submittedById: null } }),
    prisma.store.updateMany({ where: { decidedById: id }, data: { decidedById: null } }),
    prisma.opportunity.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
    prisma.task.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
    prisma.auditLogEntry.updateMany({ where: { actorId: id }, data: { actorId: null } }),
  ]);

  await prisma.user.delete({ where: { id } });
  console.log(`Removed user "${email}" (id ${id}). Any linked records above were detached (foreign key set to null), not deleted.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
