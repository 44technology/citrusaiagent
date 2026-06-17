import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { shipmentsApi } from '../services/api';

// Excel column → internal key mapping
const COL_MAP = {
  // ── New SS format ──────────────────────────────────
  'REF_ID':            'referenceId',
  'PRODUCT':           'product',
  'VARIETY':           'variety',
  'LABEL':             'label',
  'TRANSPORT':         'transport',
  'COO':               'countryOfOrigin',
  'SHIPPER_NAME':      'grower',
  'BOX_QTY':           'numberOfBoxes',
  'PALLET_QTY':        'pallets',
  'CNTR_No':           'containerNumber',
  'CARRIER_NAME':      'shippingLine',
  'VESSEL_NAME':       'vesselName',
  'AWB_OBL_No':        'bolNumber',
  'OCEAN_FREIGHT':     'oceanFreight',
  'INV_IN#':           'invInNumber',
  'INV_IN_AMOUNT':     'invInAmount',
  'ADV_TO_GROWER':     'advToGrower',
  'PO_No':             'poNumber',
  'INV_OUT#':          'invOutNumber',
  'INV_OUT_AMOUNT':    'invOutAmount',
  'ADV_FROM_CLIENT':   'advancePaymentStatus',
  'CUSTOMER':          'customerName',
  'ETD':               'etd',
  'ETA':               'eta',
  'ETA_DEST':          'eta',
  'ATA_DEST':          'arrivalDate',
  'ORIGIN_PORT':       'portOfLoading',
  'DEST_PORT':         'portOfDischarge',
  'Q_C_ARRIVAL':       'qcArrival',
  // ── Legacy format (backward compat) ───────────────
  'REF_ID_OLD':        'referenceId',
  'BOL_N':             'bolNumber',
  'CONTAINER_N':       'containerNumber',
  'STATUS':            'statusRaw',
  'TYPE':              'containerType',
  'GROWER':            'grower',
  'CLIENT':            'customerName',
  'SHIPPING_CO':       'shippingLine',
  'POL':               'portOfLoading',
  'POD':               'portOfDischarge',
  'ARRIVAL_DATE':      'arrivalDate',
  'BOXES':             'numberOfBoxes',
  'PALLETS':           'pallets',
  'PACK':              'packType',
  'SIZES_SPECS':       'notes',
  'ADVANCE_PAYMENT_STATUS': 'advancePaymentStatus',
};

// Normalize Excel header → COL_MAP key: uppercase, spaces/dots/slashes → underscore
const normalizeHeader = (h) =>
  String(h || '').trim().toUpperCase()
    .replace(/[\s./()'-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

// Detect if first row looks like real headers (≥3 known keys match)
const isHeaderRow = (row) => {
  const matches = row.filter(h => COL_MAP[normalizeHeader(h)]);
  return matches.length >= 3;
};

// Map raw Excel status → system status
const STATUS_MAP = {
  'SHIPPED ON BOARD':   'In Transit',
  'GATE IN EMPTY':      'Loading',
  'GATE IN':            'Loading',
  'LOADED ON BOARD':    'Departed',
  'VESSEL DEPARTED':    'Departed',
  'ARRIVED':            'Arrived',
  'DELIVERED':          'Delivered',
  'PENDING':            'Pending',
};

const PREVIEW_COLS = [
  { key: 'bolNumber',       label: 'BOL N' },
  { key: 'containerNumber', label: 'Container N' },
  { key: 'statusRaw',       label: 'Status' },
  { key: 'grower',          label: 'Grower' },
  { key: 'customerName',    label: 'Client' },
  { key: 'vesselName',      label: 'Vessel' },
  { key: 'shippingLine',    label: 'Shipping Co.' },
  { key: 'etd',             label: 'ETD' },
  { key: 'portOfLoading',   label: 'POL' },
  { key: 'eta',             label: 'ETA' },
  { key: 'portOfDischarge', label: 'POD' },
  { key: 'variety',         label: 'Variety' },
  { key: 'numberOfBoxes',   label: 'Boxes' },
  { key: 'pallets',         label: 'Pallets' },
  { key: 'packType',        label: 'Pack' },
];

const parseExcelDate = (val) => {
  if (!val) return '';
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${date.y}-${m}-${d}`;
    }
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
};

export default function ImportShipmentsModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

        if (raw.length < 1) { setError('Excel file appears to be empty.'); return; }

        // Auto-detect: does row 0 look like headers or data?
        const firstRow = raw[0].map(h => (h || '').toString().trim());
        const hasHeaders = isHeaderRow(firstRow);
        const headers  = hasHeaders ? firstRow : POSITIONAL_HEADERS;
        const dataRows = (hasHeaders ? raw.slice(1) : raw)
          .filter(r => r.some(c => c !== undefined && c !== ''));

        const mapped = dataRows.map(row => {
          const obj = {};
          headers.forEach((h, i) => {
            const key = COL_MAP[normalizeHeader(h)];
            if (!key) return;
            const val = row[i];
            if (key === 'etd' || key === 'eta' || key === 'arrivalDate') {
              obj[key] = parseExcelDate(val);
            } else {
              obj[key] = val !== undefined && val !== null ? String(val).trim() : '';
            }
          });
          return obj;
        });

        setRows(mapped);
        setStep('preview');
      } catch (err) {
        setError('Could not read Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await shipmentsApi.import(rows);
      setResult(res);
      setStep('result');
      if (res.created > 0) onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'BOL N', 'Container N', 'Status', 'Type', 'Grower', 'Client',
      'Vessel Name', 'Shipping Co.', 'ETD', 'W (Dep)', 'POL',
      'ETA', 'W (Arr)', 'POD', 'Arrival Date',
      'Variety', 'Boxes', 'Pallets', 'Pack', 'Sizes/Specs', 'Temp Rec. Ref'
    ];
    const example = [
      'MEDUAG404091', 'MEDU9621249', 'SHIPPED ON BOARD', 'CONT', 'COPAG', 'SWEET FRESH',
      '20-TROUPER', 'MSC', '2026-05-11', '20', 'AGADIR',
      '2026-06-02', '23', 'PHILADELPHIA', '2026-06-02',
      'NADORCOTT', '504', '7', '18 KG', 'SIZE 7 / COUNT 113 : 504 CASES', ''
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    // Column widths
    ws['!cols'] = [
      { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 14 }, { wch: 14 },
      { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 12 },
      { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 30 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
    XLSX.writeFile(wb, 'Sweet Fresh Shipments.xlsx');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 900, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileSpreadsheet size={22} className="text-orange" />
            <h2 className="modal-title">Import Shipments from Excel</h2>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div style={{ padding: 24 }}>
            {/* Column reference */}
            <div style={{
              marginBottom: 20, padding: '14px 16px',
              background: 'rgba(255,107,0,0.06)', borderRadius: 10,
              border: '1px solid rgba(255,107,0,0.2)',
              fontSize: 13, color: 'var(--text-muted)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--orange-primary)', marginBottom: 8 }}>
                📋 Expected Excel Columns:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                {Object.keys(COL_MAP).map(col => (
                  <span key={col} style={{
                    background: 'rgba(255,255,255,0.06)', padding: '2px 8px',
                    borderRadius: 4, fontFamily: 'monospace', fontSize: 12
                  }}>
                    {col}
                  </span>
                ))}
              </div>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current.click()}
              style={{
                border: '2px dashed var(--orange-primary)',
                borderRadius: 12, padding: '48px 24px',
                textAlign: 'center', cursor: 'pointer',
                background: 'rgba(255,107,0,0.04)', transition: 'background 0.2s',
              }}
            >
              <Upload size={40} style={{ color: 'var(--orange-primary)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                Drag & drop your Excel file here or click to browse
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>.xlsx or .xls files supported</p>
              <input
                ref={fileRef} type="file" accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            {error && (
              <div style={{ marginTop: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-glass" onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Download size={16} /> Download Template
              </button>
              <button className="btn btn-glass" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--orange-primary)', fontWeight: 700 }}>{rows.length}</span> rows found — <strong>{fileName}</strong>
              </p>
              <button className="btn btn-glass" onClick={() => setStep('upload')} style={{ fontSize: 13 }}>
                Change File
              </button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border-color)', maxHeight: 380 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>#</th>
                    {PREVIEW_COLS.map(col => (
                      <th key={col.key} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '7px 10px', color: 'var(--text-muted)' }}>{i + 1}</td>
                      {PREVIEW_COLS.map(col => (
                        <td key={col.key} style={{ padding: '7px 10px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {col.key === 'statusRaw' && row[col.key] ? (
                            <span style={{
                              fontSize: 11, padding: '2px 7px', borderRadius: 20,
                              background: 'rgba(6,182,212,0.12)', color: '#06b6d4',
                              border: '1px solid rgba(6,182,212,0.2)'
                            }}>
                              {row[col.key]}
                            </span>
                          ) : (
                            row[col.key] || <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && (
              <div style={{ marginTop: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-glass" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : `Import ${rows.length} Shipments`}
              </button>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <CheckCircle2 size={56} style={{ color: '#22c55e', marginBottom: 16 }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: 22, marginBottom: 8 }}>Import Complete!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 18 }}>{result.created}</span> shipments imported successfully.
              {result.failed?.length > 0 && (
                <span style={{ color: '#f59e0b', fontWeight: 600 }}> {result.failed.length} rows skipped.</span>
              )}
            </p>

            {result.failed?.length > 0 && (
              <div style={{ textAlign: 'left', background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <p style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 8 }}>Skipped Rows:</p>
                {result.failed.map((f, i) => (
                  <p key={i} style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
                    • <strong>{f.row}</strong>: {f.reason}
                  </p>
                ))}
              </div>
            )}

            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
