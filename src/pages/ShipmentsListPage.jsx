import React, { useState, useEffect, useMemo } from 'react';
import {
  List, Plus, Search, Filter, Download, FileSpreadsheet,
  ChevronUp, ChevronDown, ChevronsUpDown, X, Trash2
} from 'lucide-react';
import { shipmentsApi, contactsApi } from '../services/api';
import { formatDateUTC } from '../utils/dateUtils';
import AddShipmentModal from '../components/AddShipmentModal';
import ShipmentDetailModal from '../components/ShipmentDetailModal';
import ImportShipmentsModal from '../components/ImportShipmentsModal';
import * as XLSX from 'xlsx';

// ── Helpers ───────────────────────────────────────────────────
const getWeek = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
};

const STATUS_COLORS = {
  'Pending':       { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  'Loading':       { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  'Departed':      { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
  'Transshipment': { bg: 'rgba(139,92,246,0.15)',  color: '#8b5cf6' },
  'In Transit':    { bg: 'rgba(6,182,212,0.15)',   color: '#06b6d4' },
  'Arrived':       { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  'Customs':       { bg: 'rgba(249,115,22,0.15)',  color: '#f97316' },
  'Delivered':     { bg: 'rgba(34,197,94,0.2)',    color: '#22c55e' },
  'On Hold':       { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS['Pending'];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {status || 'Pending'}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  if (!type) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const isReefer = type.includes('RF') || type.includes('Reefer');
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: isReefer ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.08)', color: isReefer ? '#38bdf8' : 'var(--text-muted)', border: `1px solid ${isReefer ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
      {type}
    </span>
  );
};

// ── Sort header ───────────────────────────────────────────────
const SortTh = ({ label, field, sort, setSort, style = {} }) => {
  const active = sort.field === field;
  return (
    <th
      onClick={() => setSort(p => ({ field, dir: p.field === field && p.dir === 'asc' ? 'desc' : 'asc' }))}
      style={{ cursor: 'pointer', userSelect: 'none', padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: active ? 'var(--orange-primary)' : 'var(--text-muted)', letterSpacing: '0.05em', whiteSpace: 'nowrap', ...style }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={11} style={{ opacity: 0.4 }} />}
      </span>
    </th>
  );
};

// ── Main Page ─────────────────────────────────────────────────
const ShipmentsListPage = () => {
  const [shipments, setShipments]       = useState([]);
  const [customers, setCustomers]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [selected, setSelected]         = useState(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [showFilters, setShowFilters]   = useState(false);
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState({ field: 'vesselEta', dir: 'asc' });

  const [filters, setFilters] = useState({
    status: '', grower: '', bol: '', container: '',
    vessel: '', pol: '', pod: '', variety: '',
    etdFrom: '', etdTo: '', etaFrom: '', etaTo: '',
  });

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('citrus_user') || '{}'); } catch { return {}; } })();
  const isAdmin = ['admin', 'super admin', 'operation'].includes(currentUser.role);

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [s, c] = await Promise.all([shipmentsApi.getAll(), contactsApi.getAll()]);
      setShipments(Array.isArray(s) ? s : []);
      setCustomers(c.filter(x => x.type?.toLowerCase() === 'customer'));
    } catch (e) {
      console.error('loadData error:', e);
      setLoadError(e.message || 'Failed to load data');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // Unique values for filter dropdowns
  const uniq = (arr, key) => [...new Set(arr.map(s => s[key]).filter(Boolean))].sort();
  const statuses   = uniq(shipments, 'status');
  const pols       = uniq(shipments, 'portOfLoading');
  const pods       = uniq(shipments, 'portOfDischarge');

  // Grower names from linked orders
  const growers   = [...new Set(shipments.map(s => s.grower || s.order?.grower || null).filter(Boolean))].sort();
  const varieties = [...new Set(shipments.map(s => s.variety || s.order?.variety || null).filter(Boolean))].sort();

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const resetFilters = () => setFilters({ status: '', grower: '', bol: '', container: '', vessel: '', pol: '', pod: '', variety: '', etdFrom: '', etdTo: '', etaFrom: '', etaTo: '' });
  const hasFilters = Object.values(filters).some(Boolean);

  // Filter + search + sort
  const filtered = useMemo(() => {
    let list = shipments.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (s.bolNumber || '').toLowerCase().includes(q) ||
        (s.containerNumber || '').toLowerCase().includes(q) ||
        (s.vesselName || '').toLowerCase().includes(q) ||
        (s.contact?.name || '').toLowerCase().includes(q) ||
        (s.order?.variety || '').toLowerCase().includes(q) ||
        (s.portOfLoading || '').toLowerCase().includes(q) ||
        (s.portOfDischarge || '').toLowerCase().includes(q) ||
        (s.order?.referenceId ? String(s.order.referenceId) : '').includes(q) ||
      (s.shipmentRefId ? String(s.shipmentRefId) : '').includes(q);

      if (!matchSearch) return false;
      if (filters.status    && s.status !== filters.status) return false;
      if (filters.bol       && !(s.bolNumber || '').toLowerCase().includes(filters.bol.toLowerCase())) return false;
      if (filters.container && !(s.containerNumber || '').toLowerCase().includes(filters.container.toLowerCase())) return false;
      if (filters.vessel    && !(s.vesselName || '').toLowerCase().includes(filters.vessel.toLowerCase())) return false;
      if (filters.pol       && s.portOfLoading !== filters.pol) return false;
      if (filters.pod       && s.portOfDischarge !== filters.pod) return false;
      if (filters.variety   && (s.variety || s.order?.variety) !== filters.variety) return false;
      if (filters.grower    && (s.grower || s.order?.grower || '') !== filters.grower) return false;
      if (filters.etdFrom   && s.vesselDeparture && s.vesselDeparture < filters.etdFrom) return false;
      if (filters.etdTo     && s.vesselDeparture && s.vesselDeparture > filters.etdTo) return false;
      if (filters.etaFrom   && s.vesselEta && s.vesselEta < filters.etaFrom) return false;
      if (filters.etaTo     && s.vesselEta && s.vesselEta > filters.etaTo) return false;
      return true;
    });

    // Sort
    list = [...list].sort((a, b) => {
      let av = a[sort.field] ?? '', bv = b[sort.field] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return list;
  }, [shipments, search, filters, sort]);

  // Export to Excel — SS format
  const handleExport = () => {
    const rows = filtered.map(s => {
      const expenses    = s.expenses || [];
      const invInAmt    = expenses.filter(e => !e.isRevenue).reduce((sum, e) => sum + (e.amount || 0), 0);
      const invOutAmt   = expenses.filter(e =>  e.isRevenue).reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        'REF_ID':          s.order?.referenceId || s.shipmentRefId || '',
        'PRODUCT':         s.order?.product || '',
        'VARIETY':         s.variety || s.order?.variety || '',
        'LABEL':           s.label || '',
        'TRANSPORT':       s.transport || 'SEA',
        'COO':             s.countryOfOrigin || '',
        'SHIPPER_NAME':    s.grower || s.order?.grower || '',
        'BOX_QTY':         s.numberOfBoxes || '',
        'PALLET_QTY':      s.pallets || '',
        'CNTR_No':         s.containerNumber || '',
        'CARRIER_NAME':    s.shippingLine || '',
        'VESSEL_NAME':     s.vesselName || '',
        'AWB_OBL_No':      s.bolNumber || '',
        'OCEAN_FREIGHT':   s.oceanFreight || '',
        'INV_IN#':         '',
        'INV_IN_AMOUNT':   invInAmt || '',
        'ADV_TO_GROWER':   s.advToGrower || '',
        'PO_No':           '',
        'INV_OUT#':        '',
        'INV_OUT_AMOUNT':  invOutAmt || '',
        'ADV_FROM_CLIENT': s.advancePaymentStatus || '',
        'CUSTOMER':        s.contact?.name || s.contact?.company || '',
        'ETD':             s.vesselDeparture ? formatDateUTC(s.vesselDeparture) : '',
        'ETA_DEST':        s.vesselEta ? formatDateUTC(s.vesselEta) : '',
        'ATA_DEST':        s.vesselArrival ? formatDateUTC(s.vesselArrival) : '',
        'ORIGIN_PORT':     s.portOfLoading || s.origin || '',
        'DEST_PORT':       s.portOfDischarge || s.destination || '',
        'Q_C_ARRIVAL':     s.qcArrival || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
    XLSX.writeFile(wb, `Shipments_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleUpdate = (updated) => {
    setShipments(p => p.map(s => s.id === updated.id ? updated : s));
    setSelected(updated);
  };
  const handleDelete = (id) => {
    setShipments(p => p.filter(s => s.id !== id));
    setSelected(null);
  };

  const handleDeleteRow = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this shipment?')) return;
    try {
      await shipmentsApi.delete(id);
      setShipments(p => p.filter(s => s.id !== id));
    } catch (err) { alert(err.message); }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete ALL ${filtered.length} shipments? This cannot be undone.`)) return;
    try {
      await Promise.all(filtered.map(s => shipmentsApi.delete(s.id)));
      setShipments(p => p.filter(s => !filtered.find(f => f.id === s.id)));
    } catch (err) { alert(err.message); }
  };
  const handleAdd = async (data) => {
    await shipmentsApi.create(data);
    loadData();
  };

  const FilterSelect = ({ label, value, onChange, options, placeholder }) => (
    <div>
      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5, letterSpacing: '0.05em' }}>{label}</label>
      <select className="ui-select" value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const FilterInput = ({ label, value, onChange, placeholder, type = 'text' }) => (
    <div>
      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5, letterSpacing: '0.05em' }}>{label}</label>
      <input type={type} className="ui-input" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16, padding: '20px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>All Shipments</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{shipments.length}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-glass" onClick={() => setShowImport(true)} style={{ gap: 8 }}>
            <FileSpreadsheet size={16} /> Import
          </button>
          <button className="btn btn-glass" onClick={handleExport} style={{ gap: 8 }}>
            <Download size={16} /> Export
          </button>
          {isAdmin && filtered.length > 0 && (
            <button
              className="btn btn-glass"
              onClick={handleDeleteAll}
              style={{ gap: 8, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <Trash2 size={15} /> Delete All ({filtered.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ gap: 8 }}>
            <Plus size={16} /> Add Shipment
          </button>
        </div>
      </div>

      {/* Search + Filter toggle */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="ui-input" placeholder="Search shipments..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 36 }} />
        </div>
        <button
          className={`btn ${showFilters ? 'btn-primary' : 'btn-glass'}`}
          onClick={() => setShowFilters(p => !p)}
          style={{ gap: 8, whiteSpace: 'nowrap' }}
        >
          <Filter size={15} /> Filters {hasFilters && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: 18, height: 18, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{Object.values(filters).filter(Boolean).length}</span>}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-panel" style={{ padding: '18px 20px', border: '1px solid rgba(255,107,0,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 16px' }}>
            <FilterSelect label="STATUS"  value={filters.status}  onChange={v => setF('status', v)}  options={statuses}  placeholder="All Status" />
            <FilterSelect label="GROWER"  value={filters.grower}  onChange={v => setF('grower', v)}  options={growers}   placeholder="All Grower" />
            <FilterInput  label="BOL #"   value={filters.bol}     onChange={v => setF('bol', v)}     placeholder="Filter by BOL" />
            <FilterInput  label="CONTAINER" value={filters.container} onChange={v => setF('container', v)} placeholder="Filter by container" />
            <FilterInput  label="VESSEL"  value={filters.vessel}  onChange={v => setF('vessel', v)}  placeholder="Filter by vessel" />
            <FilterSelect label="POL"     value={filters.pol}     onChange={v => setF('pol', v)}     options={pols}      placeholder="All POL" />
            <FilterSelect label="POD"     value={filters.pod}     onChange={v => setF('pod', v)}     options={pods}      placeholder="All POD" />
            <FilterSelect label="VARIETY" value={filters.variety} onChange={v => setF('variety', v)} options={varieties} placeholder="All Variety" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, gridColumn: 'span 2' }}>
              <FilterInput label="ETD FROM" type="date" value={filters.etdFrom} onChange={v => setF('etdFrom', v)} placeholder="" />
              <FilterInput label="ETD TO"   type="date" value={filters.etdTo}   onChange={v => setF('etdTo', v)}   placeholder="" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, gridColumn: 'span 2' }}>
              <FilterInput label="ETA FROM" type="date" value={filters.etaFrom} onChange={v => setF('etaFrom', v)} placeholder="" />
              <FilterInput label="ETA TO"   type="date" value={filters.etaTo}   onChange={v => setF('etaTo', v)}   placeholder="" />
            </div>
          </div>
          {hasFilters && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-glass" onClick={resetFilters} style={{ fontSize: '0.78rem', gap: 6 }}>
                <X size={13} /> Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error banner */}
      {loadError && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 8,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10
        }}>
          ⚠️ Error loading data: <strong>{loadError}</strong>
          <button className="btn btn-glass" onClick={loadData} style={{ marginLeft: 'auto', fontSize: '0.78rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', borderRadius: 12, border: '1px solid var(--border-glass-light)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <List size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p>{shipments.length > 0 ? 'No shipments match your filters.' : 'No shipments yet.'}</p>
            {shipments.length > 0 && hasFilters && (
              <button className="btn btn-glass" onClick={resetFilters} style={{ marginTop: 12, fontSize: '0.8rem' }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-secondary)' }}>
              <tr>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>REF ID</th>
                <SortTh label="BOL #"        field="bolNumber"        sort={sort} setSort={setSort} />
                <SortTh label="CONTAINER #"  field="containerNumber"  sort={sort} setSort={setSort} />
                <SortTh label="STATUS"       field="status"           sort={sort} setSort={setSort} />
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>TYPE</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>GROWER</th>
                <SortTh label="CLIENT"       field="contact.name"     sort={sort} setSort={setSort} />
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>VARIETY</th>
                <SortTh label="VESSEL NAME"  field="vesselName"       sort={sort} setSort={setSort} />
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>SHIPPING CO.</th>
                <SortTh label="ETD"          field="vesselDeparture"  sort={sort} setSort={setSort} />
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>W (DEP)</th>
                <SortTh label="POL"          field="portOfLoading"    sort={sort} setSort={setSort} />
                <SortTh label="ETA"          field="vesselEta"        sort={sort} setSort={setSort} />
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>W (ARR)</th>
                <SortTh label="POD"          field="portOfDischarge"  sort={sort} setSort={setSort} />
                {isAdmin && <th style={{ padding: '10px 8px', width: 40 }} />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  style={{
                    borderTop: '1px solid var(--border-glass-light)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,0,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--orange-primary)', fontWeight: 700 }}>
                    {s.order?.referenceId ? `#${s.order.referenceId}` : s.shipmentRefId ? `#${s.shipmentRefId}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{s.bolNumber || '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{s.containerNumber || '—'}</td>
                  <td style={{ padding: '10px 12px' }}><StatusBadge status={s.status} /></td>
                  <td style={{ padding: '10px 12px' }}><TypeBadge type={s.containerType} /></td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{s.grower || s.order?.grower || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{s.contact?.name || '—'}</div>
                    {s.contact?.company && s.contact.company !== 'N/A' && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.contact.company}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--orange-primary)', fontWeight: 600 }}>{s.variety || s.order?.variety || '—'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.vesselName || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{s.shippingLine || '—'}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{s.vesselDeparture ? formatDateUTC(s.vesselDeparture) : '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>{getWeek(s.vesselDeparture)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{s.portOfLoading ? s.portOfLoading.replace('Port of ', '') : '—'}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#22c55e', fontWeight: 600 }}>{s.vesselEta ? formatDateUTC(s.vesselEta) : '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#22c55e' }}>{getWeek(s.vesselEta)}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{s.portOfDischarge ? s.portOfDischarge.replace('Port of ', '') : '—'}</td>
                  {isAdmin && (
                    <td style={{ padding: '10px 8px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => handleDeleteRow(e, s.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', padding: 4, borderRadius: 6, display: 'flex' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.5)'}
                        title="Delete shipment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddShipmentModal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
          customers={customers}
        />
      )}
      {showImport && (
        <ImportShipmentsModal
          onClose={() => { setShowImport(false); loadData(); }}
          onImported={() => { loadData(); }}
        />
      )}
      {selected && (
        <ShipmentDetailModal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          shipment={selected}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default ShipmentsListPage;
