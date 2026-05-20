import React, { useState, useEffect } from 'react';
import { Leaf, Plus, Search, X, ChevronDown, ChevronRight, Phone, Mail, Building, Tag, DollarSign, Package, TrendingDown, TrendingUp, Edit3, Save, Loader2 } from 'lucide-react';
import { contactsApi, ordersApi } from '../services/api';

// ── Product / Variety catalogue (same as OrderModal) ─────────
const PRODUCTS = {
  'Orange':   ['Navel', 'Valencia', 'Blood Orange', 'Cara Cara', 'Other'],
  'Mandarin': ['Nadorcott', 'W Murcot', 'Clementines', 'Tango', 'Other'],
  'Lemon':    ['Eureka', 'Lisbon', 'Meyer', 'Other'],
  'Lime':     ['Persian', 'Key Lime', 'Kaffir', 'Other'],
};

// ── Add Grower Modal ──────────────────────────────────────────
const AddGrowerModal = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '',
    country: 'Morocco', region: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name) { alert('Grower name is required'); return; }
    setSaving(true);
    try {
      await contactsApi.create({
        name: form.name,
        company: form.company || 'N/A',
        phone: form.phone || 'N/A',
        email: form.email || 'N/A',
        type: 'Grower',
        department: form.region || '',
        language: form.country || 'Morocco',
        status: 'Active',
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: 480, padding: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="flex-center gap-2">
            <Leaf size={18} className="text-orange" />
            <h3 style={{ margin: 0 }}>Add Grower</h3>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'GROWER NAME *', key: 'name', placeholder: 'e.g. Ahmed Farms' },
            { label: 'COMPANY', key: 'company', placeholder: 'Company name' },
            { label: 'PHONE', key: 'phone', placeholder: '+212 ...' },
            { label: 'EMAIL', key: 'email', placeholder: 'email@example.com' },
            { label: 'COUNTRY', key: 'country', placeholder: 'Morocco' },
            { label: 'REGION', key: 'region', placeholder: 'e.g. Agadir, Souss-Massa' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
              <input className="ui-input" placeholder={placeholder} value={form[key]} onChange={e => set(key, e.target.value)} style={{ width: '100%' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save Grower'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Add Offer Modal ───────────────────────────────────────────
const AddOfferModal = ({ grower, onClose, onSaved }) => {
  const [form, setForm] = useState({
    product: 'Mandarin', variety: 'Nadorcott', boxType: '',
    boxQuantity: '', purchasePrice: '', week: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.product || !form.variety || !form.boxQuantity || !form.purchasePrice) {
      alert('Please fill Product, Variety, Quantity and Price');
      return;
    }
    setSaving(true);
    try {
      await ordersApi.create({
        product: form.product,
        variety: form.variety,
        boxType: form.boxType,
        boxQuantity: form.boxQuantity,
        purchasePrice: form.purchasePrice,
        week: form.week,
        grower: grower.name,
        contactId: grower.id,
        status: 'offer',
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const varieties = PRODUCTS[form.product] || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: 500, padding: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={18} className="text-orange" /> Add Purchase Offer
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>from {grower.name}</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PRODUCT *</label>
              <select className="ui-select" value={form.product} onChange={e => { set('product', e.target.value); set('variety', PRODUCTS[e.target.value]?.[0] || ''); }}>
                {Object.keys(PRODUCTS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>VARIETY *</label>
              <select className="ui-select" value={form.variety} onChange={e => set('variety', e.target.value)}>
                {varieties.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>BOX TYPE</label>
              <input className="ui-input" placeholder="e.g. 5kg, 10kg" value={form.boxType} onChange={e => set('boxType', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>BOX QTY *</label>
              <input type="number" className="ui-input" placeholder="0" value={form.boxQuantity} onChange={e => set('boxQuantity', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PURCHASE PRICE / BOX ($) *</label>
              <input type="number" className="ui-input" placeholder="0.00" step="0.01" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>WEEK</label>
              <input className="ui-input" placeholder="e.g. Week 22" value={form.week} onChange={e => set('week', e.target.value)} />
            </div>
          </div>

          {form.purchasePrice && form.boxQuantity && (
            <div style={{ padding: '10px 14px', background: 'rgba(255,107,0,0.06)', borderRadius: 8, fontSize: '0.85rem' }}>
              Total Offer Value: <strong style={{ color: 'var(--orange-primary)' }}>
                ${(parseFloat(form.purchasePrice) * parseInt(form.boxQuantity)).toLocaleString()}
              </strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Add Offer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Grower Card ───────────────────────────────────────────────
const GrowerCard = ({ grower, orders, onAddOffer, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);

  const growerOrders = orders.filter(o =>
    o.grower?.toLowerCase() === grower.name?.toLowerCase() ||
    o.contactId === grower.id
  );

  const totalBoxes   = growerOrders.reduce((s, o) => s + (o.boxQuantity || 0), 0);
  const totalValue   = growerOrders.reduce((s, o) => s + ((o.purchasePrice || 0) * (o.boxQuantity || 0)), 0);
  const avgPrice     = growerOrders.length
    ? (growerOrders.reduce((s, o) => s + (o.purchasePrice || 0), 0) / growerOrders.length).toFixed(2)
    : null;

  const country = grower.language || 'Morocco';
  const region  = grower.department || '';

  return (
    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
        onClick={() => setExpanded(p => !p)}
      >
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))',
          border: '2px solid rgba(255,107,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', fontWeight: 700, color: 'var(--orange-primary)'
        }}>
          {grower.name?.charAt(0)?.toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{grower.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {grower.company && grower.company !== 'N/A' && <span><Building size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {grower.company}</span>}
            <span>🌍 {country}{region ? `, ${region}` : ''}</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--orange-primary)' }}>{growerOrders.length}</div>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>Orders</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{totalBoxes.toLocaleString()}</div>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>Boxes</div>
          </div>
          {avgPrice && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>${avgPrice}</div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>Avg Price</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '5px 10px', whiteSpace: 'nowrap' }}
              onClick={e => { e.stopPropagation(); onAddOffer(grower); }}
            >
              <Plus size={13} /> Offer
            </button>
            {expanded ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-glass-light)', padding: '12px 20px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: growerOrders.length > 0 ? 14 : 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {grower.phone && grower.phone !== 'N/A' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={13} /> {grower.phone}
              </span>
            )}
            {grower.email && grower.email !== 'N/A' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={13} /> {grower.email}
              </span>
            )}
          </div>

          {/* Orders Table */}
          {growerOrders.length > 0 && (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--orange-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Purchase Offers / Orders
              </div>
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border-glass-light)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['Ref ID', 'Product', 'Variety', 'Box Type', 'Qty', 'Purchase Price', 'Total', 'Week', 'Status'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {growerOrders.map((o, i) => {
                      const total = (o.purchasePrice || 0) * (o.boxQuantity || 0);
                      return (
                        <tr key={o.id} style={{ borderTop: '1px solid var(--border-glass-light)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding: '8px 12px', color: 'var(--orange-primary)', fontWeight: 700 }}>#{o.referenceId}</td>
                          <td style={{ padding: '8px 12px' }}>{o.product}</td>
                          <td style={{ padding: '8px 12px' }}>{o.variety}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{o.boxType || '—'}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{(o.boxQuantity || 0).toLocaleString()}</td>
                          <td style={{ padding: '8px 12px', color: '#f59e0b', fontWeight: 600 }}>
                            {o.purchasePrice ? `$${parseFloat(o.purchasePrice).toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--orange-primary)' }}>
                            {total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{o.week || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600,
                              background: o.status === 'offer' ? 'rgba(245,158,11,0.15)' : o.status === 'confirmed' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                              color: o.status === 'offer' ? '#f59e0b' : o.status === 'confirmed' ? '#22c55e' : 'var(--text-muted)'
                            }}>
                              {o.status || 'pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {growerOrders.length > 1 && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border-glass-light)', background: 'rgba(255,255,255,0.03)' }}>
                        <td colSpan={4} style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{totalBoxes.toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#f59e0b' }}>${avgPrice} avg</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--orange-primary)' }}>${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}

          {growerOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No offers yet — click <strong>+ Offer</strong> to add one
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
const GrowersPage = () => {
  const [growers, setGrowers]   = useState([]);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [offerGrower, setOfferGrower] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contacts, allOrders] = await Promise.all([
        contactsApi.getAll('Grower'),
        ordersApi.getAll()
      ]);
      setGrowers(contacts);
      setOrders(allOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = growers.filter(g =>
    !search ||
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.company?.toLowerCase().includes(search.toLowerCase()) ||
    g.language?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalGrowers  = growers.length;
  const growerOrders  = orders.filter(o => o.grower || growers.some(g => g.id === o.contactId));
  const totalBoxes    = growerOrders.reduce((s, o) => s + (o.boxQuantity || 0), 0);
  const totalValue    = growerOrders.reduce((s, o) => s + ((o.purchasePrice || 0) * (o.boxQuantity || 0)), 0);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="flex-between">
        <div className="page-header">
          <div className="page-icon-box">
            <Leaf size={24} className="text-orange" />
          </div>
          <div>
            <h1 className="page-title">Growers</h1>
            <p className="page-subtitle">Manage your suppliers and track purchase offers.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add Grower
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Growers', value: totalGrowers, icon: Leaf, color: '#22c55e' },
          { label: 'Total Boxes Ordered', value: totalBoxes.toLocaleString(), icon: Package, color: 'var(--orange-primary)' },
          { label: 'Total Purchase Value', value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`, icon: DollarSign, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="ui-input"
          placeholder="Search growers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 38, width: '100%' }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="loader" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Leaf size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>{search ? 'No growers found.' : 'No growers yet. Click "Add Grower" to get started.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(g => (
            <GrowerCard
              key={g.id}
              grower={g}
              orders={orders}
              onAddOffer={setOfferGrower}
              onRefresh={loadData}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddGrowerModal onClose={() => setShowAdd(false)} onSaved={loadData} />
      )}
      {offerGrower && (
        <AddOfferModal
          grower={offerGrower}
          onClose={() => setOfferGrower(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
};

export default GrowersPage;
