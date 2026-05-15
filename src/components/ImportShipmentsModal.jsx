import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { shipmentsApi } from '../services/api';

// Excel column → API field mapping
const COL_MAP = {
  'Shipment Number': 'label',
  'Status': 'status',
  'Vessel Name': 'vesselName',
  'Container Number': 'containerNumber',
  'ETD': 'etd',
  'ETA': 'eta',
  'Port of Loading': 'portOfLoading',
  'Transshipment Port': 'transshipmentPort',
  'Port of Discharge': 'portOfDischarge',
  'Container Type': 'containerType',
  'Seal Number': 'sealNumber',
  'Cargo Description': 'cargoDescription',
  'Gross Weight (kg)': 'grossWeight',
  'Number of Boxes': 'numberOfBoxes',
  'Temperature Set (°C)': 'reeferTempSet',
  'Humidity (%)': 'humidity',
  'Ventilation (CBM/H)': 'ventilation',
  'CO2 (%)': 'co2Level',
  'Customer Name': 'customerName',
  'Order Number': 'orderNumber',
};

const PREVIEW_COLS = ['label', 'vesselName', 'containerNumber', 'eta', 'portOfDischarge', 'containerType', 'customerName'];

const parseExcelDate = (val) => {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${date.y}-${m}-${d}`;
    }
  }
  return String(val);
};

export default function ImportShipmentsModal({ onClose, onImported }) {
  const [step, setStep] = useState('upload'); // upload | preview | result
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
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (raw.length < 2) { setError('Excel dosyası boş görünüyor.'); return; }

        const headers = raw[0];
        const dataRows = raw.slice(1).filter(r => r.some(c => c !== undefined && c !== ''));

        const mapped = dataRows.map(row => {
          const obj = {};
          headers.forEach((h, i) => {
            const key = COL_MAP[h];
            if (!key) return;
            const val = row[i];
            // Parse dates
            if (key === 'etd' || key === 'eta') {
              obj[key] = parseExcelDate(val);
            } else {
              obj[key] = val !== undefined ? String(val) : '';
            }
          });
          return obj;
        });

        setRows(mapped);
        setStep('preview');
      } catch (err) {
        setError('Excel okunamadı: ' + err.message);
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
    const headers = Object.keys(COL_MAP);
    const example = [
      'SHP-2025-001', 'Active', 'MSC AGADIR', 'MSCU1234567',
      '2025-05-10', '2025-05-28', 'Port of Agadir', 'Port of Algeciras',
      'Port of Newark', '40RF', 'SL-987654', 'Fresh Citrus Fruits',
      '24000', '1200', '2', '90', '25', '3', '', ''
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
    XLSX.writeFile(wb, 'Sweet Fresh Shipments Template.xlsx');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 800, width: '95vw' }} onClick={e => e.stopPropagation()}>

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
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current.click()}
              style={{
                border: '2px dashed var(--orange-primary)',
                borderRadius: 12,
                padding: '48px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255,107,0,0.04)',
                transition: 'background 0.2s',
              }}
            >
              <Upload size={40} style={{ color: 'var(--orange-primary)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                Excel dosyasını buraya sürükle veya tıkla
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>.xlsx veya .xls dosyası</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
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
                <Download size={16} /> Template İndir
              </button>
              <button className="btn btn-glass" onClick={onClose}>İptal</button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--orange-primary)', fontWeight: 700 }}>{rows.length}</span> shipment bulundu — <strong>{fileName}</strong>
              </p>
              <button className="btn btn-glass" onClick={() => setStep('upload')} style={{ fontSize: 13 }}>
                Değiştir
              </button>
            </div>

            {/* Preview Table */}
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border-color)', maxHeight: 340 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>#</th>
                    {PREVIEW_COLS.map(col => (
                      <th key={col} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {col === 'label' ? 'Shipment #' : col === 'vesselName' ? 'Vessel' : col === 'containerNumber' ? 'Container' : col === 'eta' ? 'ETA' : col === 'portOfDischarge' ? 'Discharge Port' : col === 'containerType' ? 'Type' : 'Customer'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                      {PREVIEW_COLS.map(col => (
                        <td key={col} style={{ padding: '8px 12px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {row[col] || <span style={{ color: 'var(--text-muted)' }}>—</span>}
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
              <button className="btn btn-glass" onClick={onClose}>İptal</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'İçe Aktarılıyor...' : `${rows.length} Shipment'ı İçe Aktar`}
              </button>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <CheckCircle2 size={56} style={{ color: '#22c55e', marginBottom: 16 }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: 22, marginBottom: 8 }}>
              Import Tamamlandı!
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 18 }}>{result.created}</span> shipment başarıyla eklendi.
              {result.failed?.length > 0 && (
                <span style={{ color: '#f59e0b', fontWeight: 600 }}> {result.failed.length} satır atlandı.</span>
              )}
            </p>

            {result.failed?.length > 0 && (
              <div style={{ textAlign: 'left', background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <p style={{ color: '#f59e0b', fontWeight: 600, marginBottom: 8 }}>Atlanan Satırlar:</p>
                {result.failed.map((f, i) => (
                  <p key={i} style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
                    • <strong>{f.row}</strong>: {f.reason}
                  </p>
                ))}
              </div>
            )}

            <button className="btn btn-primary" onClick={onClose}>Kapat</button>
          </div>
        )}
      </div>
    </div>
  );
}
