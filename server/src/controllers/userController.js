import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

export const ROLES = [
  'super admin', 'admin', 'sales', 'logistics', 'operation', 'grower support', 'accounting', 'customer'
];

export const createUser = async (req, res) => {
  const { role: callerRole } = req.user || {};
  if (!['super admin','admin'].includes(callerRole)) return res.status(403).json({ error: 'Only Admin can create users' });

  const { username, password, role, contactId } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, role, contactId: contactId || null },
      select: { id: true, username: true, role: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.user || {};
    if (role !== 'super admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        contactId: true,
        contact: {
          select: {
            name: true,
            company: true
          }
        },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role: newRole } = req.body;
  const { role: currentUserRole } = req.user || {};

  try {
    if (currentUserRole !== 'super admin') {
      return res.status(403).json({ error: 'Only Super Admin can change roles' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: newRole }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  const { role } = req.user || {};

  try {
    if (role !== 'super admin') {
      return res.status(403).json({ error: 'Only Super Admin can delete users' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
