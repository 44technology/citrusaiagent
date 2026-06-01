import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const recalcInvoiceStatus = async (invoiceId) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true }
  });
  if (!invoice) return;

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  let status = 'Unpaid';
  if (totalPaid >= invoice.amount) status = 'Paid';
  else if (totalPaid > 0) status = 'Partial';

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
};

export const getPaymentsByInvoice = async (req, res) => {
  const { invoiceId } = req.params;
  try {
    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paidAt: 'desc' }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPayment = async (req, res) => {
  const { invoiceId } = req.params;
  const { amount, method, reference, notes, paidAt } = req.body;
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: parseFloat(amount),
        method: method || 'Bank Transfer',
        reference: reference || null,
        notes: notes || null,
        paidAt: paidAt ? new Date(paidAt) : new Date()
      }
    });

    await recalcInvoiceStatus(invoiceId);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePayment = async (req, res) => {
  const { id } = req.params;
  try {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    await prisma.payment.delete({ where: { id } });
    await recalcInvoiceStatus(payment.invoiceId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
