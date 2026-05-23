import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// ─── Settings helpers ─────────────────────────────────────────

const SETTING_KEYS = [
  'email_host', 'email_port', 'email_user', 'email_pass',
  'email_from_name', 'email_signature'
];

const getSettings = async () => {
  const rows = await prisma.setting.findMany({
    where: { key: { in: SETTING_KEYS } }
  });
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
};

export const getEmailSettings = async (req, res) => {
  try {
    const settings = await getSettings();
    // Never return password to frontend
    const safe = { ...settings };
    if (safe.email_pass) safe.email_pass = '••••••••';
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const saveEmailSettings = async (req, res) => {
  try {
    const allowed = ['email_host', 'email_port', 'email_user', 'email_pass', 'email_from_name', 'email_signature'];
    const ops = [];
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      // Don't overwrite password with masked value
      if (key === 'email_pass' && req.body[key] === '••••••••') continue;
      ops.push(
        prisma.setting.upsert({
          where: { key },
          update: { value: String(req.body[key]) },
          create: { key, value: String(req.body[key]) }
        })
      );
    }
    await Promise.all(ops);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Create transporter ───────────────────────────────────────

const createTransporter = (settings) => {
  const host     = settings.email_host || 'smtp.office365.com';
  const port     = parseInt(settings.email_port || '587', 10);
  const user     = settings.email_user || '';
  const pass     = settings.email_pass || '';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' }
  });
};

// ─── Send emails ──────────────────────────────────────────────

export const sendEmails = async (req, res) => {
  try {
    // Support both contactIds (old) and persons (new direct person list)
    const { contactIds, persons: directPersons, subject, body, replyTo } = req.body;

    if (!subject) return res.status(400).json({ error: 'Subject is required' });
    if (!body)    return res.status(400).json({ error: 'Body is required' });

    const settings = await getSettings();
    if (!settings.email_user || !settings.email_pass) {
      return res.status(400).json({ error: 'Email not configured. Please set up SMTP in Settings.' });
    }

    // Build recipient list — either direct persons or look up contacts by id
    let contacts;
    if (directPersons?.length) {
      contacts = directPersons; // { id, name, email, company? }
    } else if (contactIds?.length) {
      contacts = await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, name: true, email: true, company: true }
      });
    } else {
      return res.status(400).json({ error: 'No recipients selected' });
    }

    const transporter = createTransporter(settings);
    const fromName    = settings.email_from_name || settings.email_user;
    const signature   = settings.email_signature || '';

    const results = { sent: 0, failed: [] };

    for (const contact of contacts) {
      if (!contact.email || contact.email === 'N/A' || !contact.email.includes('@')) {
        results.failed.push({ name: contact.name, reason: 'No valid email address' });
        continue;
      }

      // Replace template variables
      const personalizedBody = body
        .replace(/\{\{name\}\}/g, contact.name || '')
        .replace(/\{\{company\}\}/g, contact.company || '')
        .replace(/\{\{email\}\}/g, contact.email || '');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
          ${personalizedBody.replace(/\n/g, '<br/>')}
          ${signature ? `<br/><br/><div style="border-top:1px solid #eee; padding-top:12px; margin-top:12px;">${signature}</div>` : ''}
        </div>
      `;

      try {
        await transporter.sendMail({
          from:    `"${fromName}" <${settings.email_user}>`,
          to:      `"${contact.name}" <${contact.email}>`,
          replyTo: replyTo || settings.email_user,
          subject,
          html:    htmlBody,
          text:    personalizedBody + (signature ? '\n\n' + signature.replace(/<[^>]+>/g, '') : ''),
        });
        results.sent++;
      } catch (err) {
        results.failed.push({ name: contact.name, reason: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── Test connection ──────────────────────────────────────────

export const testEmailConnection = async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.email_user || !settings.email_pass) {
      return res.status(400).json({ error: 'Email credentials not configured' });
    }
    const transporter = createTransporter(settings);
    await transporter.verify();
    res.json({ ok: true, message: 'SMTP connection successful' });
  } catch (err) {
    res.status(400).json({ error: 'Connection failed: ' + err.message });
  }
};
