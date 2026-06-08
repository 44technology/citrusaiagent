import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET /api/vendor-packages?growerId=xxx
export const getAll = async (req, res) => {
  try {
    const where = {};
    if (req.companyId) where.companyId = req.companyId;
    if (req.query.growerId) where.growerId = req.query.growerId;

    const packages = await prisma.vendorPackage.findMany({
      where,
      include: { grower: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/vendor-packages
export const create = async (req, res) => {
  try {
    const { growerId, product, variety, boxType, size, quantity, pricePerBox, week, season, notes, status } = req.body;
    if (!growerId || !product || !variety || !quantity) {
      return res.status(400).json({ error: 'growerId, product, variety, quantity required' });
    }
    const pkg = await prisma.vendorPackage.create({
      data: {
        growerId,
        product,
        variety,
        boxType: boxType || null,
        size: size || null,
        quantity: parseInt(quantity),
        pricePerBox: pricePerBox ? parseFloat(pricePerBox) : null,
        week: week ? parseInt(week) : null,
        season: season || null,
        notes: notes || null,
        status: status || 'Available',
        companyId: req.companyId || null,
      },
      include: { grower: { select: { id: true, name: true } } }
    });
    res.status(201).json(pkg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/vendor-packages/:id
export const update = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.quantity) data.quantity = parseInt(data.quantity);
    if (data.pricePerBox) data.pricePerBox = parseFloat(data.pricePerBox);
    if (data.week) data.week = parseInt(data.week);
    delete data.id; delete data.growerId; delete data.createdAt; delete data.updatedAt; delete data.grower;

    const pkg = await prisma.vendorPackage.update({
      where: { id: req.params.id },
      data,
      include: { grower: { select: { id: true, name: true } } }
    });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/vendor-packages/:id
export const remove = async (req, res) => {
  try {
    await prisma.vendorPackage.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
