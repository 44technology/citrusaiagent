import { PrismaClient } from '@prisma/client';
import { logOrderActivity } from './orderController.js';
const prisma = new PrismaClient();

// ─── Purchase Orders ─────────────────────────────────

export const getAllPurchaseOrders = async (req, res) => {
  try {
    const where = req.companyId ? { companyId: req.companyId } : {};
    const pos = await prisma.purchaseOrder.findMany({
      where,
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
        status: 'Draft',
        companyId: req.companyId || null,
      },
      include: { order: true, supplier: true }
    });
    if (orderId) {
      await logOrderActivity(orderId, req.user?.username, 'PO created',
        `${po.poNumber} · $${po.totalAmount.toLocaleString()} · ${po.supplier?.name || ''}`);
    }
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

// Shared nested include for an invoice's linked shipment — pulls in
// whatever "Customer Invoice" documents were uploaded under that shipment
// (via Shipment Detail's Documents tab) so they surface under the invoice
// here too, even if they predate this invoiceId link.
const SHIPMENT_INCLUDE = {
  select: {
    id: true, label: true, shipmentRefId: true, referenceId: true,
    containerNumber: true, bolNumber: true,
    contact: { select: { id: true, name: true, company: true } },
    order: { select: { referenceId: true } },
    documents: { where: { category: 'CustomerInv' }, orderBy: { createdAt: 'desc' } },
  }
};

const INVOICE_INCLUDE = {
  order: { include: { contact: { select: { id: true, name: true, company: true } } } },
  purchaseOrder: { include: { supplier: { select: { id: true, name: true, company: true } } } },
  contact: { select: { id: true, name: true, company: true } },
  shipment: SHIPMENT_INCLUDE,
};

export const getAllInvoices = async (req, res) => {
  try {
    const where = req.companyId ? { companyId: req.companyId } : {};
    const invoices = await prisma.invoice.findMany({
      where,
      include: { ...INVOICE_INCLUDE, payments: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const { invoiceNumber, type, amount, orderId, poId, contactId, shipmentId, issueDate, dueDate, notes } = req.body;

    if (type === 'Sales' && !shipmentId) {
      return res.status(400).json({ error: 'A Ref ID (shipment) is required for a Sales invoice' });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        type,
        amount: parseFloat(amount),
        orderId: orderId || null,
        poId: poId || null,
        contactId: contactId || null,
        shipmentId: shipmentId || null,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        status: 'Unpaid',
        companyId: req.companyId || null,
      },
      include: INVOICE_INCLUDE
    });
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Only an Unpaid invoice's core fields (amount, customer, dates, notes...)
// may be edited — once a payment has landed (Partial/Paid) the invoice is
// locked to keep it consistent with what was actually recorded.
export const updateInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    if (existing.status !== 'Unpaid') {
      return res.status(400).json({ error: `Cannot edit a ${existing.status.toLowerCase()} invoice — it already has payments recorded against it.` });
    }

    const { invoiceNumber, type, amount, orderId, poId, contactId, shipmentId, issueDate, dueDate, notes } = req.body;
    const data = {};
    if (invoiceNumber !== undefined) data.invoiceNumber = invoiceNumber;
    if (type !== undefined) data.type = type;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (orderId !== undefined) data.orderId = orderId || null;
    if (poId !== undefined) data.poId = poId || null;
    if (contactId !== undefined) data.contactId = contactId || null;
    if (shipmentId !== undefined) data.shipmentId = shipmentId || null;
    if (issueDate !== undefined) data.issueDate = issueDate ? new Date(issueDate) : new Date();
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) data.notes = notes || null;

    const invoice = await prisma.invoice.update({
      where: { id },
      data,
      include: { ...INVOICE_INCLUDE, payments: true }
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

    await logOrderActivity(order.id, req.user?.username, 'Invoice created', invoice.invoiceNumber);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
