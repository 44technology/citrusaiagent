/**
 * Renumber all orders starting from 2026001,
 * ordered by departureWeek ASC (null last), then createdAt ASC.
 *
 * Run: node renumber_orders.js
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Fetch all orders, oldest departure first
  const orders = await prisma.order.findMany({
    orderBy: [
      { departureWeek: 'asc' },
      { createdAt: 'asc' },
    ],
    select: { id: true, referenceId: true, departureWeek: true, createdAt: true },
  });

  console.log(`Found ${orders.length} orders to renumber`);

  // Use a temp prefix to avoid unique constraint conflicts during update
  const TEMP = 'TEMP_';
  for (let i = 0; i < orders.length; i++) {
    await prisma.order.update({
      where: { id: orders[i].id },
      data: { referenceId: TEMP + orders[i].id },
    });
  }

  // Now assign final IDs
  const START = 2026001;
  for (let i = 0; i < orders.length; i++) {
    const newRefId = String(START + i);
    await prisma.order.update({
      where: { id: orders[i].id },
      data: { referenceId: newRefId },
    });
    console.log(`  ${orders[i].referenceId} → ${newRefId}  (depWeek: ${orders[i].departureWeek ?? 'null'})`);
  }

  console.log('\nDone ✅');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
