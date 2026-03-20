import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── Purchase Orders ─────────────────────────────────

export const getAllPurchaseOrders = async (req, res) => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      include: { order: true, supplier: true, invoices: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { orderId, supplierId, totalAmount, poNumber } = req.body;
    
    // Auto-generate PO number if not provided
    const finalPoNumber = poNumber || `PO-${Date.now()}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: finalPoNumber,
        orderId,
        supplierId,
        totalAmount: parseFloat(totalAmount) || 0,
        status: 'Draft'
      },
      include: { order: true, supplier: true }
    });
    res.status(201).json(po);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: req.body,
      include: { order: true, supplier: true }
    });
    res.json(po);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── Invoices ────────────────────────────────────────

export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { order: true, purchaseOrder: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const { invoiceNumber, type, amount, orderId, poId, issueDate, dueDate } = req.body;
    
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        type,
        amount: parseFloat(amount),
        orderId,
        poId,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'Unpaid'
      }
    });
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: req.body
    });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Convert Sales Order to Sales Invoice
export const convertToInvoice = async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { contact: true }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${order.referenceId}-${Date.now()}`,
        type: 'Sales',
        amount: 0, // Should be calculated based on items if available
        orderId: order.id,
        status: 'Unpaid',
        issueDate: new Date()
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
