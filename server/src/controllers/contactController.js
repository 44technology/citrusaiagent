import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/contacts?type=Lead|Customer
export const getContacts = async (req, res) => {
  try {
    const { type } = req.query;
    const where = type ? { type } : {};
    if (req.companyId) where.companyId = req.companyId;
    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { notes: true, calls: true } },
        programs: { where: { status: 'Active' }, orderBy: { createdAt: 'desc' } },
      }
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
        calls: { orderBy: { createdAt: 'desc' } },
        programs: { orderBy: { createdAt: 'desc' } },
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
    const {
      name, phone, email, company, department, language, credit, type, status,
      city, state, zip, country, address, companyPhone, website,
      classifications, commodities
    } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name is required' });
    const contact = await prisma.contact.create({
      data: {
        name, phone: phone || 'N/A', email: email || 'N/A',
        company: company || name, department, language, credit: credit || 0,
        type: type || 'Lead', status: status || 'Active',
        city, state, zip, country, address, companyPhone, website,
        classifications: classifications || [],
        commodities: commodities || [],
        companyId: req.companyId || null,
      }
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
        type: 'Lead',
        companyId: req.companyId || null,
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
    // Whitelist only known Contact fields to prevent Prisma errors
    const ALLOWED = new Set([
      'name','phone','email','company','department','language','credit','status','type',
      'city','state','zip','country','address','companyPhone','website',
      'classifications','commodities',
      'lineOfCredit','openBalance','termDays',
      'assignedTo','companyId',
    ]);
    const data = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => ALLOWED.has(k))
    );
    // Parse numeric fields safely
    if (data.lineOfCredit !== undefined) data.lineOfCredit = data.lineOfCredit === '' || data.lineOfCredit === null ? null : parseFloat(data.lineOfCredit);
    if (data.openBalance  !== undefined) data.openBalance  = data.openBalance  === '' || data.openBalance  === null ? null : parseFloat(data.openBalance);
    if (data.termDays     !== undefined) data.termDays     = data.termDays     === '' || data.termDays     === null ? null : parseInt(data.termDays);
    if (data.credit       !== undefined) data.credit       = parseFloat(data.credit) || 0;

    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data
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
    const { firstName, lastName, name, title, email, phone, linkedinUrl } = req.body;
    const fullName = name || [firstName, lastName].filter(Boolean).join(' ') || '';
    if (!fullName) return res.status(400).json({ error: 'Name is required' });
    const person = await prisma.contactPerson.create({
      data: { contactId: req.params.id, name: fullName, firstName, lastName, title, email, phone, linkedinUrl }
    });
    res.status(201).json(person);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const updatePerson = async (req, res) => {
  try {
    const { firstName, lastName, name, title, email, phone, linkedinUrl } = req.body;
    const fullName = name || [firstName, lastName].filter(Boolean).join(' ') || undefined;
    const person = await prisma.contactPerson.update({
      where: { id: req.params.pid },
      data: { name: fullName, firstName, lastName, title, email, phone, linkedinUrl }
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

// POST /api/contacts/import-leads
// Body: { rows: [{ CompanyName, FirstName, LastName, Title, City, State, ZipCode, Country, CompanyPhone, BusinessPhone, Email, Classifications, Commodities, LinkedInURL, WebSite }] }
export const importLeads = async (req, res) => {
  try {
    const { rows, type = 'Lead' } = req.body;
    if (!rows?.length) return res.status(400).json({ error: 'No rows provided' });

    // Group by company name
    const companies = {};
    for (const row of rows) {
      const key = (row.CompanyName || 'Unknown').trim();
      if (!companies[key]) {
        companies[key] = { info: row, people: [] };
      }
      if (row.FirstName || row.LastName || row.Email) {
        companies[key].people.push(row);
      }
    }

    let created = 0, skipped = 0, peopleCreated = 0;

    for (const [companyName, { info, people }] of Object.entries(companies)) {
      // Check if company already exists
      const existing = await prisma.contact.findFirst({ where: { name: companyName } });
      let contactId;

      const parseArr = (val) => {
        if (!val || val === 'N/A') return [];
        return String(val).split(',').map(s => s.trim()).filter(Boolean);
      };

      if (existing) {
        contactId = existing.id;
        skipped++;
      } else {
        const contact = await prisma.contact.create({
          data: {
            name: companyName,
            company: companyName,
            phone: info.CompanyPhone || info.BusinessPhone || 'N/A',
            email: 'N/A',
            type,
            status: 'Active',
            city: info.City || null,
            state: info.State || null,
            zip: info['Zip Code'] || info.ZipCode || null,
            country: info.Country || null,
            companyPhone: info.CompanyPhone || null,
            website: info.WebSite || null,
            classifications: parseArr(info.Classifications),
            commodities: parseArr(info.Commodities),
            companyId: req.companyId || null,
          }
        });
        contactId = contact.id;
        created++;
      }

      // Add people
      for (const p of people) {
        const firstName = p.FirstName || '';
        const lastName = p.LastName || '';
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        if (!fullName) continue;

        // Skip duplicate person
        const existingPerson = await prisma.contactPerson.findFirst({
          where: { contactId, name: fullName }
        });
        if (existingPerson) continue;

        await prisma.contactPerson.create({
          data: {
            contactId,
            name: fullName,
            firstName: firstName || null,
            lastName: lastName || null,
            title: p.Title || null,
            email: p.Email || null,
            phone: p.BusinessPhone || p.CompanyPhone || null,
            linkedinUrl: p.LinkedInURL || null,
          }
        });
        peopleCreated++;
      }
    }

    res.json({
      ok: true,
      companiesCreated: created,
      companiesSkipped: skipped,
      peopleCreated,
    });
  } catch (err) {
    console.error('Import leads error:', err);
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/contacts/assign-by-city
export const assignByCity = async (req, res) => {
  const { city, userId, type } = req.body;
  if (!city) return res.status(400).json({ error: 'city is required' });
  try {
    const where = { city };
    if (req.companyId) where.companyId = req.companyId;
    if (type) where.type = type;
    const result = await prisma.contact.updateMany({
      where,
      data: { assignedTo: userId || null },
    });
    res.json({ updated: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
