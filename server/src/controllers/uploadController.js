import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

// POST /api/upload — Upload and parse Excel file
export const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(worksheet);

    // Map to contact structure
    const contactsData = json.map(row => ({
      name: row.Name || row.name || 'Unknown',
      phone: String(row.Phone || row.phone || row['Phone Number'] || 'N/A'),
      email: row.Email || row.email || row['Email Address'] || 'N/A',
      company: row.Company || row.company || row['Company Name'] || 'N/A',
      department: row.Department || row.department || 'N/A',
      language: row.Language || row.language || 'English',
      credit: parseFloat(row.CapitalBoxCredit || row['Capital Box Credit'] || 0) || 0,
      status: 'Pending',
      type: 'Lead'
    }));

    // Bulk create
    const result = await prisma.contact.createMany({ data: contactsData });

    // Return all contacts
    const contacts = await prisma.contact.findMany({ orderBy: { createdAt: 'desc' } });

    res.status(201).json({
      message: `Successfully imported ${result.count} contacts`,
      count: result.count,
      contacts
    });
  } catch (error) {
    console.error('Error uploading Excel:', error);
    res.status(500).json({ error: 'Failed to parse and import Excel file' });
  }
};
