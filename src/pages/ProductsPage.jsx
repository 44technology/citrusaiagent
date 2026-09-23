import React, { useState, useEffect } from 'react';
import {
  Citrus, Plus, Trash2, X, Edit3, Droplets, Globe, AlertTriangle, Check,
  Layers, CalendarRange, Sparkles,
} from 'lucide-react';
import { productsApi } from '../services/api';

// ─── Constants & helpers ─────────────────────────────────────────────────────

const QUARTERS = [
  { q: 1, label: 'Q1', months: 'Jan – Mar' },
  { q: 2, label: 'Q2', months: 'Apr – Jun' },
  { q: 3, label: 'Q3', months: 'Jul – Sep' },
  { q: 4, label: 'Q4', months: 'Oct – Dec' },
];

const PRODUCT_SUGGESTIONS = ['Orange', 'Mandarin', 'Lemon', 'Grape', 'Grapefruit', 'Pomegranate', 'Lime', 'Clementine'];

const COUNTRY_SUGGESTIONS = [
  'Morocco', 'Spain', 'Egypt', 'Turkey', 'South Africa', 'Peru', 'Chile', 'Argentina', 'Brazil',
  'Uruguay', 'Israel', 'Greece', 'Italy', 'Portugal', 'Tunisia', 'Cyprus', 'USA', 'Mexico',
  'Colombia', 'Ecuador', 'Australia', 'India', 'Zimbabwe', 'Mozambique', 'China',
];

const currentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;

// Stable colour per country so the same country reads the same everywhere.
const countryHue = (name) => {
  let h = 0;
  for (const ch of String(name).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};
const chipStyle = (country) => {
  const h = countryHue(country);
  return {
    background: `hsl(${h} 70% 55% / 0.14)`,
    border: `1px solid hsl(${h} 70% 60% / 0.4)`,
    color: `hsl(${h} 80% 74%)`,
  };
};

const varietyCoverage = (v) => {
  const set = new Set();
  (v.sources || []).forEach(s => s.quarters.forEach(q => set.add(q)));
  return set;
};
const sourcesInQuarter = (v, q) => (v.sources || []).filter(s => s.quarters.includes(q));

const currentUserRole = () => {
  try { return JSON.parse(localStorage.getItem('citrus_user') || '{}').role; } catch { return undefined; }
};

// ─── Small pieces ────────────────────────────────────────────────────────────

const CountryChip = ({ country, children }) => (
  <span style={{
    ...chipStyle(country), display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '2px 9px', borderRadius: 12, fontSize: '0.74rem', fontWeight: 600, whiteSpace: 'nowrap',
  }}>
    {country}{children}
  </span>
);

const JuiceBadge = () => (
  <span title="Juice" style={{
    display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 10,
    fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.04em',
    background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.35)', color: '#facc15',
  }}>
    <Droplets size={10} /> JUICE
  </span>
);

const QuarterToggles = ({ value, onChange, disabled }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {QUARTERS.map(({ q, label }) => {
      const on = value.includes(q);
      return (
        <button
          key={q} type="button" disabled={disabled}
          onClick={() => onChange(on ? value.filter(x => x !== q) : [...value, q].sort())}
          style={{
            padding: '5px 9px', borderRadius: 8, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
            background: on ? 'rgba(255,107,0,0.18)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${on ? 'var(--orange-primary)' : 'var(--border-glass)'}`,
            color: on ? 'var(--orange-primary)' : 'var(--text-muted)',
          }}
        >{label}</button>
      );
    })}
  </div>
);

// ─── Source editor (countries + quarters for one variety) ────────────────────

const SourceRow = ({ source, onSave, onDelete }) => {
  const [country, setCountry] = useState(source.country);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setCountry(source.country); }, [source.country]);

  const commitCountry = async () => {
    const c = country.trim();
    if (!c) { setCountry(source.country); return; }
    if (c === source.country) return;
    setBusy(true);
    await onSave(source.id, { country: c });
    setBusy(false);
  };

  const changeQuarters = async (qs) => {
    if (qs.length === 0) return; // a source needs at least one quarter — remove the row instead
    setBusy(true);
    await onSave(source.id, { quarters: qs });
    setBusy(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
      <input
        list="country-suggestions" className="ui-input" value={country}
        onChange={e => setCountry(e.target.value)} onBlur={commitCountry}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{ flex: '1 1 140px', width: 'auto', minWidth: 0, padding: '7px 10px', fontSize: '0.85rem' }}
      />
      <QuarterToggles value={source.quarters} onChange={changeQuarters} disabled={busy} />
      <button type="button" className="btn btn-glass" style={{ padding: '6px 8px', color: '#ef4444' }} onClick={() => onDelete(source.id)} title="Remove country">
        <Trash2 size={13} />
      </button>
    </div>
  );
};

const SourceEditor = ({ product, variety, onClose, onChanged }) => {
  const [country, setCountry] = useState('');
  const [quarters, setQuarters] = useState([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const covered = varietyCoverage(variety);

  const saveSource = async (id, data) => {
    try { await productsApi.updateSource(id, data); await onChanged(); }
    catch (e) { alert(e.message); }
  };
  const deleteSource = async (id) => {
    try { await productsApi.deleteSource(id); await onChanged(); }
    catch (e) { alert(e.message); }
  };

  const addSource = async () => {
    setError('');
    if (!country.trim()) { setError('Country is required'); return; }
    if (quarters.length === 0) { setError('Pick at least one quarter'); return; }
    setAdding(true);
    try {
      await productsApi.createSource(variety.id, { country: country.trim(), quarters });
      setCountry(''); setQuarters([]);
      await onChanged();
    } catch (e) { setError(e.message); }
    setAdding(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              {product.name} · {variety.name} {variety.isJuice && <JuiceBadge />}
            </h2>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>Which countries supply this variety, and in which quarters.</p>
          </div>
          <button className="btn btn-glass" style={{ padding: '6px 8px' }} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Coverage strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, margin: '14px 0' }}>
          {QUARTERS.map(({ q, label, months }) => {
            const ok = covered.has(q);
            return (
              <div key={q} style={{
                padding: '8px 10px', borderRadius: 10, textAlign: 'center',
                background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.07)',
                border: `1px solid ${ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: ok ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {ok ? <Check size={12} /> : <AlertTriangle size={12} />} {label}
                </div>
                <div className="text-muted" style={{ fontSize: '0.68rem' }}>{months}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {variety.sources.length === 0 && (
            <p className="text-muted" style={{ fontSize: '0.82rem', textAlign: 'center', padding: '10px 0' }}>No countries yet — add the first one below.</p>
          )}
          {variety.sources.map(s => (
            <SourceRow key={s.id} source={s} onSave={saveSource} onDelete={deleteSource} />
          ))}
        </div>

        {/* Add new source */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-glass)' }}>
          <p className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>ADD COUNTRY</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              list="country-suggestions" className="ui-input" placeholder="Country, e.g. Morocco" value={country}
              onChange={e => setCountry(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSource(); } }}
              style={{ flex: '1 1 160px', width: 'auto', minWidth: 0, padding: '8px 10px', fontSize: '0.85rem' }}
            />
            <QuarterToggles value={quarters} onChange={setQuarters} />
            <button type="button" className="btn btn-glass" style={{ padding: '6px 10px', fontSize: '0.74rem' }} onClick={() => setQuarters([1, 2, 3, 4])}>All year</button>
            <button type="button" className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '0.82rem', gap: 6 }} disabled={adding} onClick={addSource}>
              <Plus size={14} /> Add
            </button>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 8 }}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

// ─── Catalog tab ─────────────────────────────────────────────────────────────

const VarietyRow = ({ variety, isAdmin, onChanged, onEditSources }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(variety.name);
  const [isJuice, setIsJuice] = useState(variety.isJuice);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await productsApi.updateVariety(variety.id, { name: name.trim(), isJuice });
      setEditing(false);
      await onChanged();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const remove = async () => {
    if (!window.confirm(`Delete variety "${variety.name}" and its ${variety.sources.length} source(s)?`)) return;
    try { await productsApi.deleteVariety(variety.id); await onChanged(); }
    catch (e) { alert(e.message); }
  };

  const countries = [...new Set(variety.sources.map(s => s.country))];

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 10px', background: 'rgba(255,107,0,0.05)', borderRadius: 10, border: '1px solid rgba(255,107,0,0.2)' }}>
        <input className="ui-input" value={name} onChange={e => setName(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          style={{ flex: '1 1 120px', width: 'auto', minWidth: 0, padding: '6px 10px', fontSize: '0.85rem' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={isJuice} onChange={e => setIsJuice(e.target.checked)} /> Juice
        </label>
        <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.76rem' }} disabled={saving} onClick={save}>Save</button>
        <button className="btn btn-glass" style={{ padding: '5px 8px' }} onClick={() => { setEditing(false); setName(variety.name); setIsJuice(variety.isJuice); }}><X size={13} /></button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{variety.name}</span>
          {variety.isJuice && <JuiceBadge />}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          {countries.length === 0
            ? <span className="text-muted" style={{ fontSize: '0.72rem' }}>No sourcing program yet</span>
            : countries.map(c => <CountryChip key={c} country={c} />)}
        </div>
      </div>
      <button className="btn btn-glass" style={{ padding: '5px 10px', fontSize: '0.74rem', gap: 5 }} onClick={() => onEditSources(variety)}>
        <Globe size={12} /> Countries
      </button>
      <button className="btn btn-glass" style={{ padding: '5px 8px' }} onClick={() => setEditing(true)} title="Edit"><Edit3 size={13} /></button>
      {isAdmin && (
        <button className="btn btn-glass" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={remove} title="Delete"><Trash2 size={13} /></button>
      )}
    </div>
  );
};

const ProductCard = ({ product, isAdmin, onChanged, onEditSources }) => {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(product.name);
  const [varName, setVarName] = useState('');
  const [varJuice, setVarJuice] = useState(false);
  const [adding, setAdding] = useState(false);

  const rename = async () => {
    if (!name.trim() || name.trim() === product.name) { setRenaming(false); setName(product.name); return; }
    try { await productsApi.update(product.id, name.trim()); setRenaming(false); await onChanged(); }
    catch (e) { alert(e.message); }
  };

  const remove = async () => {
    const n = product.varieties.length;
    if (!window.confirm(`Delete "${product.name}"${n ? ` and its ${n} variet${n > 1 ? 'ies' : 'y'}` : ''}? This cannot be undone.`)) return;
    try { await productsApi.delete(product.id); await onChanged(); }
    catch (e) { alert(e.message); }
  };

  const addVariety = async (e) => {
    e.preventDefault();
    if (!varName.trim()) return;
    setAdding(true);
    try {
      await productsApi.createVariety(product.id, { name: varName.trim(), isJuice: varJuice });
      setVarName(''); setVarJuice(false);
      await onChanged();
    } catch (err) { alert(err.message); }
    setAdding(false);
  };

  return (
    <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Citrus size={18} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
        {renaming ? (
          <input className="ui-input" value={name} autoFocus onChange={e => setName(e.target.value)} onBlur={rename}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setName(product.name); setRenaming(false); } }}
            style={{ flex: 1, width: 'auto', minWidth: 0, padding: '5px 10px', fontSize: '1rem', fontWeight: 700 }} />
        ) : (
          <h3 style={{ flex: 1, fontSize: '1.05rem', margin: 0 }}>{product.name}
            <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 500, marginLeft: 8 }}>{product.varieties.length} variet{product.varieties.length === 1 ? 'y' : 'ies'}</span>
          </h3>
        )}
        {!renaming && <button className="btn btn-glass" style={{ padding: '5px 8px' }} onClick={() => setRenaming(true)} title="Rename"><Edit3 size={13} /></button>}
        {isAdmin && <button className="btn btn-glass" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={remove} title="Delete product"><Trash2 size={13} /></button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {product.varieties.length === 0 && (
          <p className="text-muted" style={{ fontSize: '0.8rem', padding: '6px 2px' }}>No varieties yet — add one below (e.g. Valencia).</p>
        )}
        {product.varieties.map(v => (
          <VarietyRow key={v.id} variety={v} isAdmin={isAdmin} onChanged={onChanged} onEditSources={onEditSources} />
        ))}
      </div>

      <form onSubmit={addVariety} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        <input className="ui-input" placeholder="Add variety…" value={varName} onChange={e => setVarName(e.target.value)}
          style={{ flex: '1 1 140px', width: 'auto', minWidth: 0, padding: '8px 10px', fontSize: '0.85rem' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', cursor: 'pointer', color: varJuice ? '#facc15' : 'var(--text-muted)' }}>
          <input type="checkbox" checked={varJuice} onChange={e => setVarJuice(e.target.checked)} />
          <Droplets size={12} /> Juice
        </label>
        <button type="submit" className="btn btn-primary" style={{ padding: '7px 12px', fontSize: '0.8rem', gap: 5 }} disabled={adding || !varName.trim()}>
          <Plus size={13} /> Add
        </button>
      </form>
    </div>
  );
};

const CatalogTab = ({ products, isAdmin, onChanged, onEditSources }) => {
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const existing = new Set(products.map(p => p.name.toLowerCase()));

  const addProduct = async (n) => {
    const value = (n ?? name).trim();
    if (!value) return;
    setAdding(true);
    try { await productsApi.create(value); setName(''); await onChanged(); }
    catch (e) { alert(e.message); }
    setAdding(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="glass-panel" style={{ padding: 16 }}>
        <form onSubmit={e => { e.preventDefault(); addProduct(); }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="ui-input" list="product-suggestions" placeholder="New product, e.g. Orange, Mandarin, Lemon, Grape…" value={name}
            onChange={e => setName(e.target.value)} style={{ flex: '1 1 240px', width: 'auto', minWidth: 0 }} />
          <button type="submit" className="btn btn-primary" style={{ gap: 6 }} disabled={adding || !name.trim()}><Plus size={15} /> Add Product</button>
        </form>
        {PRODUCT_SUGGESTIONS.some(s => !existing.has(s.toLowerCase())) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>Quick add:</span>
            {PRODUCT_SUGGESTIONS.filter(s => !existing.has(s.toLowerCase())).map(s => (
              <button key={s} type="button" onClick={() => addProduct(s)} disabled={adding}
                style={{ padding: '3px 10px', borderRadius: 12, fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border-glass)', color: 'var(--text-secondary)' }}>
                + {s}
              </button>
            ))}
          </div>
        )}
        <datalist id="product-suggestions">{PRODUCT_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
      </div>

      {products.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Citrus size={40} style={{ opacity: 0.25, marginBottom: 10 }} />
          <p>No products yet. Add your first product above, then its varieties.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {products.map(p => (
            <ProductCard key={p.id} product={p} isAdmin={isAdmin} onChanged={onChanged} onEditSources={(v) => onEditSources(p, v)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Sourcing program tab (the smart chart) ──────────────────────────────────

const Pill = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} style={{
    padding: '6px 14px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
    background: active ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? 'var(--orange-primary)' : 'var(--border-glass)'}`,
    color: active ? 'var(--orange-primary)' : 'var(--text-muted)',
  }}>{children}</button>
);

const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', whiteSpace: 'nowrap' };

const ProgramTab = ({ products, onEditSources }) => {
  const [view, setView] = useState('variety'); // 'variety' | 'country'
  const [usage, setUsage] = useState('all');   // 'all' | 'fresh' | 'juice'
  const [productFilter, setProductFilter] = useState('');
  const nowQ = currentQuarter();

  const visible = products
    .filter(p => !productFilter || p.id === productFilter)
    .map(p => ({ ...p, varieties: p.varieties.filter(v => usage === 'all' || (usage === 'juice' ? v.isJuice : !v.isJuice)) }))
    .filter(p => p.varieties.length > 0);

  const allVarieties = visible.flatMap(p => p.varieties.map(v => ({ product: p, variety: v })));

  // ── Insights ──
  const gaps = allVarieties
    .map(({ product, variety }) => {
      const covered = varietyCoverage(variety);
      const missing = QUARTERS.map(x => x.q).filter(q => !covered.has(q));
      return { product, variety, missing, none: variety.sources.length === 0 };
    })
    .filter(g => g.missing.length > 0);

  const thisQuarter = allVarieties
    .map(({ product, variety }) => ({ product, variety, sources: sourcesInQuarter(variety, nowQ) }))
    .filter(r => r.sources.length > 0);

  // ── By-country pivot ──
  const countryMap = new Map();
  allVarieties.forEach(({ product, variety }) => {
    variety.sources.forEach(s => {
      const key = s.country.trim().toLowerCase();
      if (!countryMap.has(key)) countryMap.set(key, { country: s.country.trim(), byQ: { 1: [], 2: [], 3: [], 4: [] }, total: 0 });
      const entry = countryMap.get(key);
      s.quarters.forEach(q => { entry.byQ[q].push({ product, variety }); entry.total += 1; });
    });
  });
  const countries = [...countryMap.values()].sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));

  const nowHeader = (q) => q === nowQ;
  const qHeaderStyle = (q) => ({
    ...thStyle, textAlign: 'center',
    color: nowHeader(q) ? 'var(--orange-primary)' : 'var(--text-muted)',
    background: nowHeader(q) ? 'rgba(255,107,0,0.08)' : undefined,
  });
  const qCellBg = (q) => (nowHeader(q) ? 'rgba(255,107,0,0.04)' : undefined);

  const QHeaders = () => QUARTERS.map(({ q, label, months }) => (
    <th key={q} style={qHeaderStyle(q)}>
      {label} <span style={{ fontWeight: 500, opacity: 0.7 }}>· {months}</span>
      {nowHeader(q) && <div style={{ fontSize: '0.62rem', letterSpacing: '0.08em' }}>NOW</div>}
    </th>
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Pill active={view === 'variety'} onClick={() => setView('variety')}><Layers size={14} /> By variety</Pill>
          <Pill active={view === 'country'} onClick={() => setView('country')}><Globe size={14} /> By country</Pill>
        </div>
        <div style={{ width: 1, height: 22, background: 'var(--border-glass)' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <Pill active={usage === 'all'} onClick={() => setUsage('all')}>All</Pill>
          <Pill active={usage === 'fresh'} onClick={() => setUsage('fresh')}>Fresh</Pill>
          <Pill active={usage === 'juice'} onClick={() => setUsage('juice')}><Droplets size={13} /> Juice</Pill>
        </div>
        <select className="ui-input" value={productFilter} onChange={e => setProductFilter(e.target.value)}
          style={{ width: 170, padding: '7px 12px', fontSize: '0.82rem', marginLeft: 'auto' }}>
          <option value="">All products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {allVarieties.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <CalendarRange size={40} style={{ opacity: 0.25, marginBottom: 10 }} />
          <p>{products.length === 0 ? 'Add products and varieties in the Catalog tab first.' : 'No varieties match this filter.'}</p>
        </div>
      ) : (
        <>
          {/* Insights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <div className="glass-panel" style={{ padding: 16 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} style={{ color: 'var(--orange-primary)' }} />
                Buy now — {QUARTERS[nowQ - 1].label} <span className="text-muted" style={{ fontWeight: 500 }}>({QUARTERS[nowQ - 1].months})</span>
              </h4>
              {thisQuarter.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.82rem' }}>Nothing is programmed for this quarter.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {thisQuarter.map(({ product, variety, sources }) => (
                    <div key={variety.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, minWidth: 150 }}>
                        {product.name} · {variety.name} {variety.isJuice && <JuiceBadge />}
                      </span>
                      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {sources.map(s => <CountryChip key={s.id} country={s.country} />)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: 16, border: gaps.length ? '1px solid rgba(245,158,11,0.25)' : undefined }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} style={{ color: gaps.length ? '#f59e0b' : '#22c55e' }} />
                Coverage gaps {gaps.length > 0 && <span style={{ color: '#f59e0b' }}>({gaps.length})</span>}
              </h4>
              {gaps.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: '#22c55e' }}>Every variety is covered in all four quarters.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 190, overflowY: 'auto' }}>
                  {gaps.map(g => (
                    <button key={g.variety.id} type="button" onClick={() => onEditSources(g.product, g.variety)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', color: 'var(--text-primary)' }}>
                      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600 }}>{g.product.name} · {g.variety.name}</span>
                      <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 700 }}>
                        {g.none ? 'no sources yet' : `no source in ${g.missing.map(q => `Q${q}`).join(', ')}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* The chart */}
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-glass-light)' }}>
            {view === 'variety' ? (
              <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th style={thStyle}>VARIETY</th>
                    <QHeaders />
                    <th style={{ ...thStyle, width: 48 }} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map(p => (
                    <React.Fragment key={p.id}>
                      <tr>
                        <td colSpan={6} style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--orange-primary)', background: 'rgba(255,107,0,0.06)', textTransform: 'uppercase' }}>
                          <Citrus size={12} style={{ verticalAlign: -2, marginRight: 6 }} />{p.name}
                        </td>
                      </tr>
                      {p.varieties.map(v => {
                        const covered = varietyCoverage(v);
                        return (
                          <tr key={v.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top', minWidth: 190 }}>
                              <div style={{ fontWeight: 600 }}>{v.name} {v.isJuice && <JuiceBadge />}</div>
                              <div style={{ fontSize: '0.7rem', marginTop: 2, color: covered.size === 4 ? '#22c55e' : covered.size === 0 ? '#ef4444' : '#f59e0b' }}>
                                {covered.size}/4 quarters covered
                              </div>
                            </td>
                            {QUARTERS.map(({ q }) => {
                              const src = sourcesInQuarter(v, q);
                              return (
                                <td key={q} style={{ padding: '10px 12px', verticalAlign: 'top', textAlign: 'center', background: src.length ? qCellBg(q) : 'rgba(239,68,68,0.05)' }}>
                                  {src.length === 0
                                    ? <span style={{ fontSize: '0.7rem', color: '#ef4444', opacity: 0.7 }}>— gap</span>
                                    : <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {src.map(s => <CountryChip key={s.id} country={s.country} />)}
                                      </div>}
                                </td>
                              );
                            })}
                            <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
                              <button className="btn btn-glass" style={{ padding: '5px 8px' }} onClick={() => onEditSources(p, v)} title="Edit countries"><Edit3 size={13} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th style={thStyle}>COUNTRY</th>
                    <QHeaders />
                  </tr>
                </thead>
                <tbody>
                  {countries.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>No countries programmed yet — add them from the Catalog tab or the variety view.</td></tr>
                  )}
                  {countries.map(c => (
                    <tr key={c.country} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top', minWidth: 150 }}>
                        <CountryChip country={c.country} />
                        <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: 4 }}>{c.total} variety-quarter{c.total === 1 ? '' : 's'}</div>
                      </td>
                      {QUARTERS.map(({ q }) => (
                        <td key={q} style={{ padding: '10px 12px', verticalAlign: 'top', textAlign: 'center', background: qCellBg(q) }}>
                          {c.byQ[q].length === 0
                            ? <span className="text-muted" style={{ fontSize: '0.72rem', opacity: 0.5 }}>—</span>
                            : <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                                {c.byQ[q].map(({ product, variety }) => (
                                  <button key={variety.id} type="button" onClick={() => onEditSources(product, variety)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.78rem', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    {product.name} · {variety.name} {variety.isJuice && <Droplets size={11} style={{ color: '#facc15' }} />}
                                  </button>
                                ))}
                              </div>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

const ProductsPage = ({ selectedCompany }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('catalog'); // 'catalog' | 'program'
  const [editor, setEditor] = useState(null); // { productId, varietyId }
  const isAdmin = ['admin', 'super admin'].includes(currentUserRole());

  const load = async () => {
    try {
      const list = await productsApi.getAll();
      setProducts(Array.isArray(list) ? list : []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedCompany?.id]);

  // Always resolve the editor's variety from fresh data so edits show up live.
  const editorProduct = editor ? products.find(p => p.id === editor.productId) : null;
  const editorVariety = editorProduct?.varieties.find(v => v.id === editor.varietyId);

  const openEditor = (product, variety) => setEditor({ productId: product.id, varietyId: variety.id });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Citrus className="text-orange" size={28} /> Products
        </h1>
        <p className="text-muted" style={{ marginTop: 4 }}>Product catalog &amp; quarterly sourcing program</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className={`btn ${tab === 'catalog' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setTab('catalog')} style={{ gap: 8 }}>
          <Layers size={15} /> Catalog
        </button>
        <button className={`btn ${tab === 'program' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setTab('program')} style={{ gap: 8 }}>
          <CalendarRange size={15} /> Sourcing Program
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
      ) : tab === 'catalog' ? (
        <CatalogTab products={products} isAdmin={isAdmin} onChanged={load} onEditSources={openEditor} />
      ) : (
        <ProgramTab products={products} onEditSources={openEditor} />
      )}

      <datalist id="country-suggestions">{COUNTRY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>

      {editorProduct && editorVariety && (
        <SourceEditor product={editorProduct} variety={editorVariety} onClose={() => setEditor(null)} onChanged={load} />
      )}
    </div>
  );
};

export default ProductsPage;
