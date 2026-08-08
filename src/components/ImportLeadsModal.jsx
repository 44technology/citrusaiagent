import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Users, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { contactsApi } from '../services/api';

const ImportLeadsModal = ({ isOpen, onClose, onImported, importType = 'Lead' }) => {
  const [step, setStep]         = useState('upload'); // upload | preview | importing | done
  const [rows, setRows]         = useState([]);
  const [summary, setSummary]   = useState(null);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef();

  if (!isOpen) return null;

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

        // Detect header row — BBOS files have a title row before headers
        let data = raw;
        if (raw.length > 0) {
          const firstKey = Object.keys(raw[0])[0];
          if (firstKey && !firstKey.includes('CompanyName') && !firstKey.includes('Company')) {
            // Try second row as header
            const ws2 = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const headerRowIdx = ws2.findIndex(r => r.some(c => String(c).includes('CompanyName') || String(c).includes('Company')));
            if (headerRowIdx >= 0) {
              const headers = ws2[headerRowIdx];
              data = ws2.slice(headerRowIdx + 1).map(row => {
                const obj = {};
                headers.forEach((h, i) => { obj[String(h).trim()] = row[i] ?? ''; });
                return obj;
              });
            }
          }
        }

        const clean = (v) => {
          const s = String(v ?? '').trim();
          return ['nan', 'None', 'NaN', 'undefined'].includes(s) ? '' : s;
        };

        const parsed = data
          .map(r => ({
            CompanyName:    clean(r['CompanyName']   || r['Company Name'] || r['Company']),
            FirstName:      clean(r['FirstName']     || r['First Name']   || r['First']),
            LastName:       clean(r['LastName']      || r['Last Name']    || r['Last']),
            Title:          clean(r['Title']),
            City:           clean(r['City']),
            State:          clean(r['State']),
            'Zip Code':     clean(r['Zip Code']      || r['ZipCode']      || r['Zip']),
            Country:        clean(r['Country']),
            CompanyPhone:   clean(r['CompanyPhone']  || r['Company Phone']|| r['Phone']),
            BusinessPhone:  clean(r['BusinessPhone'] || r['Business Phone']|| r['Phone']),
            Email:          clean(r['Email']         || r['email']),
            Classifications:clean(r['Classifications']|| r['Classification']),
            Commodities:    clean(r['Commodities']   || r['Commodity']),
            LinkedInURL:    clean(r['LinkedInURL']   || r['LinkedIn']     || r['LinkedinURL']),
            WebSite:        clean(r['WebSite']       || r['Website']      || r['website']),
          }))
          .filter(r => r.CompanyName);

        // Build summary
        const companies = new Set(parsed.map(r => r.CompanyName));
        const people    = parsed.filter(r => r.FirstName || r.LastName);

        setRows(parsed);
        setSummary({ companies: companies.size, people: people.length, total: parsed.length });
        setStep('preview');
      } catch (err) {
        setError('Could not read file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    setStep('importing');
    setError('');
    try {
      // Send in batches of 40
      const totals = { companiesCreated: 0, companiesSkipped: 0, peopleCreated: 0 };
      const batchSize = 40;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const r = await contactsApi.importLeads(batch, importType);
        totals.companiesCreated += r.companiesCreated || 0;
        totals.companiesSkipped += r.companiesSkipped || 0;
        totals.peopleCreated    += r.peopleCreated    || 0;
      }
      setResult(totals);
      setStep('done');
      onImported?.();
    } catch (err) {
      setError('Import failed: ' + err.message);
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('upload'); setRows([]); setSummary(null);
    setResult(null); setError(''); setFileName('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>

        {/* Header */}
        <div className="modal-header">
          <div className="flex-center gap-2">
            <FileSpreadsheet size={18} style={{ color: 'var(--orange-primary)' }} />
            <h3>Import {importType === 'Lead' ? 'Leads' : 'Contacts'} from Excel</h3>
          </div>
          <button className="icon-btn-small" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Step: Upload */}
          {step === 'upload' && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                style={{
                  border: '2px dashed var(--border-glass)', borderRadius: 12,
                  padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--orange-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}
              >
                <Upload size={32} style={{ color: 'var(--orange-primary)', margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Click to upload or drag & drop</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Excel (.xlsx) — BBOS format or matching columns
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <strong>Expected columns:</strong> CompanyName, FirstName, LastName, Title, City, State, Zip Code, Country, CompanyPhone, Email, Classifications, Commodities, LinkedInURL, WebSite
              </div>

              {error && <div style={{ color: '#f87171', fontSize: '0.82rem' }}>{error}</div>}
            </>
          )}

          {/* Step: Preview */}
          {step === 'preview' && summary && (
            <>
              <div style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 700 }}>
                  📄 {fileName}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                    <Building2 size={20} style={{ color: 'var(--orange-primary)', margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--orange-primary)' }}>{summary.companies}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Companies</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                    <Users size={20} style={{ color: '#38bdf8', margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>{summary.people}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>People</div>
                  </div>
                </div>
              </div>

              {/* Preview table */}
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 220, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.06)', position: 'sticky', top: 0 }}>
                      {['Company', 'First Name', 'Last Name', 'Title', 'Email', 'Phone', 'City', 'State'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '5px 10px', color: 'var(--orange-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.CompanyName}</td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>{r.FirstName}</td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>{r.LastName}</td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{r.Title}</td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{r.Email}</td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{r.CompanyPhone || r.BusinessPhone}</td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{r.City}</td>
                        <td style={{ padding: '5px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{r.State}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                ℹ️ Existing companies will be skipped (no duplicates). People will be added to their company.
              </div>

              {error && (
                <div style={{ color: '#f87171', fontSize: '0.82rem', display: 'flex', gap: 6 }}>
                  <AlertCircle size={14} />{error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-glass" style={{ flex: 1 }} onClick={reset}>← Change File</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleImport}>
                  <Upload size={14} /> Import {summary.companies} Companies
                </button>
              </div>
            </>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Loader2 size={40} className="animate-spin" style={{ color: 'var(--orange-primary)', margin: '0 auto 16px' }} />
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Importing…</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Creating companies and contacts</div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <>
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <CheckCircle2 size={44} style={{ color: '#22c55e', margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>Import Complete!</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Companies Created', value: result.companiesCreated, color: '#22c55e' },
                  { label: 'Already Existed',   value: result.companiesSkipped, color: '#f59e0b' },
                  { label: 'People Added',       value: result.peopleCreated,   color: '#38bdf8' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => { reset(); onClose(); }}>Close</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={reset}>Import Another</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default ImportLeadsModal;
