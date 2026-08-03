// One-off fix: revert orders 260062/260063 back to offer IDs OFR-1001/OFR-1002
// since no shipment has been created for them yet.
// Run from server/ with: node scripts/revert-to-offer-ids.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const REVERTS = [
  { referenceId: '260062', offerId: 'OFR-1001' },
  { referenceId: '260063', offerId: 'OFR-1002' },
];

const run = async () => {
  for (const { referenceId, offerId } of REVERTS) {
    const order = await prisma.order.findUnique({ where: { referenceId } });
    if (!order) {
      console.log(`⚠ No order found with referenceId ${referenceId} — skipping`);
      continue;
    }
    const taken = await prisma.order.findUnique({ where: { offerId } });
    if (taken && taken.id !== order.id) {
      console.log(`✗ ${offerId} is already used by another order (${taken.referenceId || taken.offerId}) — skipping ${referenceId}`);
      continue;
    }
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { referenceId: null, offerId },
    });
    console.log(`✓ #${referenceId} → ${updated.offerId} (referenceId cleared)`);
  }
  await prisma.$disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
