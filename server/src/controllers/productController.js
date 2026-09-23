import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const isAdmin = (req) => ['super admin', 'admin'].includes(req.user?.role);
const clean = (s) => String(s ?? '').trim();
const normQuarters = (q) => [...new Set((Array.isArray(q) ? q : []).map(Number).filter(n => n >= 1 && n <= 4))].sort();

// Everything the Products page needs in one call: products → varieties → sources.
export const getProducts = async (req, res) => {
  try {
    const where = req.companyId ? { companyId: req.companyId } : {};
    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        varieties: {
          orderBy: [{ name: 'asc' }, { isJuice: 'asc' }],
          include: { sources: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Multi-company safety: a product (and everything under it) is only touchable
// by the company that owns it.
const ownsProduct = (req, product) => !req.companyId || product.companyId === req.companyId;

export const createProduct = async (req, res) => {
  try {
    const name = clean(req.body.name);
    if (!name) return res.status(400).json({ error: 'Product name is required' });
    const dup = await prisma.product.findFirst({
      where: { companyId: req.companyId || null, name: { equals: name, mode: 'insensitive' } },
    });
    if (dup) return res.status(400).json({ error: `"${dup.name}" already exists` });
    const product = await prisma.product.create({
      data: { name, companyId: req.companyId || null },
      include: { varieties: { include: { sources: true } } },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || !ownsProduct(req, existing)) return res.status(404).json({ error: 'Product not found' });
    const name = clean(req.body.name);
    if (!name) return res.status(400).json({ error: 'Product name is required' });
    const product = await prisma.product.update({ where: { id: existing.id }, data: { name } });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only Admin can delete products' });
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing || !ownsProduct(req, existing)) return res.status(404).json({ error: 'Product not found' });
    await prisma.product.delete({ where: { id: existing.id } }); // varieties + sources cascade
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Varieties ───────────────────────────────────────────────

export const createVariety = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || !ownsProduct(req, product)) return res.status(404).json({ error: 'Product not found' });
    const name = clean(req.body.name);
    if (!name) return res.status(400).json({ error: 'Variety name is required' });
    const isJuice = req.body.isJuice === true || req.body.isJuice === 'true';
    const dup = await prisma.productVariety.findFirst({
      where: { productId: product.id, isJuice, name: { equals: name, mode: 'insensitive' } },
    });
    if (dup) return res.status(400).json({ error: `${product.name} — ${dup.name}${isJuice ? ' (Juice)' : ''} already exists` });
    const variety = await prisma.productVariety.create({
      data: { productId: product.id, name, isJuice, notes: clean(req.body.notes) || null },
      include: { sources: true },
    });
    res.status(201).json(variety);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const loadVariety = async (req, res) => {
  const variety = await prisma.productVariety.findUnique({
    where: { id: req.params.varietyId },
    include: { product: true },
  });
  if (!variety || !ownsProduct(req, variety.product)) {
    res.status(404).json({ error: 'Variety not found' });
    return null;
  }
  return variety;
};

export const updateVariety = async (req, res) => {
  try {
    const variety = await loadVariety(req, res);
    if (!variety) return;
    const data = {};
    if (req.body.name !== undefined) {
      const name = clean(req.body.name);
      if (!name) return res.status(400).json({ error: 'Variety name is required' });
      data.name = name;
    }
    if (req.body.isJuice !== undefined) data.isJuice = req.body.isJuice === true || req.body.isJuice === 'true';
    if (req.body.notes !== undefined) data.notes = clean(req.body.notes) || null;
    const updated = await prisma.productVariety.update({ where: { id: variety.id }, data, include: { sources: true } });
    res.json(updated);
  } catch (err) {
    // Unique (product, name, juice) collision
    if (err.code === 'P2002') return res.status(400).json({ error: 'That variety already exists for this product' });
    res.status(500).json({ error: err.message });
  }
};

export const deleteVariety = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only Admin can delete varieties' });
  try {
    const variety = await loadVariety(req, res);
    if (!variety) return;
    await prisma.productVariety.delete({ where: { id: variety.id } }); // sources cascade
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Sources (country + quarters for a variety) ──────────────

export const createSource = async (req, res) => {
  try {
    const variety = await loadVariety(req, res);
    if (!variety) return;
    const country = clean(req.body.country);
    if (!country) return res.status(400).json({ error: 'Country is required' });
    const quarters = normQuarters(req.body.quarters);
    if (quarters.length === 0) return res.status(400).json({ error: 'Pick at least one quarter' });
    const source = await prisma.varietySource.create({
      data: { varietyId: variety.id, country, quarters, notes: clean(req.body.notes) || null },
    });
    res.status(201).json(source);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const loadSource = async (req, res) => {
  const source = await prisma.varietySource.findUnique({
    where: { id: req.params.sourceId },
    include: { variety: { include: { product: true } } },
  });
  if (!source || !ownsProduct(req, source.variety.product)) {
    res.status(404).json({ error: 'Source not found' });
    return null;
  }
  return source;
};

export const updateSource = async (req, res) => {
  try {
    const source = await loadSource(req, res);
    if (!source) return;
    const data = {};
    if (req.body.country !== undefined) {
      const country = clean(req.body.country);
      if (!country) return res.status(400).json({ error: 'Country is required' });
      data.country = country;
    }
    if (req.body.quarters !== undefined) {
      const quarters = normQuarters(req.body.quarters);
      if (quarters.length === 0) return res.status(400).json({ error: 'Pick at least one quarter' });
      data.quarters = quarters;
    }
    if (req.body.notes !== undefined) data.notes = clean(req.body.notes) || null;
    const updated = await prisma.varietySource.update({ where: { id: source.id }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteSource = async (req, res) => {
  try {
    const source = await loadSource(req, res);
    if (!source) return;
    await prisma.varietySource.delete({ where: { id: source.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
