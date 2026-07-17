import React, { useState } from 'react';
import { Calculator, X, TrendingUp, TrendingDown, DollarSign, Package, RotateCcw, Archive } from 'lucide-react';

const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY = {
  qty: '',
  buyPrice: '',
  sellPrice: '',
  oceanFreight: '',
  customs: '',
  trucking: '',
  handling: '',
  otherExpense: '',
  commissionPct: '',
};

const ProfitCalculator = ({ onClose }) => {
  const [unit, setUnit] = useState('box'); // 'box' | 'bin'
  const [calc, setCalc] = useState({ ...EMPTY });

  const set = (k, v) => setCalc(p => ({ ...p, [k]: v }));
  const reset = () => setCalc({ ...EMPTY });

  const UNIT = unit === 'box' ? 'BOX' : 'BIN';
  const unitWord = unit === 'box' ? 'box' : 'bin';

  const qty     = parseFloat(calc.qty)       || 0;
  const buy     = parseFloat(calc.buyPrice)  || 0;
  const sell    = parseFloat(calc.sellPrice) || 0;
  const freight = parseFloat(calc.oceanFreight) || 0;
  const customs = parseFloat(calc.customs)   || 0;
  const truck   = parseFloat(calc.trucking)  || 0;
  const handle  = parseFloat(calc.handling)  || 0;
  const other   = parseFloat(calc.otherExpense) || 0;
  const commPct = parseFloat(calc.commissionPct) || 0;

  const totalCost    = buy  * qty;
  const totalRevenue = sell * qty;
  const commission   = totalRevenue * (commPct / 100);
  const totalExpense = freight + customs + truck + handle + other + commission;
  const grossProfit  = totalRevenue - totalCost;
  const netProfit    = grossProfit - totalExpense;
  const margin       = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const profitPerUnit = qty > 0 ? netProfit / qty : 0;
  const costPerUnit   = qty > 0 ? (totalCost + totalExpense) / qty : 0;
  const breakEven     = qty > 0 ? (totalCost + totalExpense) / qty : 0;

  const isReady  = qty > 0 && buy > 0 && sell > 0;
  const isProfit = netProfit >= 0;

  const inputRow = (label, key, Icon, color, placeholder = '0.00') => (
    <div key={key}>
      <label style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, letterSpacing: '0.05em' }}>
        <Icon size={11} style={{ color }} /> {label}
      </label>
      <input
        type="number"
        className="ui-input"
        placeholder={placeholder}
        step="0.01"
        value={calc[key]}
        onChange={e => set(key, e.target.value)}
        style={{ width: '100%', fontSize: '0.92rem', fontWeight: 600, padding: '8px 12px', borderColor: calc[key] ? color + '66' : undefined }}
      />
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
    <div onClick={e => e.stopPropagation()} style={{
      width: 380, maxHeight: '92vh',
      background: '#161b26',
      border: '1px solid rgba(255,107,0,0.3)',
      borderRadius: 16,
      boxShadow: '0 8px 48px rgba(0,0,0,0.7), 0 0 40px rgba(255,107,0,0.15)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.2), rgba(255,107,0,0.05))',
        borderBottom: '1px solid rgba(255,107,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,107,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={16} style={{ color: 'var(--orange-primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Profit Calculator</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Detailed P&L estimate</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }} title="Reset">
            <RotateCcw size={14} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {/* Unit toggle */}
        <div style={{ padding: '14px 18px 0', display: 'flex', gap: 8 }}>
          {[['box', 'BOX', Package], ['bin', 'BIN', Archive]].map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setUnit(id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: '0.8rem', fontWeight: 700,
                background: unit === id ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.04)',
                border: unit === id ? '1px solid var(--orange-primary)' : '1px solid rgba(255,255,255,0.1)',
                color: unit === id ? 'var(--orange-primary)' : 'var(--text-muted)',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Core inputs */}
        <div style={{ padding: '14px 18px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inputRow(`${UNIT} QUANTITY`, 'qty', Package, '#94a3b8', '0')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {inputRow(`BUY / ${UNIT} ($)`, 'buyPrice', TrendingDown, '#ef4444')}
            {inputRow(`SELL / ${UNIT} ($)`, 'sellPrice', TrendingUp, '#22c55e')}
          </div>
        </div>

        {/* Expenses */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.07em' }}>
            EXPENSES (TOTAL $)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {inputRow('OCEAN FREIGHT', 'oceanFreight', DollarSign, '#38bdf8')}
            {inputRow('CUSTOMS & TARIFF', 'customs', DollarSign, '#f97316')}
            {inputRow('TRUCKING', 'trucking', DollarSign, '#a78bfa')}
            {inputRow('HANDLING / STORAGE', 'handling', DollarSign, '#f59e0b')}
            {inputRow('OTHER', 'otherExpense', DollarSign, '#94a3b8')}
            {inputRow('COMMISSION (% OF SALE)', 'commissionPct', DollarSign, '#ec4899', '0')}
          </div>
          {totalExpense > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: 'rgba(245,158,11,0.07)', borderRadius: 8, fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Expenses{commPct > 0 ? ` (incl. $${fmt(commission)} commission)` : ''}</span>
              <span style={{ fontWeight: 700, color: '#f59e0b' }}>${fmt(totalExpense)}</span>
            </div>
          )}
        </div>

        {/* Results */}
        {isReady ? (
          <div style={{ padding: '0 18px 18px' }}>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

            <div style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: isProfit ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${isProfit ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              marginBottom: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>NET PROFIT</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isProfit ? '#22c55e' : '#ef4444', lineHeight: 1.1 }}>
                {isProfit ? '+' : '-'}${fmt(Math.abs(netProfit))}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {fmt(Math.abs(margin))}% margin · ${fmt(Math.abs(profitPerUnit))}/{unitWord}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: `Purchase (${qty.toLocaleString()} × $${fmt(buy)})`, value: totalCost, color: '#ef4444', prefix: '-' },
                { label: `Revenue (${qty.toLocaleString()} × $${fmt(sell)})`, value: totalRevenue, color: '#22c55e', prefix: '+' },
                { label: 'Gross Profit', value: grossProfit, color: grossProfit >= 0 ? '#22c55e' : '#ef4444', prefix: grossProfit >= 0 ? '+' : '' },
                totalExpense > 0 && { label: 'Total Expenses', value: totalExpense, color: '#f59e0b', prefix: '-' },
              ].filter(Boolean).map(({ label, value, color, prefix }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{prefix}${fmt(Math.abs(value))}</span>
                </div>
              ))}
            </div>

            {/* Per-unit metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600 }}>LANDED COST / {UNIT}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>${fmt(costPerUnit)}</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600 }}>BREAK-EVEN SELL / {UNIT}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8' }}>${fmt(breakEven)}</div>
              </div>
            </div>

            {/* Profit indicator bar */}
            {totalRevenue > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cost</span><span>Revenue</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(((totalCost + totalExpense) / totalRevenue) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                    borderRadius: 4,
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                  {(((totalCost + totalExpense) / totalRevenue) * 100).toFixed(1)}% cost ratio
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '0 18px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Fill in quantity, buy and sell price to see your P&L
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default ProfitCalculator;
