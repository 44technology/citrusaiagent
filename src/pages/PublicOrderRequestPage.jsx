import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Citrus, Plus, Trash2, Send, CheckCircle2, AlertTriangle, Loader2, Package } from 'lucide-react';
import { publicOrderRequestApi } from '../services/api';

// Standalone, unauthenticated page — no Sidebar/Header. Reached at /order/:token.

const emptyRow = () => ({ week: '', containers: '' });

const PublicOrderRequestPage = () => {
  const { token } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [rows, setRows] = useState([emptyRow()]);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    publicOrderRequestApi.get(token)
      .then(r => { setRequest(r); if (r.status !== 'Draft') setDone(true); })
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const setRow = (i, field, value) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const addRow = () => setRows(rs => [...rs, emptyRow()]);
  const removeRow = (i) => setRows(rs => rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i));

  const totalContainers = rows.reduce((s, r) => s + (parseInt(r.containers, 10) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const weeks = rows
      .map(r => ({ week: parseInt(r.week, 10), containers: parseInt(r.containers, 10) }))
      .filter(w => w.week && w.containers);
    if (weeks.length === 0) { setSubmitError('Add at least one week with a container count.'); return; }
    if (weeks.some(w => w.week < 1 || w.week > 53)) { setSubmitError('Week numbers must be between 1 and 53.'); return; }
    if (!location.trim()) { setSubmitError('Location is required.'); return; }
    setSaving(true);
    try {
      await publicOrderRequestApi.submit(token, { weeks, location: location.trim(), notes: notes.trim() });
      setDone(true);
    } catch (err) {
      setSubmitError(err.message);
    }
    setSaving(false);
  };

  return (
    // #root (app shell) is a flex container sized to the viewport, so this
    // page — rendered inside it, standalone, no Sidebar/Header — must claim
    // the full width/height itself and manage its own scrolling, otherwise
    // it shrinks to content size and sticks to the top-left instead of
    // filling and centering in the viewport.
    <div style={{
      width: '100%', height: '100vh', overflowY: 'auto', background: '#0a0d14',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <img src="/logo.png" alt="" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>Sweet Fresh Portal</span>
        </div>

        <div style={{ background: 'var(--bg-panel, #131722)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 'clamp(22px, 5vw, 40px)' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: '#94a3b8' }}>
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : loadError ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <AlertTriangle size={32} style={{ color: '#ef4444', marginBottom: 10 }} />
              <p style={{ color: '#f87171' }}>{loadError}</p>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 6 }}>Please contact us for a new link.</p>
            </div>
          ) : done ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <CheckCircle2 size={40} style={{ color: '#22c55e', marginBottom: 12 }} />
              <h2 style={{ color: 'white', fontSize: '1.2rem', marginBottom: 8 }}>
                {request?.status === 'Draft' ? 'Thank you!' : 'Already submitted'}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                {request?.status === 'Draft'
                  ? "We've received your order request and will confirm it shortly."
                  : `This request was already submitted (status: ${request?.status}). Contact us if anything needs to change.`}
              </p>
              {request?.status !== 'Draft' && Array.isArray(request?.weeks) && request.weeks.length > 0 && (
                <div style={{ marginTop: 18, textAlign: 'left', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14 }}>
                  {request.weeks.map((w, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0', padding: '4px 0' }}>
                      <span>Week {w.week}</span><strong>{w.containers} container{w.containers > 1 ? 's' : ''}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Citrus size={18} style={{ color: '#ff6b00' }} />
                <span style={{ color: '#ff6b00', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em' }}>ORDER REQUEST</span>
              </div>
              <h1 style={{ color: 'white', fontSize: '1.6rem', margin: '4px 0 4px' }}>{request?.contact?.name}</h1>
              <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Package size={16} /> {request?.product} · {request?.variety}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', marginBottom: 10 }}>
                    How many containers, and which week(s)? *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rows.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <input type="number" min="1" max="53" placeholder="Week #" value={r.week}
                            onChange={e => setRow(i, 'week', e.target.value)}
                            style={fieldStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <input type="number" min="1" placeholder="Containers" value={r.containers}
                            onChange={e => setRow(i, 'containers', e.target.value)}
                            style={fieldStyle} />
                        </div>
                        <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1}
                          style={{ background: 'none', border: 'none', color: rows.length === 1 ? '#3f4658' : '#ef4444', cursor: rows.length === 1 ? 'default' : 'pointer', padding: 6, flexShrink: 0 }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addRow} style={addRowBtn}><Plus size={13} /> Add another week</button>
                  {totalContainers > 0 && (
                    <p style={{ color: '#ff6b00', fontSize: '0.8rem', marginTop: 8, fontWeight: 700 }}>Total: {totalContainers} container{totalContainers > 1 ? 's' : ''}</p>
                  )}
                </div>

                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>Location (destination port / country) *</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Rotterdam, Netherlands" style={fieldStyle} />
                </div>

                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>Notes (optional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anything else we should know?" style={{ ...fieldStyle, resize: 'vertical' }} />
                </div>

                {submitError && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{submitError}</div>}

                <button type="submit" disabled={saving} style={submitBtn}>
                  <Send size={15} /> {saving ? 'Sending...' : 'Submit Order Request'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const fieldStyle = {
  width: '100%', padding: '13px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
};
const addRowBtn = {
  marginTop: 10, background: 'none', border: '1px dashed rgba(255,107,0,0.4)', color: '#ff6b00',
  borderRadius: 8, padding: '9px 14px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};
const submitBtn = {
  background: 'linear-gradient(135deg, #ff6b00, #FF5100)', border: 'none', color: 'white',
  borderRadius: 11, padding: '15px 22px', fontSize: '1.02rem', fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
};

export default PublicOrderRequestPage;
