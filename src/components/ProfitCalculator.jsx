import React, { useState } from 'react';
import { Calculator, X, TrendingUp, TrendingDown, DollarSign, Package, RotateCcw } from 'lucide-react';

const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ProfitCalculator = ({ onClose }) => {
  const [calc, setCalc] = useState({
    boxes: '',
    buyPrice: '',
    sellPrice: '',
    expense: '',
  });

  const set = (k, v) => setCalc(p => ({ ...p, [k]: v }));
  const reset = () => setCalc({ boxes: '', buyPrice: '', sellPrice: '', expense: '' });

  const boxes    = parseFloat(calc.boxes)    || 0;
  const buy      = parseFloat(calc.buyPrice) || 0;
  const sell     = parseFloat(calc.sellPrice)|| 0;
  const expense  = parseFloat(calc.expense)  || 0;

  const totalCost    = buy  * boxes;
  const totalRevenue = sell * boxes;
  const grossProfit  = totalRevenue - totalCost;
  const netProfit    = grossProfit - expense;
  const margin       = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const profitPerBox = boxes > 0 ? netProfit / boxes : 0;

  const isReady  = boxes > 0 && buy > 0 && sell > 0;
  const isProfit = netProfit >= 0;

  return (
    <div style={{
      position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)',
      width: 320, zIndex: 200,
      background: 'var(--bg-card)',
      border: '1px solid rgba(255,107,0,0.3)',
      borderRadius: 16,
      boxShadow: '0 0 40px rgba(255,107,0,0.15)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.2), rgba(255,107,0,0.05))',
        borderBottom: '1px solid rgba(255,107,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,107,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={16} style={{ color: 'var(--orange-primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Profit Calculator</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Quick P&L estimate</div>
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

      {/* Inputs */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {[
          { label: 'BOX QUANTITY', key: 'boxes', placeholder: '0', icon: Package, color: '#94a3b8' },
          { label: 'PURCHASE PRICE / BOX ($)', key: 'buyPrice', placeholder: '0.00', icon: TrendingDown, color: '#ef4444' },
          { label: 'SALE PRICE / BOX ($)', key: 'sellPrice', placeholder: '0.00', icon: TrendingUp, color: '#22c55e' },
          { label: 'TOTAL EXPENSE ($)', key: 'expense', placeholder: '0.00', icon: DollarSign, color: '#f59e0b' },
        ].map(({ label, key, placeholder, icon: Icon, color }) => (
          <div key={key}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, letterSpacing: '0.06em' }}>
              <Icon size={11} style={{ color }} /> {label}
            </label>
            <input
              type="number"
              className="ui-input"
              placeholder={placeholder}
              step="0.01"
              value={calc[key]}
              onChange={e => set(key, e.target.value)}
              style={{ width: '100%', fontSize: '1rem', fontWeight: 600, borderColor: calc[key] ? color + '66' : undefined }}
            />
          </div>
        ))}
      </div>

      {/* Results */}
      {isReady && (
        <div style={{ padding: '0 18px 18px' }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 14 }} />

          {/* Main result */}
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
              {fmt(Math.abs(margin))}% margin · ${fmt(Math.abs(profitPerBox))}/box
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'Total Purchase Cost', value: totalCost, color: '#ef4444', prefix: '-' },
              { label: 'Total Sale Revenue', value: totalRevenue, color: '#22c55e', prefix: '+' },
              { label: 'Gross Profit', value: grossProfit, color: grossProfit >= 0 ? '#22c55e' : '#ef4444', prefix: grossProfit >= 0 ? '+' : '' },
              expense > 0 && { label: 'Expenses', value: expense, color: '#f59e0b', prefix: '-' },
            ].filter(Boolean).map(({ label, value, color, prefix }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 700, color }}>{prefix}${fmt(Math.abs(value))}</span>
              </div>
            ))}
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
                  width: `${Math.min((totalCost / totalRevenue) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                  borderRadius: 4,
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                {((totalCost / totalRevenue) * 100).toFixed(1)}% cost ratio
              </div>
            </div>
          )}
        </div>
      )}

      {!isReady && (
        <div style={{ padding: '0 18px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          Fill in the fields above to see your P&L estimate
        </div>
      )}
    </div>
  );
};

export default ProfitCalculator;
