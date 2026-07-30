import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getCarriers = async (req, res) => {
  try {
    const where = req.companyId ? { companyId: req.companyId } : {};
    const carriers = await prisma.carrier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { documents: true } } },
    });
    res.json(carriers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCarrier = async (req, res) => {
  try {
    const { name, type, scacCode, contactName, phone, email, notes, status } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
    const carrier = await prisma.carrier.create({
      data: {
        name, type,
        scacCode: scacCode || null,
        contactName: contactName || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        status: status || 'Active',
        companyId: req.companyId || null,
      }
    });
    res.status(201).json(carrier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCarrier = async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id; delete data.createdAt; delete data._count;
    const carrier = await prisma.carrier.update({ where: { id: req.params.id }, data });
    res.json(carrier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCarrier = async (req, res) => {
  const { role } = req.user || {};
  if (!['super admin', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Only Admin can delete carriers' });
  }
  try {
    await prisma.carrier.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
