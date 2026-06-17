import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production set UPLOADS_DIR=/var/uploads/citrus in .env
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const getAllDocuments = async (req, res) => {
  const { contactId, orderId, shipmentId, invoiceId } = req.query;
  try {
    const where = {};
    if (contactId)     where.contactId  = contactId;
    if (orderId)       where.orderId    = orderId;
    if (shipmentId)    where.shipmentId = shipmentId;
    if (invoiceId)     where.invoiceId  = invoiceId;
    if (req.companyId) where.companyId  = req.companyId;

    const docs = await prisma.document.findMany({
      where,
      include: { contact: { select: { id: true, name: true, company: true } }, order: { select: { id: true, referenceId: true } }, shipment: { select: { id: true, label: true, containerNumber: true } }, invoice: { select: { id: true, invoiceNumber: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadDocument = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const { category, contactId, orderId, shipmentId, invoiceId } = req.body;
  const filename = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    fs.writeFileSync(filePath, req.file.buffer);

    const doc = await prisma.document.create({
      data: {
        name: filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: filePath,
        category: category || 'General',
        contactId:  contactId  || null,
        orderId:    orderId    || null,
        shipmentId: shipmentId || null,
        invoiceId:  invoiceId  || null,
        companyId:  req.companyId || null,
        uploadedBy: req.user?.username || null
      },
      include: { contact: { select: { id: true, name: true, company: true } }, order: { select: { id: true, referenceId: true } }, shipment: { select: { id: true, label: true, containerNumber: true } }, invoice: { select: { id: true, invoiceNumber: true } } }
    });
    res.status(201).json(doc);
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: error.message });
  }
};

export const downloadDocument = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!fs.existsSync(doc.path)) return res.status(404).json({ error: 'File not found on disk' });

    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
    res.setHeader('Content-Type', doc.mimeType);
    fs.createReadStream(doc.path).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const viewDocument = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!fs.existsSync(doc.path)) return res.status(404).json({ error: 'File not found on disk' });

    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    res.setHeader('Content-Type', doc.mimeType);
    fs.createReadStream(doc.path).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (fs.existsSync(doc.path)) fs.unlinkSync(doc.path);
    await prisma.document.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
