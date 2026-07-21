import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getProgramsByContact = async (req, res) => {
  try {
    const programs = await prisma.customerProgram.findMany({
      where: { contactId: req.params.contactId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(programs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createProgram = async (req, res) => {
  try {
    const {
      contactId, product, variety, origin, grower, incoterm, status, startDate, endDate, notes,
      packType, category, startWeek, totalWeeks, containersPerWeek,
    } = req.body;
    if (!contactId || !product) return res.status(400).json({ error: 'contactId and product are required' });
    const program = await prisma.customerProgram.create({
      data: {
        contactId, product,
        variety: variety || null,
        origin: origin || null,
        grower: grower || null,
        incoterm: incoterm || null,
        packType: packType || null,
        category: category || null,
        startWeek: startWeek ? parseInt(startWeek) : null,
        totalWeeks: totalWeeks ? parseInt(totalWeeks) : null,
        containersPerWeek: containersPerWeek ? parseInt(containersPerWeek) : null,
        status: status || 'Active',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
      }
    });
    res.status(201).json(program);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProgram = async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id; delete data.contactId; delete data.createdAt;
    if (data.startDate !== undefined) data.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined) data.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.startWeek !== undefined) data.startWeek = data.startWeek ? parseInt(data.startWeek) : null;
    if (data.totalWeeks !== undefined) data.totalWeeks = data.totalWeeks ? parseInt(data.totalWeeks) : null;
    if (data.containersPerWeek !== undefined) data.containersPerWeek = data.containersPerWeek ? parseInt(data.containersPerWeek) : null;
    // Marking completed without an end date auto-stamps today
    if (data.status === 'Completed' && !data.endDate) data.endDate = new Date();
    const program = await prisma.customerProgram.update({ where: { id: req.params.id }, data });
    res.json(program);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteProgram = async (req, res) => {
  const { role } = req.user || {};
  if (!['super admin', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Only Admin can delete programs' });
  }
  try {
    await prisma.customerProgram.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
