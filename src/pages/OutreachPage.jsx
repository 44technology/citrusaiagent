import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Search, CheckSquare, Square, Send, User, Building2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { contactsApi, emailApi } from '../services/api';

const TEMPLATES = [
  {
    name: 'Price Offer',
    subject: 'Fresh Citrus Price Offer – Week {{week}}',
    body: `Dear {{name}},

I hope this message finds you well.

We are pleased to offer you our latest pricing for fresh citrus from Morocco.

Please find below our current availability and competitive pricing. We would love to discuss how we can meet your needs for the upcoming season.

Feel free to reach out at any time — we are always happy to assist.

Best regards,`
  },
  {
    name: 'Shipment Update',
    subject: 'Shipment Update – Your Order',
    body: `Dear {{name}},

I wanted to provide you with a quick update on your current shipment.

Your cargo is on schedule and we will keep you informed of any changes. Please do not hesitate to contact us if you have any questions.

Best regards,`
  },
  {
    name: 'Follow Up',
    subject: 'Following Up – Sweet Fresh',
    body: `Dear {{name}},

I wanted to follow up on our previous conversation and check if you have any questions or if there is anything we can help you with.

We truly value your business and look forward to working with you.

Best regards,`
  },
  {
    name: 'Introduction',
    subject: 'Introduction – Sweet Fresh, Fresh Citrus from Morocco',
    body: `Dear {{name}},

My name is [Your Name] from Sweet Fresh. We are a leading importer of premium fresh citrus from Morocco including Nadorcott, W. Murcott, Clementines and more.

We supply top-quality fruit to distributors and retailers across the United States. I would love the opportunity to discuss how we can serve {{company}}.

Looking forward to hearing from you.

Best regards,`
  },
];

const WEEK = (() => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
})();

export default function OutreachPage() {
  const [contacts, setContacts]       = useState([]);
  const [selected, setSelected]       = useState(new Set());
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('Customer');
  const [subject, setSubject]         = useState('');
  const [body, setBody]               = useState('');
  const [sending, setSending]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState('');
  const [activeTemplate, setActiveTemplate] = useState(null);

  useEffect(() => {
    contactsApi.getAll().then(data => setContacts(Array.isArray(data) ? data : []));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(c => {
      const matchType = !typeFilter || (c.type || '').toLowerCase() === typeFilter.toLowerCase();
      const matchSearch = !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q);
      return matchType && matchSearch && c.email && c.email !== 'N/A' && c.email.includes('@');
    });
  }, [contacts, search, typeFilter]);

  const toggle = (id) => setSelected(p => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const applyTemplate = (t) => {
    setActiveTemplate(t.name);
    setSubject(t.subject.replace(/\{\{week\}\}/g, WEEK));
    setBody(t.body);
  };

  const handleSend = async () => {
    setError('');
    setResult(null);
    if (!selected.size)  { setError('Please select at least one recipient.'); return; }
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!body.trim())    { setError('Email body is required.'); return; }

    setSending(true);
    try {
      const res = await emailApi.send({
        contactIds: [...selected],
        subject,
        body,
      });
      setResult(res);
      if (res.sent > 0) setSelected(new Set());
    } catch (e) {
      setError(e.message || 'Failed to send emails.');
    } finally {
      setSending(false);
    }
  };

  const selectedContacts = contacts.filter(c => selected.has(c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Mail size={24} style={{ color: 'var(--orange-primary)' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Email Outreach
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
          Select contacts, compose your message and send personalized emails.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>

        {/* LEFT: Contact list */}
        <div style={{
          width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12,
          background: 'var(--bg-panel)', border: '1px solid var(--border-glass-light)',
          borderRadius: 14, padding: 16,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            Recipients
            {selected.size > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--orange-primary)', fontWeight: 600 }}>
                ({selected.size} selected)
              </span>
            )}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="ui-input"
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, padding: '8px 8px 8px 32px', fontSize: '0.82rem' }}
            />
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['Customer', 'Lead', ''].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: typeFilter === t ? 'var(--orange-primary)' : 'rgba(255,255,255,0.07)',
                  color: typeFilter === t ? '#fff' : 'var(--text-muted)',
                }}
              >
                {t || 'All'}
              </button>
            ))}
          </div>

          {/* Select all */}
          <button
            onClick={toggleAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
              borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem',
            }}
          >
            {selected.size === filtered.length && filtered.length > 0
              ? <CheckSquare size={14} style={{ color: 'var(--orange-primary)' }} />
              : <Square size={14} />}
            Select all ({filtered.length})
          </button>

          {/* Contact list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: 24 }}>
                No contacts with email found.
              </p>
            ) : filtered.map(c => (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: selected.has(c.id) ? 'rgba(255,107,0,0.1)' : 'rgba(255,255,255,0.03)',
                  borderLeft: selected.has(c.id) ? '3px solid var(--orange-primary)' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: selected.has(c.id) ? 'rgba(255,107,0,0.2)' : 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: selected.has(c.id) ? 'var(--orange-primary)' : 'var(--text-muted)',
                }}>
                  {(c.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', truncate: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.email}
                  </div>
                </div>
                {selected.has(c.id)
                  ? <CheckSquare size={14} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
                  : <Square size={14} style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Composer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* Templates */}
          <div style={{
            background: 'var(--bg-panel)', border: '1px solid var(--border-glass-light)',
            borderRadius: 14, padding: 16,
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
              QUICK TEMPLATES
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => applyTemplate(t)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                    border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                    background: activeTemplate === t.name ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.05)',
                    borderColor: activeTemplate === t.name ? 'var(--orange-primary)' : 'var(--border-glass)',
                    color: activeTemplate === t.name ? 'var(--orange-primary)' : 'var(--text-muted)',
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Variables: <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3 }}>{'{{name}}'}</code>{' '}
              <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3 }}>{'{{company}}'}</code>{' '}
              <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3 }}>{'{{email}}'}</code>
            </p>
          </div>

          {/* Compose */}
          <div style={{
            flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-glass-light)',
            borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {/* To */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>TO</label>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)',
                borderRadius: 8, minHeight: 40,
              }}>
                {selectedContacts.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Select contacts from the left panel...</span>
                ) : selectedContacts.slice(0, 8).map(c => (
                  <span key={c.id} style={{
                    background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.3)',
                    borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', color: 'var(--orange-primary)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {c.name}
                    <X size={10} style={{ cursor: 'pointer' }} onClick={() => toggle(c.id)} />
                  </span>
                ))}
                {selectedContacts.length > 8 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', alignSelf: 'center' }}>
                    +{selectedContacts.length - 8} more
                  </span>
                )}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>SUBJECT</label>
              <input
                className="ui-input"
                placeholder="Email subject..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{ fontSize: '0.9rem' }}
              />
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>MESSAGE</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your message here...&#10;&#10;Use {{name}} for recipient's name, {{company}} for their company."
                style={{
                  flex: 1, minHeight: 220,
                  width: '100%', padding: '14px 16px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)',
                  borderRadius: 8, color: 'white', fontFamily: 'var(--font-main)',
                  fontSize: '0.88rem', resize: 'vertical', outline: 'none', lineHeight: 1.7,
                }}
              />
            </div>

            {/* Error / Result */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
            {result && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#22c55e', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} />
                <span>
                  <strong>{result.sent}</strong> email{result.sent !== 1 ? 's' : ''} sent successfully.
                  {result.failed?.length > 0 && <span style={{ color: '#f59e0b' }}> {result.failed.length} failed.</span>}
                </span>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || !selected.size}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '13px 28px', borderRadius: 10, border: 'none', cursor: selected.size ? 'pointer' : 'not-allowed',
                background: selected.size ? 'var(--orange-primary)' : 'rgba(255,255,255,0.06)',
                color: selected.size ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.2s',
                opacity: sending ? 0.7 : 1,
              }}
            >
              <Send size={18} />
              {sending ? 'Sending...' : `Send to ${selected.size || 0} Contact${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
