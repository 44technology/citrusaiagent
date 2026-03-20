import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
