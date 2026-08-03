import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Never blocks the main operation
export const logOrderActivity = async (orderId, userName, action, detail = null) => {
  try {
    await prisma.orderActivity.create({ data: { orderId, userName: userName || 'Unknown', action, detail } });
  } catch {}
};

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
        activities: { orderBy: { createdAt: 'desc' }, take: 30 },
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

// Ref IDs must be unique across BOTH Order.referenceId and any manually-typed
// Shipment ref (referenceId / shipmentRefId) used when a shipment has no linked
// order — those two pools were previously generated independently and could
// collide (e.g. staff typing "260062" on a shipment while an Order later
// auto-generated the same number). We take the true numeric max across all
// three fields and continue from there.
const generateRefId = async () => {
  const START = 260001;
  const [orders, shipments] = await Promise.all([
    prisma.order.findMany({ select: { referenceId: true } }),
    prisma.shipment.findMany({ select: { referenceId: true, shipmentRefId: true } }),
  ]);
  let max = START - 1;
  const consider = (v) => {
    if (v === null || v === undefined) return;
    const trimmed = String(v).trim();
    if (!/^\d+$/.test(trimmed)) return; // ignore non-purely-numeric manual refs
    const n = parseInt(trimmed, 10);
    if (n > max) max = n;
  };
  orders.forEach(o => consider(o.referenceId));
  shipments.forEach(s => { consider(s.referenceId); consider(s.shipmentRefId); });
  return String(max + 1);
};

const OFFER_PREFIX = 'OFR-';
const generateOfferId = async () => {
  const START = 1001;
  const last = await prisma.order.findFirst({
    where: { offerId: { startsWith: OFFER_PREFIX } },
    orderBy: { offerId: 'desc' },
    select: { offerId: true }
  });
  if (!last) return `${OFFER_PREFIX}${START}`;
  const num = parseInt(last.offerId.slice(OFFER_PREFIX.length), 10);
  return `${OFFER_PREFIX}${isNaN(num) ? START : num + 1}`;
};

// Assign a real, sequential Order Ref ID to an order that doesn't have one yet
// (e.g. a grower offer being linked to a shipment for the first time)
export const assignRefId = async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    if (existing.referenceId) return res.json(existing); // already has one — no-op
    const referenceId = await generateRefId();
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { referenceId },
      include: { contact: true }
    });
    await logOrderActivity(order.id, req.user?.username, 'Ref ID assigned', `#${referenceId}${existing.offerId ? ` (was ${existing.offerId})` : ''}`);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { userId, username } = req.user || {};
    const {
      grower, shipper, product, label, variety, boxType,
      boxQuantity, purchasePrice, salePrice, expense,
      receiver, week, departureWeek, arrivalWeek, status, contactId,
      advancePaymentTerms, advancePaymentPct, advancePaymentAmount,
      note, departurePort, arrivalPort,
      oceanFreight, paymentTerms, producer, quality, sizes, fclCount, fclBoxes, incoterm
    } = req.body;

    // Grower offers get their own Offer ID sequence — a real Ref ID is only
    // assigned later, when the offer is linked to a shipment.
    const isOffer = status === 'offer';
    const referenceId = isOffer ? null : await generateRefId();
    const offerId = isOffer ? await generateOfferId() : null;

    const order = await prisma.order.create({
      data: {
        referenceId,
        offerId,
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
        oceanFreight: oceanFreight ? parseFloat(oceanFreight) : null,
        incoterm: incoterm || null,
        paymentTerms: paymentTerms || null,
        producer: producer || null,
        quality: quality || null,
        sizes: sizes || null,
        fclCount: fclCount ? parseInt(fclCount) : null,
        fclBoxes: fclBoxes ? parseInt(fclBoxes) : null,
        createdBy: username || null,
      },
      include: { contact: true }
    });
    await logOrderActivity(order.id, username, 'Order created',
      `${order.product} ${order.variety} · ${order.boxQuantity} boxes${order.status === 'offer' ? ' (offer)' : ''}`);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { role, username } = req.user || {};

  try {
    if (req.body.status && role !== 'admin' && role !== 'operation' && role !== 'super admin') {
      return res.status(403).json({ error: 'Only operation team can update order status' });
    }

    const data = { ...req.body };
    // Strip read-only and relation fields (super admin may change referenceId)
    const strip = ['id', 'contact', 'user', 'createdAt', 'updatedAt', 'purchaseOrders', 'invoices', 'documents', 'shipments', 'tenant'];
    if (role !== 'super admin') strip.push('referenceId');
    strip.forEach(k => delete data[k]);
    if (data.referenceId !== undefined) {
      const refId = String(data.referenceId).trim();
      if (!refId) return res.status(400).json({ error: 'Reference ID cannot be empty' });
      const dup = await prisma.order.findFirst({ where: { referenceId: refId, NOT: { id } } });
      if (dup) return res.status(400).json({ error: `Reference ID "${refId}" is already used by another order` });
      data.referenceId = refId;
    }
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
    if (data.oceanFreight !== undefined) data.oceanFreight = data.oceanFreight ? parseFloat(data.oceanFreight) : null;
    if (data.fclCount !== undefined) data.fclCount = data.fclCount ? parseInt(data.fclCount) : null;
    if (data.fclBoxes !== undefined) data.fclBoxes = data.fclBoxes ? parseInt(data.fclBoxes) : null;
    delete data.createdBy; // creation-time audit field, never updated

    const existing = await prisma.order.findUnique({
      where: { id },
      select: { status: true, referenceId: true }
    });

    const order = await prisma.order.update({
      where: { id },
      data,
      include: { contact: true }
    });

    if (data.status && existing && data.status !== existing.status) {
      await logOrderActivity(id, username, 'Status changed', `${existing.status} → ${data.status}`);
    } else if (data.referenceId && existing && data.referenceId !== existing.referenceId) {
      await logOrderActivity(id, username, 'Ref ID changed', `#${existing.referenceId} → #${data.referenceId}`);
    } else {
      await logOrderActivity(id, username, 'Order updated');
    }

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
