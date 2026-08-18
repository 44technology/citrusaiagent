import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Loader2, Save } from 'lucide-react';
import ExcelJS from 'exceljs';
import { aosApi } from '../services/api';

const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Same type labels used on Shipment Detail's "Expenses & Revenue" panel —
// kept in sync manually since it's a small fixed list.
const TYPE_LABEL = {
  PurchaseOfGoods: 'Purchase of Goods',
  Tariff: 'Tariff',
  Customs: 'Customs',
  TerminalExamFee: 'Terminal Exam Fee',
  USDAExamFee: 'USDA Exam Fee',
  Revenue: 'Revenue',
  Other: 'Other',
};

const AccountOfSaleModal = ({ shipment, onClose, onSaved }) => {
  const expenses = shipment.expenses || [];
  const revenueLines = expenses.filter(e => e.isRevenue);
  const expenseLines = expenses.filter(e => !e.isRevenue);

  const totalRevenue = revenueLines.reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = expenseLines.reduce((s, e) => s + (e.amount || 0), 0);

  const [form, setForm] = useState({
    aosNumber: shipment.order?.referenceId || shipment.shipmentRefId || '',
    date: new Date().toISOString().slice(0, 10),
    invoiceNumber: '',
    growerName: shipment.grower || '',
    growerAddress: '',
    adminFeePct: '0',
    advance: '0',
    remarks: '',
    status: 'Draft',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    aosApi.getByShipment(shipment.id)
      .then(res => {
        if (res?.aos) {
          setForm(f => ({
            ...f,
            ...res.aos,
            date: res.aos.date ? res.aos.date.slice(0, 10) : f.date,
            adminFeePct: String(res.aos.adminFeePct ?? 0),
            advance: String(res.aos.advance ?? 0),
          }));
        } else if (res?.shipment) {
          setForm(f => ({ ...f, advance: String(res.shipment.advToGrower || 0) }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shipment.id]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const adminFee = totalRevenue * ((parseFloat(form.adminFeePct) || 0) / 100);
  const netProfit = totalRevenue - totalExpenses - adminFee;
  const advance = parseFloat(form.advance) || 0;
  const showRemit = advance > 0;
  const totalOwed = netProfit - advance;

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await aosApi.save(shipment.id, form);
      setForm(f => ({ ...f, ...saved }));
      onSaved?.();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Account of Sale');
    ws.columns = [{ width: 34 }, { width: 16 }, { width: 16 }];

    const bold = (cell) => { cell.font = { bold: true }; };
    const money = (v) => (typeof v === 'number' ? Number(v.toFixed(2)) : v);

    ws.addRow(['ACCOUNT OF SALE', '', `#${form.aosNumber || shipment.id.slice(-6)}`]);
    bold(ws.getCell('A1'));
    ws.addRow(['Date', form.date]);
    ws.addRow(['Account of (Grower)', form.growerName]);
    ws.addRow(['Address', form.growerAddress]);
    ws.addRow(['Invoice No.', form.invoiceNumber]);
    ws.addRow(['Vessel', shipment.vesselName || '']);
    ws.addRow(['Container', shipment.containerNumber || '']);
    ws.addRow(['Fruit & Variety', [shipment.product, shipment.variety].filter(Boolean).join(' ')]);
    ws.addRow(['ATA', shipment.vesselArrival ? new Date(shipment.vesselArrival).toLocaleDateString() : '']);
    ws.addRow([]);

    ws.addRow(['REVENUE', 'DESCRIPTION', 'AMOUNT']).font = { bold: true };
    revenueLines.forEach(e => ws.addRow(['', e.description || TYPE_LABEL[e.type] || e.type, money(e.amount)]));
    const revRow = ws.addRow(['', 'TOTAL REVENUE', money(totalRevenue)]); bold(revRow.getCell(2)); bold(revRow.getCell(3));
    ws.addRow([]);

    ws.addRow(['EXPENSES', 'DESCRIPTION', 'AMOUNT']).font = { bold: true };
    expenseLines.forEach(e => ws.addRow(['', e.description || TYPE_LABEL[e.type] || e.type, money(e.amount)]));
    if (adminFee > 0) ws.addRow(['', `Operational / Admin Fee (${form.adminFeePct}%)`, money(adminFee)]);
    const expRow = ws.addRow(['', 'TOTAL EXPENSES', money(totalExpenses + adminFee)]); bold(expRow.getCell(2)); bold(expRow.getCell(3));
    ws.addRow([]);

    const netRow = ws.addRow(['', 'NET PROFIT', money(netProfit)]); bold(netRow.getCell(2)); bold(netRow.getCell(3));
    if (showRemit) {
      ws.addRow(['', 'LESS ADVANCE', money(advance)]);
      const owedRow = ws.addRow(['', 'TOTAL OWED TO REMIT', money(totalOwed)]); bold(owedRow.getCell(2)); bold(owedRow.getCell(3));
    }
    if (form.remarks) { ws.addRow([]); ws.addRow(['Remarks', form.remarks]); }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AOS_${form.aosNumber || shipment.id.slice(-6)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: 720, padding: 0, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 5 }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={18} className="text-orange" /> Account of Sale
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {shipment.label} · {shipment.containerNumber || 'no container yet'}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex-center" style={{ padding: 60 }}><Loader2 size={24} className="animate-spin" style={{ color: 'var(--orange-primary)' }} /></div>
        ) : (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Header fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="AOS NUMBER">
                <input className="ui-input" value={form.aosNumber} onChange={e => set('aosNumber', e.target.value)} />
              </F>
              <F label="DATE">
                <input type="date" className="ui-input" value={form.date} onChange={e => set('date', e.target.value)} />
              </F>
              <F label="ACCOUNT OF (GROWER)">
                <input className="ui-input" value={form.growerName} onChange={e => set('growerName', e.target.value)} />
              </F>
              <F label="INVOICE Nº">
                <input className="ui-input" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} />
              </F>
              <F label="GROWER ADDRESS" full>
                <input className="ui-input" style={{ width: '100%' }} placeholder="Street, City, State/Province, Country" value={form.growerAddress} onChange={e => set('growerAddress', e.target.value)} />
              </F>
            </div>

            {/* Read-only shipment facts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: 10, fontSize: '0.8rem' }}>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>VESSEL</div>{shipment.vesselName || '—'}</div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>CONTAINER</div>{shipment.containerNumber || '—'}</div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>FRUIT &amp; VARIETY</div>{[shipment.product, shipment.variety].filter(Boolean).join(' ') || '—'}</div>
              <div><div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>ATA</div>{shipment.vesselArrival ? new Date(shipment.vesselArrival).toLocaleDateString() : '—'}</div>
            </div>

            {/* Revenue table */}
            <Section title="REVENUE" color="#3E7E52">
              {revenueLines.length === 0 ? (
                <Empty text="No revenue entries yet — add them from Shipment Detail → Expenses & Revenue." />
              ) : revenueLines.map(e => (
                <Row key={e.id} label={e.description || TYPE_LABEL[e.type] || e.type} value={e.amount} color="#6FCB8C" />
              ))}
              <Row bold label="TOTAL REVENUE" value={totalRevenue} color="#6FCB8C" />
            </Section>

            {/* Expenses table */}
            <Section title="EXPENSES" color="#B9800F">
              {expenseLines.length === 0 ? (
                <Empty text="No expense entries yet." />
              ) : expenseLines.map(e => (
                <Row key={e.id}
                  label={e.description || TYPE_LABEL[e.type] || e.type}
                  sub={e.type === 'PurchaseOfGoods' && e.boxQuantity ? `${e.boxQuantity} boxes × $${fmt(e.boxPrice)}` : null}
                  value={e.amount} color="#E0AC4C" />
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Operational / Admin Fee</span>
                <input type="number" className="ui-input" style={{ width: 70, padding: '4px 6px', fontSize: '0.78rem' }} value={form.adminFeePct} onChange={e => set('adminFeePct', e.target.value)} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>% of revenue</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.85rem' }}>${fmt(adminFee)}</span>
              </div>
              <Row bold label="TOTAL EXPENSES" value={totalExpenses + adminFee} color="#E0AC4C" />
            </Section>

            {/* Net profit */}
            <div style={{ padding: '14px 16px', borderRadius: 10, background: netProfit >= 0 ? 'rgba(62,126,82,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${netProfit >= 0 ? 'rgba(62,126,82,0.35)' : 'rgba(239,68,68,0.35)'}`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>NET PROFIT</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: netProfit >= 0 ? '#6FCB8C' : '#f87171' }}>{netProfit >= 0 ? '+' : '-'}${fmt(Math.abs(netProfit))}</div>
            </div>

            {/* Advance / Remit — only shown when relevant */}
            <Section title="ADVANCE &amp; REMIT (OPTIONAL)" color="#2C6C9B">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Advance already paid to grower</span>
                <input type="number" className="ui-input" style={{ width: 120, padding: '4px 8px', fontSize: '0.82rem' }} value={form.advance} onChange={e => set('advance', e.target.value)} />
              </div>
              {showRemit && (
                <Row bold label="TOTAL OWED TO REMIT" value={totalOwed} color={totalOwed >= 0 ? '#6FB4E0' : '#f87171'} />
              )}
            </Section>

            <F label="REMARKS / NOTES">
              <textarea className="ui-input" rows={2} style={{ width: '100%', resize: 'vertical' }} value={form.remarks} onChange={e => set('remarks', e.target.value)} />
            </F>

            <div style={{ display: 'flex', gap: 10 }}>
              <select className="ui-select" value={form.status} onChange={e => set('status', e.target.value)} style={{ width: 140 }}>
                <option>Draft</option>
                <option>Final</option>
              </select>
              <button className="btn btn-glass" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handleExport}>
                <FileSpreadsheet size={15} /> Export Excel
              </button>
              <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const F = ({ label, children, full }) => (
  <div style={full ? { gridColumn: '1 / -1' } : undefined}>
    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>{label}</label>
    {children}
  </div>
);

const Section = ({ title, color, children }) => (
  <div>
    <div style={{ fontSize: '0.72rem', fontWeight: 800, color, letterSpacing: '0.06em', marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${color}30` }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
  </div>
);

const Row = ({ label, sub, value, color, bold }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: bold ? '8px 0 0' : '4px 0', borderTop: bold ? '1px solid var(--border-glass)' : 'none' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: bold ? '0.85rem' : '0.8rem', fontWeight: bold ? 700 : 500 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
    <div style={{ fontWeight: bold ? 800 : 700, fontSize: bold ? '0.95rem' : '0.85rem', color }}>${fmt(value)}</div>
  </div>
);

const Empty = ({ text }) => (
  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>{text}</div>
);

export default AccountOfSaleModal;
