import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
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
    const order = await prisma.order.create({
      data: req.body
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOrder = async (req, res) => {
  const { id } = req.params;
  try {
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
  try {
    await prisma.order.delete({ where: { id } });
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
