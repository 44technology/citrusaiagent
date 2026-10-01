import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const clean = (s) => String(s ?? '').trim();

const normWeeks = (weeks) => {
  if (!Array.isArray(weeks)) return [];
  return weeks
    .map(w => ({ week: parseInt(w.week, 10), containers: parseInt(w.containers, 10) }))
    .filter(w => Number.isInteger(w.week) && w.week >= 1 && w.week <= 53 && Number.isInteger(w.containers) && w.containers > 0)
    .sort((a, b) => a.week - b.week);
};

const PUBLIC_INCLUDE = {
  contact: { select: { id: true, name: true, company: true } },
};

// ─── Admin (authenticated) ────────────────────────────────────────────────

export const getAll = async (req, res) => {
  try {
    const where = req.companyId ? { companyId: req.companyId } : {};
    const requests = await prisma.orderRequest.findMany({
      where,
      include: PUBLIC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Staff generates a link for a customer — product/variety are set here, the
// customer only fills in quantities/timing/location on their end.
export const create = async (req, res) => {
  try {
    const contactId = clean(req.body.contactId);
    const product = clean(req.body.product);
    const variety = clean(req.body.variety);
    if (!contactId || !product || !variety) {
      return res.status(400).json({ error: 'Customer, product and variety are required' });
    }
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return res.status(404).json({ error: 'Customer not found' });

    const request = await prisma.orderRequest.create({
      data: {
        contactId, product, variety,
        createdBy: req.user?.username || null,
        companyId: req.companyId || null,
      },
      include: PUBLIC_INCLUDE,
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const existing = await prisma.orderRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || (req.companyId && existing.companyId !== req.companyId)) {
      return res.status(404).json({ error: 'Request not found' });
    }
    await prisma.orderRequest.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Approve a Submitted request — one real Order per week row.
export const approve = async (req, res) => {
  try {
    const existing = await prisma.orderRequest.findUnique({ where: { id: req.params.id }, include: { contact: true } });
    if (!existing || (req.companyId && existing.companyId !== req.companyId)) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (existing.status !== 'Submitted') {
      return res.status(400).json({ error: `Only a Submitted request can be approved (this one is ${existing.status}).` });
    }
    const weeks = normWeeks(existing.weeks);
    if (weeks.length === 0) {
      return res.status(400).json({ error: 'This request has no valid week/container rows to convert.' });
    }

    const orders = await prisma.$transaction(
      weeks.map(w => prisma.order.create({
        data: {
          contactId: existing.contactId,
          product: existing.product,
          variety: existing.variety,
          boxQuantity: 0,
          fclCount: w.containers,
          departureWeek: w.week,
          arrivalPort: existing.location || null,
          note: existing.notes || null,
          status: 'pending',
          createdBy: req.user?.username || null,
          companyId: existing.companyId,
        },
      }))
    );

    const updated = await prisma.orderRequest.update({
      where: { id: existing.id },
      data: { status: 'Approved', reviewedBy: req.user?.username || null, reviewedAt: new Date() },
      include: PUBLIC_INCLUDE,
    });
    res.json({
      request: updated,
      ordersCreated: orders.length,
      orders: orders.map(o => ({ id: o.id, departureWeek: o.departureWeek, fclCount: o.fclCount })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const reject = async (req, res) => {
  try {
    const existing = await prisma.orderRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || (req.companyId && existing.companyId !== req.companyId)) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const updated = await prisma.orderRequest.update({
      where: { id: existing.id },
      data: {
        status: 'Rejected',
        reviewedBy: req.user?.username || null,
        reviewedAt: new Date(),
        rejectReason: clean(req.body.reason) || null,
      },
      include: PUBLIC_INCLUDE,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Public (no login — reached via the token link) ──────────────────────

export const getPublic = async (req, res) => {
  try {
    const request = await prisma.orderRequest.findUnique({ where: { token: req.params.token }, include: PUBLIC_INCLUDE });
    if (!request) return res.status(404).json({ error: 'This link is not valid.' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const submitPublic = async (req, res) => {
  try {
    const request = await prisma.orderRequest.findUnique({ where: { token: req.params.token } });
    if (!request) return res.status(404).json({ error: 'This link is not valid.' });
    if (request.status !== 'Draft') {
      return res.status(400).json({ error: 'This request was already submitted.' });
    }
    const weeks = normWeeks(req.body.weeks);
    if (weeks.length === 0) {
      return res.status(400).json({ error: 'Add at least one week with a container count.' });
    }
    const location = clean(req.body.location);
    if (!location) return res.status(400).json({ error: 'Location is required' });

    const updated = await prisma.orderRequest.update({
      where: { id: request.id },
      data: {
        weeks,
        location,
        notes: clean(req.body.notes) || null,
        status: 'Submitted',
        submittedAt: new Date(),
      },
      include: PUBLIC_INCLUDE,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
