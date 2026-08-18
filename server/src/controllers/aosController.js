import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const AOS_FIELDS = [
  'aosNumber', 'date', 'invoiceNumber',
  'growerContactId', 'growerName', 'growerAddress',
  'adminFeePct', 'advance', 'remarks', 'status',
];

const pick = (obj, fields) => fields.reduce((acc, f) => {
  if (obj[f] !== undefined) acc[f] = obj[f];
  return acc;
}, {});

const shipmentWithExpenses = (shipmentId) => prisma.shipment.findUnique({
  where: { id: shipmentId },
  include: {
    expenses: { orderBy: { createdAt: 'asc' } },
    contact: { select: { id: true, name: true, address: true, city: true, state: true, zip: true, country: true } },
    order: { select: { grower: true, contactId: true } },
  },
});

// GET /api/aos/by-shipment/:shipmentId — AOS metadata (or null) + the live
// shipment + its expenses, so the frontend can render the report without a
// second round trip.
export const getByShipment = async (req, res) => {
  try {
    const [aos, shipment] = await Promise.all([
      prisma.accountOfSale.findUnique({ where: { shipmentId: req.params.shipmentId } }),
      shipmentWithExpenses(req.params.shipmentId),
    ]);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    res.json({ aos, shipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/aos — list every shipment that has expense/revenue activity, with
// its AOS metadata if one has been created yet (for an index view).
export const getAll = async (req, res) => {
  try {
    const where = req.companyId ? { companyId: req.companyId } : {};
    const shipments = await prisma.shipment.findMany({
      where: { ...where, expenses: { some: {} } },
      include: {
        expenses: true,
        accountOfSale: true,
        contact: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/aos/by-shipment/:shipmentId — create or update the AOS metadata
export const upsertForShipment = async (req, res) => {
  const { shipmentId } = req.params;
  const data = pick(req.body, AOS_FIELDS);
  if (data.date) data.date = new Date(data.date);

  try {
    const existing = await prisma.accountOfSale.findUnique({ where: { shipmentId } });
    let aos;
    if (existing) {
      aos = await prisma.accountOfSale.update({ where: { shipmentId }, data });
    } else {
      const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
      if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
      aos = await prisma.accountOfSale.create({
        data: {
          shipmentId,
          companyId: req.companyId || null,
          createdBy: req.user?.username || null,
          aosNumber: shipment.referenceId || shipment.shipmentRefId || null,
          growerName: shipment.grower || null,
          advance: shipment.advToGrower || 0,
          ...data,
        },
      });
    }
    res.json(aos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/aos/:id
export const deleteAos = async (req, res) => {
  try {
    await prisma.accountOfSale.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
