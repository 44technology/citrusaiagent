import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixShipments() {
  console.log('Fetching shipments...');
  const shipments = await prisma.shipment.findMany();
  
  console.log(`Found ${shipments.length} shipments.`);
  
  for (const s of shipments) {
    let updated = false;
    const data = {};
    
    // Check if dates are shifted. 
    // Usually, they'd be T00:00:00.000Z if correct, 
    // or T20:00:00.000Z / T21:00:00.000Z if shifted back.
    
    const checkAndFix = (date) => {
      if (!date) return null;
      const hours = date.getUTCHours();
      if (hours !== 0) {
        // It's shifted. We want to snap it to the NEXT day's midnight UTC
        // because T20:00:00Z on March 23 is actually March 24 in Local.
        const newDate = new Date(date);
        newDate.setUTCHours(24, 0, 0, 0); 
        return newDate;
      }
      return null;
    };

    const newEta = checkAndFix(s.vesselEta);
    if (newEta) { data.vesselEta = newEta; updated = true; }

    const newDep = checkAndFix(s.vesselDeparture);
    if (newDep) { data.vesselDeparture = newDep; updated = true; }

    const newArr = checkAndFix(s.vesselArrival);
    if (newArr) { data.vesselArrival = newArr; updated = true; }

    if (updated) {
      console.log(`Fixing shipment ${s.id} (${s.label}):`);
      if (newEta) console.log(`  ETA: ${s.vesselEta.toISOString()} -> ${newEta.toISOString()}`);
      if (newDep) console.log(`  DEP: ${s.vesselDeparture.toISOString()} -> ${newDep.toISOString()}`);
      if (newArr) console.log(`  ARR: ${s.vesselArrival.toISOString()} -> ${newArr.toISOString()}`);
      
      await prisma.shipment.update({
        where: { id: s.id },
        data
      });
    }
  }
  
  console.log('Done.');
}

fixShipments()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
