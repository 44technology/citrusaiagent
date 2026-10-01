import React, { useState, useEffect } from 'react';
import {
  Link2, Plus, X, Copy, Check, ClipboardList, Clock, Send, ThumbsUp, ThumbsDown,
  Trash2, ExternalLink, Package,
} from 'lucide-react';
import { orderRequestsApi, contactsApi, productsApi } from '../services/api';

const STATUS_STYLE = {
  Draft:     { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', color: '#94a3b8', icon: Link2 },
  Submitted: { bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)',  color: '#38bdf8', icon: Send },
  Approved:  { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   color: '#22c55e', icon: ThumbsUp },
  Rejected:  { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#ef4444', icon: ThumbsDown },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Draft;
  const Icon = s.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 12, fontSize: '0.74rem', fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      <Icon size={12} /> {status}
    </span>
  );
};

const publicUrl = (token) => `${window.location.origin}/order/${token}`;

const CopyLinkButton = ({ token }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(publicUrl(token)); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { window.prompt('Copy this link:', publicUrl(token)); }
  };
  return (
    <button className="btn btn-glass" style={{ padding: '5px 10px', fontSize: '0.76rem', gap: 5 }} onClick={copy}>
      {copied ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy Link'}
    </button>
  );
};

// ─── New link modal ───────────────────────────────────────────────────────

const NewLinkModal = ({ onClose, onCreated }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [contactId, setContactId] = useState('');
  const [productId, setProductId] = useState('');
  const [varietyId, setVarietyId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  useEffect(() => {
    contactsApi.getAll('Customer').then(setCustomers).catch(() => {});
    productsApi.getAll().then(list => setProducts(Array.isArray(list) ? list : [])).catch(() => {});
  }, []);

  const product = products.find(p => p.id === productId);
  const varieties = product?.varieties || [];
  const variety = varieties.find(v => v.id === varietyId);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!contactId || !product || !variety) { setError('Pick a customer, product and variety'); return; }
    setSaving(true);
    try {
      const req = await orderRequestsApi.create({ contactId, product: product.name, variety: variety.name });
      setCreated(req);
      onCreated();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem' }}>New Order Link</h2>
          <button className="btn btn-glass" style={{ padding: '6px 8px' }} onClick={onClose}><X size={16} /></button>
        </div>

        {created ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem' }}>Link created for <strong>{created.contact?.name}</strong> — {created.product} · {created.variety}</span>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Send this link to the customer</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="ui-input" readOnly value={publicUrl(created.token)} onClick={e => e.target.select()} style={{ flex: 1, fontSize: '0.82rem' }} />
                <CopyLinkButton token={created.token} />
              </div>
              <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 8 }}>
                Paste it into your usual email to the customer — this replaces typing the order manually. It works only once; you can create a new one anytime.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Customer *</label>
              <select className="ui-input" value={contactId} onChange={e => setContactId(e.target.value)} required>
                <option value="">Select a customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Product *</label>
              <select className="ui-input" value={productId} onChange={e => { setProductId(e.target.value); setVarietyId(''); }} required>
                <option value="">Select a product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {products.length === 0 && <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>No products yet — add some on the Products page first.</p>}
            </div>
            {productId && (
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Variety *</label>
                <select className="ui-input" value={varietyId} onChange={e => setVarietyId(e.target.value)} required>
                  <option value="">Select a variety...</option>
                  {varieties.map(v => <option key={v.id} value={v.id}>{v.name}{v.isJuice ? ' (Juice)' : ''}</option>)}
                </select>
              </div>
            )}
            {error && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ gap: 6 }}><Link2 size={14} /> {saving ? 'Creating...' : 'Create Link'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Request detail / review ──────────────────────────────────────────────

const RequestDetail = ({ request, onClose, onChanged }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const weeks = Array.isArray(request.weeks) ? request.weeks : [];
  const totalContainers = weeks.reduce((s, w) => s + (w.containers || 0), 0);

  const approve = async () => {
    if (!window.confirm(`Approve this request? It will create ${weeks.length} order${weeks.length > 1 ? 's' : ''} (one per week).`)) return;
    setBusy(true);
    try { await orderRequestsApi.approve(request.id); onChanged(); onClose(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };

  const rejectIt = async () => {
    setBusy(true);
    try { await orderRequestsApi.reject(request.id, reason); onChanged(); onClose(); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.15rem' }}>{request.contact?.name}</h2>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>{request.product} · {request.variety}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusBadge status={request.status} />
            <button className="btn btn-glass" style={{ padding: '6px 8px' }} onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {request.status === 'Draft' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>Waiting on the customer to open the link and fill it in.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="ui-input" readOnly value={publicUrl(request.token)} onClick={e => e.target.select()} style={{ flex: 1, fontSize: '0.8rem' }} />
              <CopyLinkButton token={request.token} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div className="glass-panel" style={{ padding: 14 }}>
                <p className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>LOCATION</p>
                <p style={{ fontWeight: 600 }}>{request.location || '—'}</p>
              </div>
              <div className="glass-panel" style={{ padding: 14 }}>
                <p className="text-muted" style={{ fontSize: '0.72rem', marginBottom: 4 }}>TOTAL CONTAINERS</p>
                <p style={{ fontWeight: 700, color: 'var(--orange-primary)' }}>{totalContainers}</p>
              </div>
            </div>

            <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>WEEKS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {weeks.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.85rem' }}>
                  <span>Week {w.week}</span>
                  <strong>{w.containers} container{w.containers > 1 ? 's' : ''}</strong>
                </div>
              ))}
            </div>

            {request.notes && (
              <div style={{ marginBottom: 14 }}>
                <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 6 }}>NOTES</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{request.notes}</p>
              </div>
            )}

            {request.status === 'Submitted' && (
              <>
                <input className="ui-input" placeholder="Reason (only needed if rejecting)" value={reason} onChange={e => setReason(e.target.value)} style={{ marginBottom: 10, fontSize: '0.85rem' }} />
                {error && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: 8 }}>{error}</div>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-glass" style={{ color: '#ef4444', gap: 6 }} disabled={busy} onClick={rejectIt}><ThumbsDown size={14} /> Reject</button>
                  <button className="btn btn-primary" style={{ gap: 6 }} disabled={busy} onClick={approve}><ThumbsUp size={14} /> Approve & Create Orders</button>
                </div>
              </>
            )}

            {request.status === 'Rejected' && request.rejectReason && (
              <p style={{ fontSize: '0.82rem', color: '#ef4444' }}>Rejected: {request.rejectReason}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Page ──────────────────────────────────────────────────────────────────

const OrderRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

  const load = async () => {
    try { setRequests(await orderRequestsApi.getAll()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this link/request? This cannot be undone.')) return;
    try { await orderRequestsApi.delete(id); load(); }
    catch (err) { alert(err.message); }
  };

  const filtered = statusFilter === 'All' ? requests : requests.filter(r => r.status === statusFilter);
  const pendingCount = requests.filter(r => r.status === 'Submitted').length;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <ClipboardList className="text-orange" size={28} /> Order Requests
          </h1>
          <p className="text-muted" style={{ marginTop: 4 }}>Send a customer a link instead of an email — they fill in quantities, timing and location themselves.</p>
        </div>
        <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Order Link
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['All', 'Draft', 'Submitted', 'Approved', 'Rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{
              padding: '7px 16px', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
              background: statusFilter === s ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${statusFilter === s ? 'var(--orange-primary)' : 'var(--border-glass)'}`,
              color: statusFilter === s ? 'var(--orange-primary)' : 'var(--text-muted)',
            }}>
            {s}{s === 'Submitted' && pendingCount > 0 && <span style={{ background: 'rgba(56,189,248,0.25)', color: '#38bdf8', padding: '1px 7px', borderRadius: 10, fontSize: '0.7rem' }}>{pendingCount}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Link2 size={40} style={{ opacity: 0.25, marginBottom: 10 }} />
          <p>{requests.length === 0 ? 'No order links yet — create one above.' : 'Nothing matches this filter.'}</p>
        </div>
      ) : (
        <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="customer-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>PRODUCT / VARIETY</th>
                <th>LOCATION</th>
                <th>CONTAINERS</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const total = Array.isArray(r.weeks) ? r.weeks.reduce((s, w) => s + (w.containers || 0), 0) : 0;
                return (
                  <tr key={r.id} className="shipment-card" style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                    <td style={{ fontWeight: 600 }}>{r.contact?.name || '—'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Package size={13} style={{ color: 'var(--orange-primary)' }} /> {r.product} · {r.variety}</span>
                    </td>
                    <td className="text-muted">{r.location || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{total || '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                      {r.status === 'Draft' && (
                        <a href={publicUrl(r.token)} target="_blank" rel="noreferrer" className="btn btn-glass" style={{ padding: '5px 8px' }} title="Open link">
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button className="btn btn-glass" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={(e) => handleDelete(e, r.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewLinkModal onClose={() => setShowNew(false)} onCreated={load} />}
      {selected && <RequestDetail request={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  );
};

export default OrderRequestsPage;
