import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail, Search, Send, ChevronDown, ChevronRight,
  Plus, Trash2, Edit2, Check, X, AlertCircle, CheckCircle2, Building2, User
} from 'lucide-react';
import { contactsApi, emailApi } from '../services/api';

const TEMPLATES = [
  {
    name: 'Price Offer',
    subject: 'Fresh Citrus Price Offer – Sweet Fresh',
    body: `Dear {{name}},

I hope this message finds you well.

We are pleased to offer you our latest pricing for fresh citrus from Morocco. Please find our current availability and competitive pricing below. We would love to discuss how we can meet your needs for the upcoming season.

Feel free to reach out at any time — we are always happy to assist.

Best regards,`
  },
  {
    name: 'Shipment Update',
    subject: 'Shipment Update – Your Order',
    body: `Dear {{name}},

I wanted to provide you with a quick update on your current shipment. Your cargo is on schedule and we will keep you informed of any changes.

Please do not hesitate to contact us if you have any questions.

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
    subject: 'Introduction – Sweet Fresh, Premium Citrus from Morocco',
    body: `Dear {{name}},

My name is Ali Akdogan from Sweet Fresh. We are a leading importer of premium fresh citrus from Morocco including Nadorcott, W. Murcott, Clementines and more.

We supply top-quality fruit to distributors and retailers across the United States. I would love the opportunity to discuss how we can serve {{company}}.

Looking forward to hearing from you.

Best regards,`
  },
];

// ── Person row inside company ─────────────────────────────────
const PersonRow = ({ person, contactId, checked, onToggle, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: person.name, title: person.title || '', email: person.email || '', phone: person.phone || '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await contactsApi.updatePerson(contactId, person.id, form);
      onUpdate(updated);
      setEditing(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div style={{ padding: '10px 14px', background: 'rgba(255,107,0,0.06)', borderRadius: 8, marginBottom: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          {[['name','Name *'],['title','Title'],['email','Email'],['phone','Phone']].map(([k,l]) => (
            <input key={k} className="ui-input" placeholder={l}
              value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
              style={{ padding: '7px 10px', fontSize: '0.8rem' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={saving} style={{ padding: '5px 14px', borderRadius: 6, background: 'var(--orange-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
            {saving ? '...' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} style={{ padding: '5px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const hasEmail = person.email && person.email.includes('@');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      borderRadius: 8, marginBottom: 3,
      background: checked ? 'rgba(255,107,0,0.08)' : 'rgba(255,255,255,0.02)',
      borderLeft: checked ? '3px solid var(--orange-primary)' : '3px solid transparent',
      opacity: hasEmail ? 1 : 0.5,
    }}>
      <button
        onClick={() => hasEmail && onToggle(person)}
        disabled={!hasEmail}
        style={{
          width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? 'var(--orange-primary)' : 'rgba(255,255,255,0.2)'}`,
          background: checked ? 'var(--orange-primary)' : 'transparent',
          cursor: hasEmail ? 'pointer' : 'not-allowed', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked && <Check size={11} color="#fff" strokeWidth={3} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
          {person.name}
          {person.title && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>· {person.title}</span>}
        </div>
        <div style={{ fontSize: '0.72rem', color: hasEmail ? '#38bdf8' : 'var(--text-muted)' }}>
          {hasEmail ? person.email : 'No email — add one to send'}
          {person.phone && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{person.phone}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 3 }}>
          <Edit2 size={13} />
        </button>
        <button onClick={() => { if (window.confirm('Are you sure you want to delete this contact person?')) onDelete(person.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 3 }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ── Add person form ───────────────────────────────────────────
const AddPersonForm = ({ contactId, onAdded, onCancel }) => {
  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const p = await contactsApi.createPerson(contactId, form);
      onAdded(p);
      setForm({ name: '', title: '', email: '', phone: '' });
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 4, border: '1px dashed rgba(255,107,0,0.3)' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--orange-primary)', marginBottom: 8 }}>NEW CONTACT</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {[['name','Name *'],['title','Title / Role'],['email','Email'],['phone','Phone']].map(([k,l]) => (
          <input key={k} className="ui-input" placeholder={l}
            value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
            style={{ padding: '7px 10px', fontSize: '0.8rem' }}
            onKeyDown={e => e.key === 'Enter' && save()} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: '5px 14px', borderRadius: 6, background: 'var(--orange-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
          {saving ? 'Adding...' : 'Add'}
        </button>
        <button onClick={onCancel} style={{ padding: '5px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Company card ──────────────────────────────────────────────
const CompanyCard = ({ contact, selectedPersonIds, onTogglePerson }) => {
  const [expanded, setExpanded] = useState(false);
  const [persons, setPersons] = useState(null); // null = not loaded
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (persons !== null) return;
    setLoading(true);
    try {
      const data = await contactsApi.getPersons(contact.id);
      setPersons(data);
    } catch (e) { setPersons([]); }
    finally { setLoading(false); }
  };

  const toggle = () => {
    if (!expanded) load();
    setExpanded(p => !p);
  };

  const checkedCount = (persons || []).filter(p => selectedPersonIds.has(p.id)).length;

  return (
    <div style={{ marginBottom: 6, borderRadius: 10, border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
      {/* Company header */}
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: checkedCount > 0 ? 'rgba(255,107,0,0.07)' : 'var(--bg-panel)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        {expanded ? <ChevronDown size={14} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
                  : <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        <Building2 size={14} style={{ color: checkedCount > 0 ? 'var(--orange-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {contact.company || contact.name}
          </div>
          {contact.company && contact.company !== contact.name && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{contact.name}</div>
          )}
        </div>
        {checkedCount > 0 && (
          <span style={{ background: 'var(--orange-primary)', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
            {checkedCount}
          </span>
        )}
      </button>

      {/* Persons list */}
      {expanded && (
        <div style={{ padding: '8px 10px 10px', background: 'rgba(0,0,0,0.15)' }}>
          {loading && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', padding: '6px 4px' }}>Loading...</div>}

          {(persons || []).map(p => (
            <PersonRow
              key={p.id}
              person={p}
              contactId={contact.id}
              checked={selectedPersonIds.has(p.id)}
              onToggle={onTogglePerson}
              onUpdate={updated => setPersons(prev => prev.map(x => x.id === updated.id ? updated : x))}
              onDelete={async (pid) => {
                await contactsApi.deletePerson(contact.id, pid);
                setPersons(prev => prev.filter(x => x.id !== pid));
                onTogglePerson({ id: pid, _remove: true });
              }}
            />
          ))}

          {(persons || []).length === 0 && !loading && !showAdd && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '4px 4px 8px' }}>
              No contacts yet. Add the first one.
            </div>
          )}

          {showAdd ? (
            <AddPersonForm
              contactId={contact.id}
              onAdded={p => { setPersons(prev => [...(prev || []), p]); setShowAdd(false); }}
              onCancel={() => setShowAdd(false)}
            />
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6, background: 'none', border: '1px dashed rgba(255,107,0,0.3)', cursor: 'pointer', color: 'var(--orange-primary)', fontSize: '0.75rem', fontWeight: 600, marginTop: 4 }}
            >
              <Plus size={12} /> Add Contact
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────
export default function OutreachPage() {
  const [contacts, setContacts]   = useState([]);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('Customer');
  // selectedPersons: Map<personId, { name, email, companyName }>
  const [selectedPersons, setSelectedPersons] = useState(new Map());
  const [subject, setSubject]     = useState('');
  const [body, setBody]           = useState('');
  const [sending, setSending]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
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
        (c.company || '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [contacts, search, typeFilter]);

  const handleTogglePerson = (person) => {
    if (person._remove) {
      setSelectedPersons(prev => { const n = new Map(prev); n.delete(person.id); return n; });
      return;
    }
    setSelectedPersons(prev => {
      const n = new Map(prev);
      if (n.has(person.id)) n.delete(person.id);
      else n.set(person.id, person);
      return n;
    });
  };

  const applyTemplate = (t) => {
    setActiveTemplate(t.name);
    setSubject(t.subject);
    setBody(t.body);
  };

  const handleSend = async () => {
    setError(''); setResult(null);
    if (!selectedPersons.size) { setError('Please select at least one recipient.'); return; }
    if (!subject.trim())       { setError('Subject is required.'); return; }
    if (!body.trim())          { setError('Email body is required.'); return; }

    setSending(true);
    try {
      const persons = [...selectedPersons.values()];
      const res = await emailApi.sendToPersons({ persons, subject, body });
      setResult(res);
      if (res.sent > 0) setSelectedPersons(new Map());
    } catch (e) {
      setError(e.message || 'Failed to send emails.');
    } finally { setSending(false); }
  };

  const selectedList = [...selectedPersons.values()];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Mail size={24} style={{ color: 'var(--orange-primary)' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Email Outreach</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
          Select contacts from companies, compose your message and send personalized emails.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, minHeight: 0 }}>

        {/* LEFT: Company + persons list */}
        <div style={{
          width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
          background: 'var(--bg-panel)', border: '1px solid var(--border-glass-light)',
          borderRadius: 14, padding: 16,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            Companies & Contacts
            {selectedPersons.size > 0 && (
              <span style={{ marginLeft: 8, color: 'var(--orange-primary)', fontWeight: 600 }}>
                ({selectedPersons.size} selected)
              </span>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="ui-input" placeholder="Search companies..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, padding: '8px 8px 8px 32px', fontSize: '0.82rem' }} />
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {['Customer', 'Lead', ''].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: typeFilter === t ? 'var(--orange-primary)' : 'rgba(255,255,255,0.07)',
                color: typeFilter === t ? '#fff' : 'var(--text-muted)',
              }}>{t || 'All'}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginTop: 24 }}>No companies found.</p>
            ) : filtered.map(c => (
              <CompanyCard
                key={c.id}
                contact={c}
                selectedPersonIds={new Set(selectedPersons.keys())}
                onTogglePerson={handleTogglePerson}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: Composer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

          {/* Templates */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-glass-light)', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>QUICK TEMPLATES</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TEMPLATES.map(t => (
                <button key={t.name} onClick={() => applyTemplate(t)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                  background: activeTemplate === t.name ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.05)',
                  borderColor: activeTemplate === t.name ? 'var(--orange-primary)' : 'var(--border-glass)',
                  color: activeTemplate === t.name ? 'var(--orange-primary)' : 'var(--text-muted)',
                }}>{t.name}</button>
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Variables:{' '}
              {['{{name}}','{{company}}','{{email}}'].map(v => (
                <code key={v} style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3, marginRight: 4 }}>{v}</code>
              ))}
            </p>
          </div>

          {/* Compose */}
          <div style={{ flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border-glass-light)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* To */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>TO</label>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)',
                borderRadius: 8, minHeight: 42,
              }}>
                {selectedList.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', alignSelf: 'center' }}>
                    Expand a company on the left and check contacts...
                  </span>
                ) : selectedList.slice(0, 6).map(p => (
                  <span key={p.id} style={{
                    background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.3)',
                    borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', color: 'var(--orange-primary)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {p.name}
                    <X size={10} style={{ cursor: 'pointer' }} onClick={() => handleTogglePerson(p)} />
                  </span>
                ))}
                {selectedList.length > 6 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', alignSelf: 'center' }}>+{selectedList.length - 6} more</span>
                )}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>SUBJECT</label>
              <input className="ui-input" placeholder="Email subject..." value={subject} onChange={e => setSubject(e.target.value)} style={{ fontSize: '0.9rem' }} />
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>MESSAGE</label>
              <textarea
                value={body} onChange={e => setBody(e.target.value)}
                placeholder="Write your message here...&#10;&#10;Use {{name}} for recipient name, {{company}} for their company."
                style={{
                  flex: 1, minHeight: 200, width: '100%', padding: '14px 16px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)',
                  borderRadius: 8, color: 'white', fontFamily: 'var(--font-main)',
                  fontSize: '0.88rem', resize: 'vertical', outline: 'none', lineHeight: 1.7,
                }}
              />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}
            {result && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#22c55e', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} />
                <span>
                  <strong>{result.sent}</strong> email{result.sent !== 1 ? 's' : ''} sent.
                  {result.failed?.length > 0 && <span style={{ color: '#f59e0b' }}> {result.failed.length} failed: {result.failed.map(f => f.name).join(', ')}</span>}
                </span>
              </div>
            )}

            <button
              onClick={handleSend} disabled={sending || !selectedPersons.size}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '13px 28px', borderRadius: 10, border: 'none',
                cursor: selectedPersons.size ? 'pointer' : 'not-allowed',
                background: selectedPersons.size ? 'var(--orange-primary)' : 'rgba(255,255,255,0.06)',
                color: selectedPersons.size ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.2s', opacity: sending ? 0.7 : 1,
              }}
            >
              <Send size={18} />
              {sending ? 'Sending...' : `Send to ${selectedPersons.size || 0} Contact${selectedPersons.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
