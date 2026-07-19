import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import ExcelJS from 'exceljs';

// ── Helpers ───────────────────────────────────────────────────
const getWeek = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const w = Math.ceil((Math.floor((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
  return `W${w}`;
};

const STATUS_COLORS = {
  'Pending':              { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  'Loading':              { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  'Departed':             { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
  'Transshipment':        { bg: 'rgba(139,92,246,0.15)',  color: '#8b5cf6' },
  'In Transit':           { bg: 'rgba(6,182,212,0.15)',   color: '#06b6d4' },
  'Arrived':              { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  'Customs':              { bg: 'rgba(249,115,22,0.15)',  color: '#f97316' },
  'Ready for Pickup':     { bg: 'rgba(163,230,53,0.15)',  color: '#a3e635' },
  'Delivered':            { bg: 'rgba(34,197,94,0.2)',    color: '#22c55e' },
  'Empty Return Pending': { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  'Empty Returned':       { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  'On Hold':              { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
};

const getLfdWarning = (s) => {
  if (s.containerReleased) return null;
  const today = new Date();
  const check = (dateStr, label) => {
    if (!dateStr) return null;
    const days = Math.ceil((new Date(dateStr) - today) / 86400000);
    if (days < 0)  return { label: `${label} ${Math.abs(days)}d OVERDUE`, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
    if (days <= 3) return { label: `${label} ${days}d left`, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
    return null;
  };
  return check(s.demurrageLastFreeDay, 'DEM') || check(s.detentionLastFreeDay, 'DET');
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

// ── Multi-select filter dropdown ──────────────────────────────
const MultiSelect = ({ label, value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const getValue = o => typeof o === 'object' ? o.value : o;
  const getLabel = o => typeof o === 'object' ? o.label : o;
  const toggle = v => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const toggleAll = () => onChange(value.length === options.length ? [] : options.map(getValue));
  const displayText = value.length === 0 ? placeholder
    : value.length === 1 ? getLabel(options.find(o => getValue(o) === value[0]) || value[0])
    : `${value.length} selected`;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5, letterSpacing: '0.05em' }}>{label}</label>
      <button type="button" onClick={() => setOpen(p => !p)}
        style={{ width: '100%', fontSize: '0.82rem', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--bg-secondary)', border: `1px solid ${value.length ? 'rgba(255,107,0,0.4)' : 'var(--border-glass)'}`, borderRadius: 8, padding: '8px 12px', color: value.length ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayText}</span>
        <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', marginLeft: 4 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: 'var(--bg-secondary)', border: '1px solid var(--border-glass-light)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', maxHeight: 220, overflowY: 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', color: 'var(--orange-primary)' }}>
            <input type="checkbox" checked={options.length > 0 && value.length === options.length} onChange={toggleAll} style={{ accentColor: 'var(--orange-primary)', cursor: 'pointer' }} />
            All
          </label>
          {options.map(o => {
            const v = getValue(o); const l = getLabel(o); const checked = value.includes(v);
            return (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: '0.8rem', background: checked ? 'rgba(255,107,0,0.07)' : 'transparent', color: checked ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(v)} style={{ accentColor: 'var(--orange-primary)', cursor: 'pointer', flexShrink: 0 }} />
                {l}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FilterInput = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5, letterSpacing: '0.05em' }}>{label}</label>
    <input type={type} className="ui-input" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', fontSize: '0.82rem' }} />
  </div>
);

// ── Main Page ─────────────────────────────────────────────────
const ShipmentsListPage = ({ selectedCompany }) => {
  const [shipments, setShipments]       = useState([]);
  const [customers, setCustomers]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState('');
  const [expandedId, setExpandedId]     = useState(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [cloneData, setCloneData]       = useState(null);
  const [showImport, setShowImport]     = useState(false);
  const [showFilters, setShowFilters]   = useState(false);
  const [search, setSearch]             = useState('');
  const [sort, setSort]                 = useState({ field: 'vesselEta', dir: 'asc' });

  const [filters, setFilters] = useState({
    status: [], advPayment: [], customer: [], grower: [], bol: '', container: '',
    vessel: '', pol: [], pod: [], variety: [], product: [], pack: [],
    etdFrom: '', etdTo: '', etaFrom: '', etaTo: '',
  });

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('citrus_user') || '{}'); } catch { return {}; } })();
  const isAdmin = ['admin', 'super admin', 'operation', 'sales'].includes(currentUser.role);

  const [showExportModal, setShowExportModal] = useState(false);

  const EXPORT_COLS = [
    { key: 'poNumber',       label: 'PO NUMBER',       width: 14, get: s => s.poNumber || '' },
    { key: 'refId',          label: 'REF ID',          width: 12, get: s => s.order?.referenceId || s.shipmentRefId || '' },
    { key: 'soNumber',       label: 'SO NUMBER',       width: 14, get: s => s.soNumber || '' },
    { key: 'grower',         label: 'GROWER',          width: 18, get: s => s.grower || s.order?.grower || '' },
    { key: 'product',        label: 'PRODUCT',         width: 12, get: s => s.product || s.order?.product || '' },
    { key: 'variety',        label: 'VARIETY',         width: 14, get: s => s.variety || s.order?.variety || '' },
    { key: 'label',          label: 'LABEL',           width: 20, get: s => s.label || '' },
    { key: 'category',       label: 'CAT',             width: 9,  get: s => s.category || '' },
    { key: 'numberOfBoxes',  label: 'BOXES',           width: 9,  get: s => s.numberOfBoxes || '' },
    { key: 'pallets',        label: 'PALLETS',         width: 9,  get: s => s.pallets || '' },
    { key: 'packType',       label: 'PACK',            width: 10, get: s => s.packType || '' },
    { key: 'containerNumber',label: 'CONTAINER NO.',   width: 16, get: s => s.containerNumber || '' },
    { key: 'bolNumber',      label: 'BOL N',           width: 18, get: s => s.bolNumber || '' },
    { key: 'customer',       label: 'CLIENT',          width: 18, get: s => s.contact?.name || '' },
    { key: 'shippingLine',   label: 'SHIPPING CO.',    width: 14, get: s => s.shippingLine || '' },
    { key: 'vesselName',     label: 'VESSEL NAME',     width: 20, get: s => s.vesselName || '' },
    { key: 'wDep',           label: 'W(DEP)',          width: 8,  get: s => getWeek(s.vesselDeparture) },
    { key: 'etd',            label: 'ETD (DD/MM/YY)',  width: 14, get: s => s.vesselDeparture ? formatDateUTC(s.vesselDeparture) : '' },
    { key: 'eta',            label: 'ETA (DD/MM/YY)',  width: 14, get: s => s.vesselEta ? formatDateUTC(s.vesselEta) : '' },
    { key: 'arrivalDate',    label: 'ARRIVAL (DD/MM/YY)', width: 16, get: s => s.vesselArrival ? formatDateUTC(s.vesselArrival) : '' },
    { key: 'wArr',           label: 'W(ARR)',          width: 8,  get: s => getWeek(s.vesselEta) },
    { key: 'gateInEmptyDate',label: 'ATA(GATE IN EMPTY)', width: 16, get: s => s.gateInEmptyDate ? formatDateUTC(s.gateInEmptyDate) : '' },
    { key: 'pol',            label: 'POL',             width: 14, get: s => s.portOfLoading || '' },
    { key: 'pod',            label: 'POD',             width: 14, get: s => s.portOfDischarge || '' },
    { key: 'qcArrival',      label: 'QC SCORE',        width: 10, get: s => s.qcArrival || '' },
    { key: 'advPayment',     label: 'ADV. PAYMENT',    width: 14, get: s => s.advancePaymentStatus || '' },
    { key: 'demLFD',         label: 'DEM. LFD (DD/MM/YY)', width: 16, get: s => s.demurrageLastFreeDay ? formatDateUTC(s.demurrageLastFreeDay) : '' },
    { key: 'detLFD',         label: 'DET. LFD (DD/MM/YY)', width: 16, get: s => s.detentionLastFreeDay ? formatDateUTC(s.detentionLastFreeDay) : '' },
    { key: 'status',         label: 'STATUS',          width: 16, get: s => s.status || '' },
  ];

  const DEFAULT_COLS = EXPORT_COLS.map(c => c.key);
  const [selectedExportCols, setSelectedExportCols] = useState(new Set(DEFAULT_COLS));

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

  useEffect(() => { loadData(); }, [selectedCompany?.id]);

  // Unique values for filter dropdowns
  const uniq = (arr, key) => [...new Set(arr.map(s => s[key]).filter(Boolean))].sort();
  const statuses   = uniq(shipments, 'status');
  const pols       = uniq(shipments, 'portOfLoading');
  const pods       = uniq(shipments, 'portOfDischarge');

  // Grower names from linked orders
  const growers   = [...new Set(shipments.map(s => s.grower || s.order?.grower || null).filter(Boolean))].sort();
  const varieties = [...new Set(shipments.map(s => s.variety || s.order?.variety || null).filter(Boolean))].sort();
  const products  = [...new Set(shipments.map(s => s.product || s.order?.product || null).filter(Boolean))].sort();
  const packs     = [...new Set(shipments.map(s => s.packType || null).filter(Boolean))].sort();

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const resetFilters = () => setFilters({ status: [], advPayment: [], customer: [], grower: [], bol: '', container: '', vessel: '', pol: [], pod: [], variety: [], product: [], pack: [], etdFrom: '', etdTo: '', etaFrom: '', etaTo: '' });
  const hasFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v));

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
      if (filters.status.length     && !filters.status.includes(s.status)) return false;
      if (filters.advPayment.length && !filters.advPayment.includes(s.advancePaymentStatus || '')) return false;
      if (filters.customer.length   && !filters.customer.includes(s.contactId)) return false;
      if (filters.bol       && !(s.bolNumber || '').toLowerCase().includes(filters.bol.toLowerCase())) return false;
      if (filters.container && !(s.containerNumber || '').toLowerCase().includes(filters.container.toLowerCase())) return false;
      if (filters.vessel    && !(s.vesselName || '').toLowerCase().includes(filters.vessel.toLowerCase())) return false;
      if (filters.pol.length    && !filters.pol.includes(s.portOfLoading)) return false;
      if (filters.pod.length    && !filters.pod.includes(s.portOfDischarge)) return false;
      if (filters.variety.length && !filters.variety.includes(s.variety || s.order?.variety)) return false;
      if (filters.product.length && !filters.product.includes(s.product || s.order?.product || '')) return false;
      if (filters.pack.length    && !filters.pack.includes(s.packType || '')) return false;
      if (filters.grower.length  && !filters.grower.includes(s.grower || s.order?.grower || '')) return false;
      if (filters.etdFrom   && s.vesselDeparture && s.vesselDeparture < filters.etdFrom) return false;
      if (filters.etdTo     && s.vesselDeparture && s.vesselDeparture > filters.etdTo) return false;
      if (filters.etaFrom   && s.vesselEta && s.vesselEta < filters.etaFrom) return false;
      if (filters.etaTo     && s.vesselEta && s.vesselEta > filters.etaTo) return false;
      return true;
    });

    // Sort — computed fields need getters
    const SORT_GET = {
      refId: s => s.order?.referenceId || s.shipmentRefId || '',
      'contact.name': s => s.contact?.name || '',
    };
    const getV = (s) => (SORT_GET[sort.field] ? SORT_GET[sort.field](s) : s[sort.field]);
    list = [...list].sort((a, b) => {
      let av = getV(a) ?? '', bv = getV(b) ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return list;
  }, [shipments, search, filters, sort]);

  // Export to Excel — dynamic columns
  const handleExport = async () => {
    const cols = EXPORT_COLS.filter(c => selectedExportCols.has(c.key));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Shipments');

    const DARK = '1A1A2E', ORANGE = 'FF6B00', HEADER = '16213E';
    const WHITE = 'FFFFFF', MUTED = 'A0A0B0', GREEN = '22C55E';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
    const totalBoxes   = filtered.reduce((s, sh) => s + (sh.numberOfBoxes || 0), 0);
    const totalPallets = filtered.reduce((s, sh) => s + (sh.pallets || 0), 0);
    const onBoard    = filtered.filter(s => ['In Transit','Departed','Transshipment'].includes(s.status)).length;
    const discharged = filtered.filter(s => ['Arrived','Delivered'].includes(s.status)).length;
    const gateIn     = filtered.filter(s => s.status === 'Loading').length;
    const lastDataCol = String.fromCharCode(65 + cols.length); // A + n cols (col A = spacer)

    const style = (cell, { bg, color = WHITE, bold = false, sz = 10, align = 'left', wrap = false } = {}) => {
      if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
      cell.font = { color: { argb: 'FF' + color }, bold, size: sz, name: 'Calibri' };
      cell.alignment = { horizontal: align, vertical: 'middle', wrapText: wrap };
    };
    const border = (cell) => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FF2A2A4A' } },
        bottom: { style: 'thin', color: { argb: 'FF2A2A4A' } },
        left:   { style: 'thin', color: { argb: 'FF2A2A4A' } },
        right:  { style: 'thin', color: { argb: 'FF2A2A4A' } },
      };
    };

    ws.columns = [{ width: 4 }, ...cols.map(c => ({ width: c.width }))];

    // Row 1
    ws.addRow([]); ws.getRow(1).height = 8;

    // Row 2: Title
    const titleRow = ws.addRow([]); titleRow.height = 32;
    const titleCell = ws.getCell('B2');
    titleCell.value = 'SWEET FRESH PRODUCE  ·  SHIPMENT TRACKER';
    style(titleCell, { bg: DARK, color: ORANGE, bold: true, sz: 16 });
    ws.mergeCells(`B2:${lastDataCol}2`);
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK } };

    // Row 3: Subtitle
    const subRow = ws.addRow([]); subRow.height = 20;
    const subCell = ws.getCell('B3');
    subCell.value = `Generated: ${dateStr}  |  ${filtered.length} Shipments`;
    style(subCell, { bg: DARK, color: MUTED, sz: 9 });
    ws.mergeCells(`B3:${lastDataCol}3`);
    ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + DARK } };

    // Row 4-5: Stats
    ws.addRow([]); ws.getRow(4).height = 20;
    const statDefs = [
      ['TOTAL', filtered.length], ['ON BOARD', onBoard],
      ['DISCHARGED', discharged], ['GATE IN', gateIn],
      ['BOXES', totalBoxes], ['PALLETS', totalPallets],
    ];
    const statCols = cols.length >= 6 ? Math.floor(cols.length / 6) : 1;
    statDefs.forEach(([lbl, val], i) => {
      const startCol = String.fromCharCode(66 + i * statCols);
      const endCol   = String.fromCharCode(65 + (i + 1) * statCols);
      const lCell = ws.getCell(`${startCol}4`);
      lCell.value = lbl;
      style(lCell, { bg: HEADER, color: MUTED, bold: true, sz: 8, align: 'center' });
      try { ws.mergeCells(`${startCol}4:${endCol}4`); } catch {}
      ws.getRow(5).height = 28;
      const vCell = ws.getCell(`${startCol}5`);
      vCell.value = val;
      style(vCell, { bg: HEADER, color: ORANGE, bold: true, sz: 16, align: 'center' });
      try { ws.mergeCells(`${startCol}5:${endCol}5`); } catch {}
    });
    ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HEADER } };
    ws.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HEADER } };

    // Row 6: spacer
    ws.addRow([]); ws.getRow(6).height = 6;

    // Row 7: headers
    const hdrRow = ws.addRow(['', ...cols.map(c => c.label)]);
    hdrRow.height = 36;
    hdrRow.eachCell(cell => {
      style(cell, { bg: ORANGE, color: WHITE, bold: true, sz: 9, align: 'center', wrap: true });
      border(cell);
    });

    // Data rows
    filtered.forEach((s, i) => {
      const bg = i % 2 === 0 ? '12122A' : DARK;
      const row = ws.addRow(['', ...cols.map(c => c.get(s))]);
      row.height = 18;
      row.eachCell((cell, colNum) => {
        const colKey = cols[colNum - 2]?.key;
        const isNum = ['numberOfBoxes','pallets'].includes(colKey);
        style(cell, { bg, color: isNum ? GREEN : WHITE, sz: 9, align: colNum === 1 ? 'left' : 'left' });
        border(cell);
      });
    });

    // Totals
    const totRow = ws.addRow(['', ...cols.map(c =>
      c.key === 'numberOfBoxes' ? totalBoxes : c.key === 'pallets' ? totalPallets : ''
    )]);
    totRow.height = 22;
    totRow.eachCell((cell, colNum) => {
      const colKey = cols[colNum - 2]?.key;
      const isNum = ['numberOfBoxes','pallets'].includes(colKey);
      style(cell, { bg: HEADER, color: isNum ? GREEN : ORANGE, bold: true, sz: 10, align: 'left' });
      border(cell);
    });
    if (cols.length > 1) {
      try { ws.mergeCells(`B${totRow.number}:${String.fromCharCode(64 + cols.length)}${totRow.number}`); } catch {}
    }

    // Footer
    ws.addRow([]);
    const footRow = ws.addRow(['', 'Sweet Fresh Produce  ·  Confidential  ·  All rights reserved']);
    footRow.height = 18;
    style(ws.getCell(`B${footRow.number}`), { bg: DARK, color: MUTED, sz: 8 });
    try { ws.mergeCells(`B${footRow.number}:${lastDataCol}${footRow.number}`); } catch {}

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Shipments_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleUpdate = (updated) => {
    setShipments(p => p.map(s => s.id === updated.id ? updated : s));
  };
  const handleDelete = (id) => {
    setShipments(p => p.filter(s => s.id !== id));
    setExpandedId(null);
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
          <button className="btn btn-glass" onClick={() => setShowExportModal(true)} style={{ gap: 8 }}>
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
          <Filter size={15} /> Filters {hasFilters && <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '50%', width: 18, height: 18, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{Object.values(filters).filter(v => Array.isArray(v) ? v.length > 0 : Boolean(v)).length}</span>}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-panel" style={{ padding: '18px 20px', border: '1px solid rgba(255,107,0,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 16px' }}>
            <MultiSelect label="STATUS"      value={filters.status}     onChange={v => setF('status', v)}     options={statuses}  placeholder="All Status" />
            <MultiSelect label="ADV. PAYMENT" value={filters.advPayment} onChange={v => setF('advPayment', v)}
              options={['Pending','Requested','Paid','Not Required']} placeholder="All Payments" />
            <MultiSelect label="CUSTOMER"  value={filters.customer}  onChange={v => setF('customer', v)}
              options={customers.map(c => ({ value: c.id, label: c.name || c.company }))}
              placeholder="All Customers" />
            <MultiSelect label="GROWER"   value={filters.grower}   onChange={v => setF('grower', v)}   options={growers}   placeholder="All Grower" />
            <FilterInput  label="BOL #"   value={filters.bol}     onChange={v => setF('bol', v)}     placeholder="Filter by BOL" />
            <FilterInput  label="CONTAINER" value={filters.container} onChange={v => setF('container', v)} placeholder="Filter by container" />
            <FilterInput  label="VESSEL"  value={filters.vessel}  onChange={v => setF('vessel', v)}  placeholder="Filter by vessel" />
            <MultiSelect label="POL"     value={filters.pol}     onChange={v => setF('pol', v)}     options={pols}      placeholder="All POL" />
            <MultiSelect label="POD"     value={filters.pod}     onChange={v => setF('pod', v)}     options={pods}      placeholder="All POD" />
            <MultiSelect label="PRODUCT" value={filters.product} onChange={v => setF('product', v)} options={products}  placeholder="All Product" />
            <MultiSelect label="VARIETY" value={filters.variety} onChange={v => setF('variety', v)} options={varieties} placeholder="All Variety" />
            <MultiSelect label="PACK"    value={filters.pack}    onChange={v => setF('pack', v)}    options={packs}     placeholder="All Pack" />
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
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 12, border: '1px solid var(--border-glass-light)' }}>
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
                <SortTh label="REF ID"       field="refId"            sort={sort} setSort={setSort} />
                <SortTh label="SO"           field="soNumber"         sort={sort} setSort={setSort} />
                <SortTh label="PO"           field="poNumber"         sort={sort} setSort={setSort} />
                <SortTh label="BOL #"        field="bolNumber"        sort={sort} setSort={setSort} />
                <SortTh label="CONTAINER #"  field="containerNumber"  sort={sort} setSort={setSort} />
                <SortTh label="STATUS"       field="status"           sort={sort} setSort={setSort} />
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>GROWER</th>
                <SortTh label="CLIENT"       field="contact.name"     sort={sort} setSort={setSort} />
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PRODUCT</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>VARIETY</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>PACK</th>
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
              {filtered.map((s, i) => {
                const isExpanded = expandedId === s.id;
                const colCount = isAdmin ? 19 : 18;
                return (<React.Fragment key={s.id}>
                <tr
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  style={{
                    borderTop: '1px solid var(--border-glass-light)',
                    background: isExpanded ? 'rgba(255,107,0,0.06)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,107,0,0.04)'; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'; }}
                >
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--orange-primary)', fontWeight: 700 }}>
                    {s.order?.referenceId ? `#${s.order.referenceId}` : s.shipmentRefId ? `#${s.shipmentRefId}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#94a3b8' }}>
                    {s.soNumber || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#94a3b8' }}>
                    {s.poNumber || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{s.bolNumber || '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{s.containerNumber || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <StatusBadge status={s.status} />
                      {(() => { const w = getLfdWarning(s); return w ? (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: w.bg, color: w.color, whiteSpace: 'nowrap' }}>{w.label}</span>
                      ) : null; })()}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {(() => {
                      const mismatch = s.grower && s.order?.grower &&
                        s.grower.trim().toLowerCase() !== s.order.grower.trim().toLowerCase();
                      return (
                        <span style={mismatch ? { color: '#ef4444', fontWeight: 700 } : {}}
                          title={mismatch ? `Grower mismatch! Shipment: "${s.grower}" / Order #${s.order.referenceId}: "${s.order.grower}"` : undefined}>
                          {mismatch && '⚠ '}{s.grower || s.order?.grower || '—'}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{s.contact?.name || '—'}</div>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{s.product || s.order?.product || s.cargoDescription?.split(' - ')[0] || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--orange-primary)', fontWeight: 600 }}>{s.variety || s.order?.variety || '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{s.packType || '—'}</td>
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

                {/* Expanded inline full detail */}
                {isExpanded && (
                  <tr>
                    <td colSpan={colCount} style={{ padding: 0, borderTop: '2px solid rgba(255,107,0,0.3)' }}>
                      <div style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid rgba(255,107,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>
                        <ShipmentDetailModal
                          isOpen={true}
                          onClose={() => setExpandedId(null)}
                          shipment={s}
                          onUpdate={u => setShipments(p => p.map(x => x.id === u.id ? u : x))}
                          onDelete={handleDelete}
                          onClone={s => { setCloneData(s); setExpandedId(null); setShowAdd(true); }}
                          embedded={true}
                        />
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>);
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddShipmentModal
          isOpen={showAdd}
          onClose={() => { setShowAdd(false); setCloneData(null); }}
          onAdd={handleAdd}
          customers={customers}
          initialData={cloneData}
        />
      )}
      {showImport && (
        <ImportShipmentsModal
          onClose={() => { setShowImport(false); loadData(); }}
          onImported={() => { loadData(); }}
        />
      )}

      {/* Export Column Picker Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" style={{ maxWidth: 480, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={18} className="text-orange" /> Export Columns
              </h2>
              <button className="modal-close" onClick={() => setShowExportModal(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: '16px 24px' }}>
              {/* Select All */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 10, borderRadius: 8, background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={selectedExportCols.size === EXPORT_COLS.length}
                  onChange={e => setSelectedExportCols(e.target.checked ? new Set(EXPORT_COLS.map(c => c.key)) : new Set())}
                  style={{ width: 16, height: 16, accentColor: 'var(--orange-primary)', cursor: 'pointer' }}
                />
                Select All ({EXPORT_COLS.length} columns)
              </label>

              {/* Column list */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', maxHeight: 360, overflowY: 'auto' }}>
                {EXPORT_COLS.map(col => (
                  <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, background: selectedExportCols.has(col.key) ? 'rgba(255,107,0,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${selectedExportCols.has(col.key) ? 'rgba(255,107,0,0.25)' : 'var(--border-glass)'}`, cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.15s' }}>
                    <input
                      type="checkbox"
                      checked={selectedExportCols.has(col.key)}
                      onChange={e => {
                        const next = new Set(selectedExportCols);
                        e.target.checked ? next.add(col.key) : next.delete(col.key);
                        setSelectedExportCols(next);
                      }}
                      style={{ width: 14, height: 14, accentColor: 'var(--orange-primary)', cursor: 'pointer', flexShrink: 0 }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedExportCols.size} column{selectedExportCols.size !== 1 ? 's' : ''} selected</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-glass" onClick={() => setShowExportModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleExport} disabled={selectedExportCols.size === 0}>
                    <Download size={15} /> Export {filtered.length} rows
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentsListPage;
