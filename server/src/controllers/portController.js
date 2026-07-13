import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getPorts = async (req, res) => {
  try {
    const where = req.companyId ? { companyId: req.companyId } : {};
    const ports = await prisma.portLocation.findMany({ where, orderBy: { name: 'asc' } });
    res.json(ports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createPort = async (req, res) => {
  const { role } = req.user || {};
  if (role !== 'super admin') return res.status(403).json({ error: 'Only Super Admin can add ports' });
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const trimmed = name.trim();
    const existing = await prisma.portLocation.findFirst({
      where: { name: trimmed, companyId: req.companyId || null }
    });
    if (existing) return res.json(existing);
    const port = await prisma.portLocation.create({
      data: { name: trimmed, companyId: req.companyId || null }
    });
    res.status(201).json(port);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deletePort = async (req, res) => {
  const { role } = req.user || {};
  if (role !== 'super admin') return res.status(403).json({ error: 'Only Super Admin can delete ports' });
  try {
    await prisma.portLocation.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
