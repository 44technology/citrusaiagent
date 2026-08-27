import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getExpenses = async (req, res) => {
  try {
    const expenses = await prisma.shipmentExpense.findMany({
      where: { shipmentId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const createExpense = async (req, res) => {
  const { id: shipmentId } = req.params;
  const {
    type, description, amount, boxQuantity, boxPrice,
    tariffPercent, invoiceNumber, isRevenue, flagged, flagReason
  } = req.body;

  if (!type) return res.status(400).json({ error: 'Type is required' });

  try {
    let finalAmount = parseFloat(amount) || 0;

    // Auto-calculate Purchase of Goods
    if (type === 'PurchaseOfGoods' && boxQuantity && boxPrice) {
      finalAmount = parseFloat(boxQuantity) * parseFloat(boxPrice);
    }

    const expense = await prisma.shipmentExpense.create({
      data: {
        shipmentId,
        type,
        description: description || null,
        amount: finalAmount,
        boxQuantity: boxQuantity ? parseInt(boxQuantity) : null,
        boxPrice: boxPrice ? parseFloat(boxPrice) : null,
        tariffPercent: tariffPercent ? parseFloat(tariffPercent) : 10,
        invoiceNumber: invoiceNumber || null,
        isRevenue: isRevenue === true || isRevenue === 'true',
        flagged: flagged === true || flagged === 'true',
        flagReason: flagReason || null,
      }
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense: ' + error.message });
  }
};

export const updateExpense = async (req, res) => {
  const { expenseId } = req.params;
  try {
    const data = { ...req.body };
    if (data.amount !== undefined) data.amount = parseFloat(data.amount) || 0;
    if (data.boxQuantity !== undefined) data.boxQuantity = data.boxQuantity ? parseInt(data.boxQuantity) : null;
    if (data.boxPrice !== undefined) data.boxPrice = data.boxPrice ? parseFloat(data.boxPrice) : null;
    if (data.tariffPercent !== undefined) data.tariffPercent = data.tariffPercent ? parseFloat(data.tariffPercent) : 10;

    // Recalculate Purchase of Goods
    if (data.type === 'PurchaseOfGoods' && data.boxQuantity && data.boxPrice) {
      data.amount = data.boxQuantity * data.boxPrice;
    }

    const expense = await prisma.shipmentExpense.update({
      where: { id: expenseId },
      data
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req, res) => {
  const { expenseId } = req.params;
  try {
    await prisma.shipmentExpense.delete({ where: { id: expenseId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};
