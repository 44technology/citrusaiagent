import React, { useState, useEffect } from 'react';
import {
  Ship, MapPin, Anchor, Clock, CheckCircle2, Navigation,
  Package, FileText, AlertCircle, Loader2, X, Calendar, User
} from 'lucide-react';
import { shipmentsApi } from '../services/api';
import { formatDateUTC } from '../utils/dateUtils';
import ShipmentDetailModal from './ShipmentDetailModal';

// ── Stages ────────────────────────────────────────────────────
const STAGES = [
  { id: 'Pending',       label: 'Pending',       icon: Clock,         color: '#94a3b8' },
  { id: 'Loading',       label: 'Loading',        icon: Package,       color: '#f59e0b' },
  { id: 'Departed',      label: 'Departed',       icon: Navigation,    color: '#3b82f6' },
  { id: 'Transshipment', label: 'Transship.',     icon: Anchor,        color: '#8b5cf6' },
  { id: 'In Transit',    label: 'In Transit',     icon: Ship,          color: '#06b6d4' },
  { id: 'Arrived',       label: 'Arrived',        icon: MapPin,        color: '#10b981' },
  { id: 'Customs',       label: 'Customs',        icon: FileText,      color: '#f97316' },
  { id: 'Delivered',     label: 'Delivered',      icon: CheckCircle2,  color: '#22c55e' },
];

const getStageIndex = (status) => STAGES.findIndex(s => s.id === status);

// ── Status progress bar ───────────────────────────────────────
const StatusLine = ({ shipment }) => {
  const currentIdx = getStageIndex(shipment.status);
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 'max-content', gap: 0 }}>
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const done   = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <React.Fragment key={stage.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 90, flexShrink: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? `${stage.color}30` : active ? `${stage.color}25` : 'rgba(255,255,255,0.03)',
                  border: active ? `2px solid ${stage.color}` : done ? `2px solid ${stage.color}80` : '2px solid rgba(255,255,255,0.08)',
                  boxShadow: active ? `0 0 16px ${stage.color}50` : 'none',
                  zIndex: 1, position: 'relative',
                }}>
                  <Icon size={18} style={{ color: done || active ? stage.color : 'var(--text-muted)', opacity: idx > currentIdx ? 0.4 : 1 }} />
                  {done && (
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: stage.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={11} style={{ color: '#000' }} />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 6, fontSize: '0.72rem', fontWeight: active ? 700 : done ? 500 : 400, color: active ? stage.color : done ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', opacity: idx > currentIdx ? 0.5 : 1 }}>
                  {stage.label}
                </div>
                {active && (
                  <div style={{ marginTop: 4, fontSize: '0.65rem', padding: '1px 8px', borderRadius: 20, background: `${stage.color}25`, color: stage.color, border: `1px solid ${stage.color}50`, fontWeight: 600 }}>
                    Current
                  </div>
                )}
              </div>
              {idx < STAGES.length - 1 && (
                <div style={{ flex: 1, height: 2, background: idx < currentIdx ? `linear-gradient(90deg,${STAGES[idx].color}80,${STAGES[idx+1].color}80)` : 'rgba(255,255,255,0.08)', alignSelf: 'center', marginTop: -20, minWidth: 16 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ── Kanban card ───────────────────────────────────────────────
const KanbanCard = ({ shipment, color, onClick }) => {
  const refId = shipment.order?.referenceId || shipment.shipmentRefId;
  return (
    <div
      onClick={() => onClick(shipment)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${color}30`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        marginBottom: 8,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}0a`; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Container # + Ref */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {shipment.containerNumber || 'No Container'}
        </div>
        {refId && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color, background: `${color}15`, padding: '1px 6px', borderRadius: 8 }}>
            #{refId}
          </span>
        )}
      </div>

      {/* Customer */}
      {(shipment.contact?.name || shipment.contact?.company) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
          <User size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shipment.contact?.name || shipment.contact?.company}
          </span>
        </div>
      )}

      {/* ETD / ETA */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {shipment.vesselDeparture && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontWeight: 600 }}>ETD</span>
            <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>{formatDateUTC(shipment.vesselDeparture)}</span>
          </div>
        )}
        {shipment.vesselEta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontWeight: 600 }}>ETA</span>
            <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 600 }}>{formatDateUTC(shipment.vesselEta)}</span>
          </div>
        )}
      </div>

      {/* Vessel */}
      {shipment.vesselName && (
        <div style={{ marginTop: 5, fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🚢 {shipment.vesselName}
        </div>
      )}
    </div>
  );
};

// ── Detail drawer ─────────────────────────────────────────────
const ShipmentDrawer = ({ shipment, onClose, onUpdate, onDelete }) => {
  if (!shipment) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 190, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(860px, 95vw)', zIndex: 191,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border-glass)',
        boxShadow: '-16px 0 48px rgba(0,0,0,0.5)',
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Sticky status bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)', borderBottom: '1px solid var(--border-glass)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'monospace' }}>{shipment.containerNumber || 'No Container'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {[shipment.shippingLine, shipment.vesselName, shipment.contact?.name].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}>
              <X size={20} />
            </button>
          </div>
          <StatusLine shipment={shipment} />
        </div>

        {/* Detail content */}
        <div style={{ flex: 1, padding: '0 4px' }}>
          <ShipmentDetailModal
            isOpen={true}
            onClose={onClose}
            shipment={shipment}
            onUpdate={onUpdate}
            onDelete={onDelete}
            embedded={true}
          />
        </div>
      </div>
    </>
  );
};

// ── Main Tracking page ────────────────────────────────────────
const ShipmentTracking = () => {
  const [shipments, setShipments]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await shipmentsApi.getAll();
      setShipments(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpdate = (updated) => {
    setShipments(p => p.map(s => s.id === updated.id ? updated : s));
    setSelected(updated);
  };
  const handleDelete = (id) => {
    setShipments(p => p.filter(s => s.id !== id));
    setSelected(null);
  };

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} className="text-orange" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      {/* Header */}
      <div className="flex-between">
        <div className="page-header">
          <div className="page-icon-box">
            <Navigation size={24} className="text-orange" />
          </div>
          <div>
            <h1 className="page-title">Shipment Tracking</h1>
            <p className="page-subtitle">{shipments.length} shipments across {STAGES.filter(s => shipments.some(sh => sh.status === s.id)).length} stages</p>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: 12, paddingBottom: 16, alignItems: 'flex-start' }}>
        {STAGES.map(stage => {
          const Icon = stage.icon;
          const cards = shipments.filter(s => s.status === stage.id);
          return (
            <div key={stage.id} style={{ flexShrink: 0, width: 220, display: 'flex', flexDirection: 'column' }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                borderRadius: '10px 10px 0 0',
                background: `${stage.color}15`,
                border: `1px solid ${stage.color}30`,
                borderBottom: 'none', marginBottom: 0,
              }}>
                <Icon size={14} style={{ color: stage.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: stage.color, flex: 1 }}>{stage.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: `${stage.color}25`, color: stage.color, padding: '1px 7px', borderRadius: 10 }}>
                  {cards.length}
                </span>
              </div>

              {/* Cards container */}
              <div style={{
                flex: 1, minHeight: 120, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${stage.color}20`,
                borderTop: `2px solid ${stage.color}`,
                borderRadius: '0 0 10px 10px',
                padding: '10px 8px',
              }}>
                {cards.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 8px', color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.5 }}>
                    Empty
                  </div>
                ) : cards.map(sh => (
                  <KanbanCard key={sh.id} shipment={sh} color={stage.color} onClick={setSelected} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer */}
      {selected && (
        <ShipmentDrawer
          shipment={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default ShipmentTracking;
