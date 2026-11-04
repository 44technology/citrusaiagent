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
  const { contactId, orderId, shipmentId, invoiceId, poId, carrierId } = req.query;
  try {
    const where = {};
    if (contactId)     where.contactId  = contactId;
    if (orderId)       where.orderId    = orderId;
    if (shipmentId)    where.shipmentId = shipmentId;
    if (invoiceId)     where.invoiceId  = invoiceId;
    if (poId)          where.poId       = poId;
    if (carrierId)     where.carrierId  = carrierId;
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

  const { category, contactId, orderId, shipmentId, invoiceId, poId, carrierId } = req.body;
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
        poId:       poId       || null,
        carrierId:  carrierId  || null,
        companyId:  req.companyId || null,
        uploadedBy: req.user?.username || null
      },
      include: { contact: { select: { id: true, name: true, company: true } }, order: { select: { id: true, referenceId: true } }, shipment: { select: { id: true, label: true, containerNumber: true } }, invoice: { select: { id: true, invoiceNumber: true } } }
    });
    if (shipmentId) {
      const userName = req.user?.username || 'Unknown';
      await prisma.shipmentActivity.create({ data: { shipmentId, userName, action: 'Uploaded document', detail: `${req.file.originalname} (${category || 'General'})` } }).catch(() => {});
    }
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

export const updateDocument = async (req, res) => {
  const { id } = req.params;
  const { category } = req.body;
  try {
    const doc = await prisma.document.update({ where: { id }, data: { category } });
    res.json(doc);
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
    if (doc.shipmentId) {
      const userName = req.user?.username || 'Unknown';
      await prisma.shipmentActivity.create({ data: { shipmentId: doc.shipmentId, userName, action: 'Deleted document', detail: doc.originalName } }).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Bulk download: every document of one contact (e.g. a grower) as a ZIP ──
// Store-only ZIP written by hand so no extra dependency (and no `npm install`
// on deploy) is needed. Each file is read one at a time, so memory stays at
// roughly one document (<= 25 MB upload limit) regardless of how many there are.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const dosDateTime = (d) => ({
  time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});
const safeName = (s) => String(s || 'file').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim() || 'file';

export const downloadContactDocumentsZip = async (req, res) => {
  const { contactId } = req.query;
  if (!contactId) return res.status(400).json({ error: 'contactId is required' });
  try {
    const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { name: true, company: true } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    const docs = await prisma.document.findMany({ where: { contactId }, orderBy: { createdAt: 'asc' } });
    const onDisk = docs.filter(d => fs.existsSync(d.path));
    if (onDisk.length === 0) return res.status(404).json({ error: 'No documents to download' });

    const zipBase = safeName(contact.company || contact.name || 'documents');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipBase}-documents.zip"`);

    const used = new Set();
    const central = [];
    let offset = 0;
    const write = (buf) => { res.write(buf); offset += buf.length; };

    for (const doc of onDisk) {
      // category/filename, made unique if two files share a name
      let entry = `${safeName(doc.category || 'General')}/${safeName(doc.originalName || doc.name)}`;
      if (used.has(entry.toLowerCase())) {
        const dot = entry.lastIndexOf('.');
        const stem = dot > entry.lastIndexOf('/') ? entry.slice(0, dot) : entry;
        const ext = dot > entry.lastIndexOf('/') ? entry.slice(dot) : '';
        let n = 2;
        while (used.has(`${stem} (${n})${ext}`.toLowerCase())) n++;
        entry = `${stem} (${n})${ext}`;
      }
      used.add(entry.toLowerCase());

      const data = await fs.promises.readFile(doc.path);
      const nameBuf = Buffer.from(entry, 'utf8');
      const { time, date } = dosDateTime(new Date(doc.createdAt));
      const crc = crc32(data);

      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);        // version needed
      local.writeUInt16LE(0x0800, 6);    // flags: UTF-8 names
      local.writeUInt16LE(0, 8);         // method: store
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(data.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBuf.length, 26);
      local.writeUInt16LE(0, 28);
      central.push({ nameBuf, crc, size: data.length, time, date, offset });
      write(local); write(nameBuf); write(data);
    }

    const cdStart = offset;
    for (const e of central) {
      const h = Buffer.alloc(46);
      h.writeUInt32LE(0x02014b50, 0);
      h.writeUInt16LE(20, 4);
      h.writeUInt16LE(20, 6);
      h.writeUInt16LE(0x0800, 8);
      h.writeUInt16LE(0, 10);
      h.writeUInt16LE(e.time, 12);
      h.writeUInt16LE(e.date, 14);
      h.writeUInt32LE(e.crc, 16);
      h.writeUInt32LE(e.size, 20);
      h.writeUInt32LE(e.size, 24);
      h.writeUInt16LE(e.nameBuf.length, 28);
      h.writeUInt32LE(e.offset, 42);
      write(h); write(e.nameBuf);
    }
    const cdSize = offset - cdStart;
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(central.length, 8);
    end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(cdSize, 12);
    end.writeUInt32LE(cdStart, 16);
    res.end(end);
  } catch (error) {
    // Headers may already be sent mid-stream; only reply with JSON if not.
    if (!res.headersSent) res.status(500).json({ error: error.message });
    else res.destroy(error);
  }
};
