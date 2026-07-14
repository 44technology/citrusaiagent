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
    if (req.companyId) where.companyId = req.companyId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        contact: true,
        purchaseOrders: { select: { id: true, poNumber: true, status: true, totalAmount: true } },
        invoices: { select: { id: true, invoiceNumber: true, status: true, type: true, amount: true } },
        shipments: { select: { id: true, containerNumber: true, status: true, vesselName: true, vesselEta: true } },
      },
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

const generateRefId = async () => {
  const START = 2026001;
  const last = await prisma.order.findFirst({
    where: { referenceId: { gte: String(START) } },
    orderBy: { referenceId: 'desc' },
    select: { referenceId: true }
  });
  if (!last) return String(START);
  const num = parseInt(last.referenceId, 10);
  return String(isNaN(num) ? START : num + 1);
};

export const createOrder = async (req, res) => {
  try {
    const { userId } = req.user || {};
    const {
      grower, shipper, product, label, variety, boxType,
      boxQuantity, purchasePrice, salePrice, expense,
      receiver, week, departureWeek, arrivalWeek, status, contactId,
      advancePaymentTerms, advancePaymentPct, advancePaymentAmount,
      note, departurePort, arrivalPort
    } = req.body;

    const referenceId = await generateRefId();

    const order = await prisma.order.create({
      data: {
        referenceId,
        grower: grower || null,
        shipper: shipper || null,
        product,
        label: label || null,
        variety,
        boxType: boxType || null,
        boxQuantity: parseInt(boxQuantity) || 0,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        salePrice: salePrice ? parseFloat(salePrice) : null,
        expense: expense ? parseFloat(expense) : null,
        receiver: receiver || null,
        week: week || null,
        departureWeek: departureWeek ? parseInt(departureWeek) : null,
        arrivalWeek: arrivalWeek ? parseInt(arrivalWeek) : null,
        status: status || 'pending',
        userId: userId || null,
        contactId,
        companyId: req.companyId || null,
        advancePaymentTerms: advancePaymentTerms ? parseInt(advancePaymentTerms) : null,
        advancePaymentPct: advancePaymentPct ? parseFloat(advancePaymentPct) : null,
        advancePaymentAmount: advancePaymentAmount ? parseFloat(advancePaymentAmount) : null,
        note: note || null,
        departurePort: departurePort || null,
        arrivalPort: arrivalPort || null,
      },
      include: { contact: true }
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
    if (req.body.status && role !== 'admin' && role !== 'operation' && role !== 'super admin') {
      return res.status(403).json({ error: 'Only operation team can update order status' });
    }

    const data = { ...req.body };
    // Strip read-only and relation fields
    ['referenceId', 'id', 'contact', 'user', 'createdAt', 'updatedAt', 'purchaseOrders', 'invoices', 'documents', 'shipments', 'tenant'].forEach(k => delete data[k]);
    // Parse numeric fields
    if (data.purchasePrice !== undefined) data.purchasePrice = data.purchasePrice ? parseFloat(data.purchasePrice) : null;
    if (data.salePrice !== undefined) data.salePrice = data.salePrice ? parseFloat(data.salePrice) : null;
    if (data.expense !== undefined) data.expense = data.expense ? parseFloat(data.expense) : null;
    if (data.boxQuantity !== undefined) data.boxQuantity = parseInt(data.boxQuantity) || 0;
    if (data.departureWeek !== undefined) data.departureWeek = data.departureWeek ? parseInt(data.departureWeek) : null;
    if (data.arrivalWeek !== undefined) data.arrivalWeek = data.arrivalWeek ? parseInt(data.arrivalWeek) : null;
    if (data.advancePaymentTerms !== undefined) data.advancePaymentTerms = data.advancePaymentTerms ? parseInt(data.advancePaymentTerms) : null;
    if (data.advancePaymentPct !== undefined) data.advancePaymentPct = data.advancePaymentPct ? parseFloat(data.advancePaymentPct) : null;
    if (data.advancePaymentAmount !== undefined) data.advancePaymentAmount = data.advancePaymentAmount ? parseFloat(data.advancePaymentAmount) : null;

    const order = await prisma.order.update({
      where: { id },
      data,
      include: { contact: true }
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
