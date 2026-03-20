import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllOrders = async (req, res) => {
  try {
    const { userId, role } = req.user || {};
    let where = {};
    
    // If user is a customer, only show their own orders
    if (role === 'customer' && userId) {
      where = { userId };
    }

    const orders = await prisma.order.findMany({
      where,
      include: { contact: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getContactOrders = async (req, res) => {
  const { contactId } = req.params;
  try {
    const orders = await prisma.order.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { userId } = req.user || {};
    const orderData = {
      ...req.body,
      userId: userId || null
    };

    const order = await prisma.order.create({
      data: orderData
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { role } = req.user || {};

  try {
    // If trying to update status, check if user is admin/op
    if (req.body.status && role !== 'admin' && role !== 'operation') {
      return res.status(403).json({ error: 'Only operation team can update order status' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: req.body
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  const { role } = req.user || {};

  if (role !== 'super admin') {
    return res.status(403).json({ error: 'Only Super Admin can delete orders' });
  }

  try {
    await prisma.order.delete({ where: { id } });
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
