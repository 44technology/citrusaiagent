import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Ship, BarChart3, RefreshCw } from 'lucide-react';
import { shipmentsApi, ordersApi } from '../services/api';

const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK = (n) => {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
};

const EXPENSE_COLORS = {
  Tariff:          '#f59e0b',
  Customs:         '#8b5cf6',
  TerminalExamFee: '#06b6d4',
  PurchaseOfGoods: '#ef4444',
  USDAExamFee:     '#ec4899',
  Revenue:         '#22c55e',
  Other:           '#94a3b8',
};

const StatCard = ({ label, value, sub, color, icon: Icon, positive }) => (
  <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={24} style={{ color }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  </div>
);

const PLPage = ({ selectedCompany }) => {
  const [shipments, setShipments] = useState([]);
  const [expenses, setExpenses]   = useState([]); // flat list of all expenses
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState('all'); // all | year | month

  const loadData = async () => {
    setLoading(true);
    try {
      const [ships, ords] = await Promise.all([
        shipmentsApi.getAll(),
        ordersApi.getAll(),
      ]);
      setShipments(Array.isArray(ships) ? ships : []);
      setOrders(Array.isArray(ords) ? ords : []);

      // Load expenses for all shipments in parallel (batch)
      const allExpenses = [];
      await Promise.all(
        (Array.isArray(ships) ? ships : []).map(async (s) => {
          try {
            const exps = await shipmentsApi.getExpenses(s.id);
            if (Array.isArray(exps)) {
              exps.forEach(e => allExpenses.push({ ...e, shipmentLabel: s.label, shipmentId: s.id }));
            }
          } catch {}
        })
      );
      setExpenses(allExpenses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedCompany?.id]);

  // ── Filter by period ──────────────────────────────────────────
  const now = new Date();
  const filterDate = (dateStr) => {
    if (period === 'all') return true;
    const d = new Date(dateStr);
    if (period === 'year')  return d.getFullYear() === now.getFullYear();
    if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    return true;
  };

  const filteredExpenses = expenses.filter(e => filterDate(e.createdAt));
  const filteredOrders   = orders.filter(o => filterDate(o.createdAt));

  // ── Revenue = isRevenue expenses + sale price of orders ──────
  const revenueFromExpenses = filteredExpenses
    .filter(e => e.isRevenue)
    .reduce((s, e) => s + (e.amount || 0), 0);

  const revenueFromOrders = filteredOrders
    .reduce((s, o) => s + ((o.salePrice || 0) * (o.boxQuantity || 0)), 0);

  const totalRevenue = revenueFromExpenses + revenueFromOrders;

  // ── Cost of goods = purchase price × qty from orders ─────────
  const costOfGoods = filteredOrders
    .reduce((s, o) => s + ((o.purchasePrice || 0) * (o.boxQuantity || 0)), 0);

  // ── Operating expenses (non-revenue shipment expenses) ────────
  const operatingExpenses = filteredExpenses
    .filter(e => !e.isRevenue)
    .reduce((s, e) => s + (e.amount || 0), 0);

  const totalExpenses = costOfGoods + operatingExpenses;
  const grossProfit   = totalRevenue - costOfGoods;
  const netPL         = totalRevenue - totalExpenses;
  const margin        = totalRevenue > 0 ? ((netPL / totalRevenue) * 100).toFixed(1) : 0;

  // ── Expense breakdown by type ─────────────────────────────────
  const expenseByType = {};
  filteredExpenses.filter(e => !e.isRevenue).forEach(e => {
    expenseByType[e.type] = (expenseByType[e.type] || 0) + (e.amount || 0);
  });

  // ── Per-shipment summary ──────────────────────────────────────
  const shipmentSummary = shipments
    .filter(s => filterDate(s.createdAt))
    .map(s => {
      const sExpenses = filteredExpenses.filter(e => e.shipmentId === s.id);
      const rev  = sExpenses.filter(e => e.isRevenue).reduce((a, e) => a + e.amount, 0);
      const cost = sExpenses.filter(e => !e.isRevenue).reduce((a, e) => a + e.amount, 0);
      const pl   = rev - cost;
      return { ...s, rev, cost, pl, hasData: sExpenses.length > 0 };
    })
    .filter(s => s.hasData)
    .sort((a, b) => b.pl - a.pl);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: 'var(--text-muted)' }}>
      <RefreshCw size={24} className="animate-spin" style={{ marginRight: 10 }} /> Loading P&L data…
    </div>
  );

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header">
          <div className="page-icon-box">
            <BarChart3 size={24} className="text-orange" />
          </div>
          <div>
            <h1 className="page-title">P&L Overview</h1>
            <p className="page-subtitle">Revenue, expenses and net profit across all shipments and orders.</p>
          </div>
        </div>
        {/* Period filter */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'All Time'], ['year', 'This Year'], ['month', 'This Month']].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={period === v ? 'btn btn-primary' : 'btn btn-glass'}
              style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Revenue"     value={fmtK(totalRevenue)}   color="#22c55e" icon={TrendingUp}   sub={`${filteredOrders.length} orders · ${shipmentSummary.length} shipments`} />
        <StatCard label="Cost of Goods"     value={fmtK(costOfGoods)}    color="#ef4444" icon={ShoppingBag}  sub={`${filteredOrders.length} purchase orders`} />
        <StatCard label="Operating Expenses" value={fmtK(operatingExpenses)} color="#f59e0b" icon={Ship}   sub={`Freight, customs, handling…`} />
        <StatCard label="Net P&L"           value={fmtK(netPL)}          color={netPL >= 0 ? '#22c55e' : '#ef4444'} icon={DollarSign} sub={`${margin}% margin`} />
      </div>

      {/* Gross Profit bar */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Revenue vs Expenses</span>
          <span style={{ fontSize: '0.82rem', color: netPL >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
            Net: {fmt(netPL)}
          </span>
        </div>
        {totalRevenue > 0 || totalExpenses > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Revenue',            value: totalRevenue,        max: Math.max(totalRevenue, totalExpenses), color: '#22c55e' },
              { label: 'Cost of Goods',      value: costOfGoods,         max: Math.max(totalRevenue, totalExpenses), color: '#ef4444' },
              { label: 'Operating Expenses', value: operatingExpenses,   max: Math.max(totalRevenue, totalExpenses), color: '#f59e0b' },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>{label}</span><span style={{ color, fontWeight: 700 }}>{fmt(value)}</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color, borderRadius: 5, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.85rem' }}>No data for this period</div>
        )}
      </div>

      {/* Two columns: expense breakdown + per-shipment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Expense breakdown by type */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', fontWeight: 700 }}>Expense Breakdown</h3>
          {Object.keys(expenseByType).length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No expense data</div>
            : Object.entries(expenseByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, amount]) => {
                  const total = Object.values(expenseByType).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
                  const color = EXPENSE_COLORS[type] || '#94a3b8';
                  return (
                    <div key={type} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{type}</span>
                        <span style={{ color, fontWeight: 700 }}>{fmt(amount)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })
          }
        </div>

        {/* Per-shipment P&L */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', fontWeight: 700 }}>P&L by Shipment</h3>
          {shipmentSummary.length === 0
            ? <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No shipment expense data yet</div>
            : <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {shipmentSummary.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass-light)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rev: {fmt(s.rev)} · Cost: {fmt(s.cost)}</div>
                    </div>
                    <span style={{
                      fontWeight: 700, fontSize: '0.82rem',
                      color: s.pl >= 0 ? '#22c55e' : '#ef4444',
                      flexShrink: 0,
                    }}>
                      {s.pl >= 0 ? '+' : ''}{fmt(s.pl)}
                    </span>
                  </div>
                ))}
              </div>
          }
        </div>

      </div>

      {/* Orders summary table */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '0.88rem', fontWeight: 700 }}>Orders Summary</h3>
        {filteredOrders.length === 0
          ? <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No orders for this period</div>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {['Ref', 'Product', 'Variety', 'Qty', 'Purchase $/box', 'Sale $/box', 'Purchase Total', 'Sale Total', 'Gross Profit'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-glass-light)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o, i) => {
                    const purchaseTotal = (o.purchasePrice || 0) * (o.boxQuantity || 0);
                    const saleTotal     = (o.salePrice || 0)    * (o.boxQuantity || 0);
                    const gp            = saleTotal - purchaseTotal;
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--orange-primary)', fontWeight: 700 }}>#{o.referenceId}</td>
                        <td style={{ padding: '8px 12px' }}>{o.product}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{o.variety}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{(o.boxQuantity || 0).toLocaleString()}</td>
                        <td style={{ padding: '8px 12px', color: '#f59e0b' }}>{o.purchasePrice ? fmt(o.purchasePrice) : '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#22c55e' }}>{o.salePrice ? fmt(o.salePrice) : '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#ef4444', fontWeight: 600 }}>{purchaseTotal > 0 ? fmt(purchaseTotal) : '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#22c55e', fontWeight: 600 }}>{saleTotal > 0 ? fmt(saleTotal) : '—'}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: gp >= 0 ? '#22c55e' : '#ef4444' }}>
                          {saleTotal > 0 || purchaseTotal > 0 ? (gp >= 0 ? '+' : '') + fmt(gp) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-glass-light)', background: 'rgba(255,255,255,0.04)' }}>
                    <td colSpan={3} style={{ padding: '8px 12px', fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-muted)' }}>TOTAL</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>{filteredOrders.reduce((s, o) => s + (o.boxQuantity || 0), 0).toLocaleString()}</td>
                    <td /><td />
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#ef4444' }}>{fmt(costOfGoods)}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#22c55e' }}>{fmt(revenueFromOrders)}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: (revenueFromOrders - costOfGoods) >= 0 ? '#22c55e' : '#ef4444' }}>
                      {fmt(revenueFromOrders - costOfGoods)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
        }
      </div>

    </div>
  );
};

export default PLPage;
