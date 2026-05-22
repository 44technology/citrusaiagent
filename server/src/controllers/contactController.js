import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/contacts?type=Lead|Customer
export const getContacts = async (req, res) => {
  try {
    const { type } = req.query;
    const where = type ? { type } : {};
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { notes: true, calls: true } } }
    });
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

// GET /api/contacts/:id
export const getContact = async (req, res) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: { 
        notes: { orderBy: { createdAt: 'desc' } },
        calls: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
};

// POST /api/contacts
export const createContact = async (req, res) => {
  try {
    const { name, phone, email, company, department, language, credit, type } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    const contact = await prisma.contact.create({
      data: { name, phone, email, company, department, language, credit: credit || 0, type: type || 'Lead' }
    });
    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
};

// POST /api/contacts/bulk
export const createContactsBulk = async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: 'contacts array is required' });
    }
    const created = await prisma.contact.createMany({
      data: contacts.map(c => ({
        name: c.name || 'Unknown',
        phone: c.phone || 'N/A',
        email: c.email || 'N/A',
        company: c.company || 'N/A',
        department: c.department || 'N/A',
        language: c.language || 'English',
        credit: c.credit || 0,
        status: 'Pending',
        type: 'Lead'
      }))
    });
    // Return the created contacts
    const allContacts = await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(201).json({ count: created.count, contacts: allContacts });
  } catch (error) {
    console.error('Error bulk creating contacts:', error);
    res.status(500).json({ error: 'Failed to bulk create contacts' });
  }
};

// PATCH /api/contacts/:id
export const updateContact = async (req, res) => {
  try {
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
};

// DELETE /api/contacts/:id
export const deleteContact = async (req, res) => {
  const { role } = req.user || {};
  if (role !== 'super admin') {
    return res.status(403).json({ error: 'Only Super Admin can delete contacts' });
  }

  try {
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
};

// POST /api/contacts/:id/promote
export const promoteContact = async (req, res) => {
  try {
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data: { type: 'Customer' }
    });
    // Add system note
    await prisma.note.create({
      data: {
        text: 'Lead promoted to Customer',
        isSystem: true,
        contactId: contact.id
      }
    });
    res.json(contact);
  } catch (error) {
    console.error('Error promoting contact:', error);
    res.status(500).json({ error: 'Failed to promote contact' });
  }
};

// POST /api/contacts/:id/notes
export const addNote = async (req, res) => {
  try {
    const { text, isSystem } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    const note = await prisma.note.create({
      data: { text, isSystem: isSystem || false, contactId: req.params.id }
    });
    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
};

// GET /api/contacts/:id/notes
export const getNotes = async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: { contactId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

// ─── Contact Persons ──────────────────────────────────────────

export const getPersons = async (req, res) => {
  try {
    const persons = await prisma.contactPerson.findMany({
      where: { contactId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json(persons);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const createPerson = async (req, res) => {
  try {
    const { name, title, email, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const person = await prisma.contactPerson.create({
      data: { contactId: req.params.id, name, title, email, phone }
    });
    res.status(201).json(person);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const updatePerson = async (req, res) => {
  try {
    const { name, title, email, phone } = req.body;
    const person = await prisma.contactPerson.update({
      where: { id: req.params.pid },
      data: { name, title, email, phone }
    });
    res.json(person);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const deletePerson = async (req, res) => {
  try {
    await prisma.contactPerson.delete({ where: { id: req.params.pid } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
