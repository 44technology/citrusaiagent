import React, { useState, useEffect } from 'react';
import {
  Ship, Search, MapPin, Anchor, Clock, CheckCircle2,
  Navigation, Package, Hash, X, ChevronRight, Calendar,
  Thermometer, User, FileText, AlertCircle, Loader2
} from 'lucide-react';
import { shipmentsApi } from '../services/api';
import { formatDateUTC } from '../utils/dateUtils';
import ShipmentDetailModal from './ShipmentDetailModal';

// All possible shipment stages in order
const STAGES = [
  { id: 'Pending',        label: 'Pending',        icon: Clock,         color: '#94a3b8' },
  { id: 'Loading',        label: 'Loading',         icon: Package,       color: '#f59e0b' },
  { id: 'Departed',       label: 'Departed',        icon: Navigation,    color: '#3b82f6' },
  { id: 'Transshipment',  label: 'Transshipment',   icon: Anchor,        color: '#8b5cf6' },
  { id: 'In Transit',     label: 'In Transit',      icon: Ship,          color: '#06b6d4' },
  { id: 'Arrived',        label: 'Arrived',         icon: MapPin,        color: '#10b981' },
  { id: 'Customs',        label: 'Customs',         icon: FileText,      color: '#f97316' },
  { id: 'Delivered',      label: 'Delivered',       icon: CheckCircle2,  color: '#22c55e' },
];

const getStageIndex = (status) => STAGES.findIndex(s => s.id === status);

const ShipmentCard = ({ shipment, onClick }) => {
  const stageIdx = getStageIndex(shipment.status);
  const stage = STAGES[stageIdx] || STAGES[0];
  const StageIcon = stage.icon;

  return (
    <div
      className="glass-panel"
      onClick={() => onClick(shipment)}
      style={{
        padding: '16px 20px',
        cursor: 'pointer',
        border: '1px solid var(--border-glass)',
        borderRadius: '12px',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--orange-primary)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '10px',
        background: `${stage.color}20`,
        border: `1px solid ${stage.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <StageIcon size={20} style={{ color: stage.color }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            {shipment.containerNumber || 'No Container #'}
          </span>
          {shipment.order?.referenceId && (
            <span style={{
              fontSize: '0.72rem', padding: '2px 8px',
              background: 'rgba(255,107,0,0.1)', color: 'var(--orange-primary)',
              borderRadius: '20px', border: '1px solid rgba(255,107,0,0.2)'
            }}>
              #{shipment.order.referenceId}
            </span>
          )}
          <span style={{
            fontSize: '0.72rem', padding: '2px 8px',
            background: `${stage.color}20`, color: stage.color,
            borderRadius: '20px', border: `1px solid ${stage.color}30`
          }}>
            {stage.label}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          {shipment.origin || '—'} → {shipment.destination || '—'}
          {shipment.shippingLine && <span style={{ marginLeft: '12px' }}>· {shipment.shippingLine}</span>}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {shipment.vesselEta && (
          <div style={{ fontSize: '0.8rem', color: 'var(--orange-primary)', fontWeight: 600 }}>
            ETA {formatDateUTC(shipment.vesselEta)}
          </div>
        )}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {shipment.contact?.name || shipment.contact?.company || ''}
        </div>
      </div>

      <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </div>
  );
};

const KanbanBoard = ({ shipment }) => {
  const currentIdx = getStageIndex(shipment.status);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
      <div style={{
        display: 'flex',
        gap: '0',
        minWidth: 'max-content',
        alignItems: 'stretch',
      }}>
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <React.Fragment key={stage.id}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '130px',
                flexShrink: 0,
              }}>
                {/* Icon circle */}
                <div style={{
                  width: 52, height: 52,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCompleted
                    ? `${stage.color}30`
                    : isActive
                      ? `${stage.color}25`
                      : 'rgba(255,255,255,0.03)',
                  border: isActive
                    ? `2px solid ${stage.color}`
                    : isCompleted
                      ? `2px solid ${stage.color}80`
                      : '2px solid rgba(255,255,255,0.08)',
                  boxShadow: isActive ? `0 0 16px ${stage.color}50` : 'none',
                  transition: 'all 0.3s',
                  zIndex: 1,
                  position: 'relative',
                }}>
                  <Icon
                    size={20}
                    style={{
                      color: isCompleted || isActive ? stage.color : 'var(--text-muted)',
                      opacity: isPending ? 0.4 : 1,
                    }}
                  />
                  {isCompleted && (
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: stage.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CheckCircle2 size={12} style={{ color: '#000' }} />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div style={{
                  marginTop: '10px',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : isCompleted ? 500 : 400,
                  color: isActive ? stage.color : isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                  textAlign: 'center',
                  opacity: isPending ? 0.5 : 1,
                }}>
                  {stage.label}
                </div>

                {/* Active pill */}
                {isActive && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '0.68rem',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    background: `${stage.color}25`,
                    color: stage.color,
                    border: `1px solid ${stage.color}50`,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    Current
                  </div>
                )}
              </div>

              {/* Connector line */}
              {idx < STAGES.length - 1 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: idx < currentIdx
                    ? `linear-gradient(90deg, ${STAGES[idx].color}80, ${STAGES[idx + 1].color}80)`
                    : 'rgba(255,255,255,0.08)',
                  alignSelf: 'center',
                  marginTop: '-20px',
                  minWidth: '20px',
                  transition: 'all 0.3s',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const ShipmentTracking = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [focusedShipment, setFocusedShipment] = useState(null); // the one shown in Kanban

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await shipmentsApi.getAll();
      setShipments(data);
    } catch (err) {
      console.error('Failed to load shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShipment = (updated) => {
    setShipments(prev => prev.map(s => s.id === updated.id ? updated : s));
    if (focusedShipment?.id === updated.id) setFocusedShipment(updated);
  };

  const handleDeleteShipment = (id) => {
    setShipments(prev => prev.filter(s => s.id !== id));
    if (focusedShipment?.id === id) setFocusedShipment(null);
    setDetailOpen(false);
  };

  // Search filter
  const query = searchQuery.trim().toLowerCase();
  const filteredShipments = query
    ? shipments.filter(s =>
        (s.containerNumber && s.containerNumber.toLowerCase().includes(query)) ||
        (s.order?.referenceId && s.order.referenceId.toLowerCase().includes(query)) ||
        (s.bolNumber && s.bolNumber.toLowerCase().includes(query)) ||
        (s.vesselName && s.vesselName.toLowerCase().includes(query))
      )
    : shipments;

  const handleCardClick = (shipment) => {
    setFocusedShipment(shipment);
  };

  const openDetail = (shipment) => {
    setSelectedShipment(shipment);
    setDetailOpen(true);
  };

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} className="text-orange" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

      {/* Header */}
      <div className="flex-between">
        <div className="page-header">
          <div className="page-icon-box">
            <Navigation size={24} className="text-orange" />
          </div>
          <div>
            <h1 className="page-title">Shipment Tracking</h1>
            <p className="page-subtitle">Track container status by container number or reference ID.</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '600px' }}>
        <Search
          size={18}
          style={{
            position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none'
          }}
        />
        <input
          type="text"
          className="ui-input"
          placeholder="Search by container number, reference ID, BOL or vessel name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            paddingLeft: '46px',
            paddingRight: searchQuery ? '40px' : '16px',
            fontSize: '0.95rem',
            height: '48px',
            border: '1px solid var(--border-glass-light)',
            background: 'rgba(255,255,255,0.04)',
          }}
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setFocusedShipment(null); }}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Focused Shipment Kanban */}
      {focusedShipment && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(255,107,0,0.3)' }}>
          {/* Shipment info row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {focusedShipment.containerNumber || 'No Container'}
                  </span>
                  {focusedShipment.order?.referenceId && (
                    <span style={{
                      fontSize: '0.78rem', padding: '3px 10px',
                      background: 'rgba(255,107,0,0.1)', color: 'var(--orange-primary)',
                      borderRadius: '20px', border: '1px solid rgba(255,107,0,0.25)', fontWeight: 600
                    }}>
                      Ref #{focusedShipment.order.referenceId}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {focusedShipment.shippingLine && <span><Ship size={12} style={{ display: 'inline', marginRight: 4 }} />{focusedShipment.shippingLine}</span>}
                  {focusedShipment.vesselName && <span><Anchor size={12} style={{ display: 'inline', marginRight: 4 }} />{focusedShipment.vesselName}</span>}
                  {focusedShipment.origin && <span><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />{focusedShipment.origin} → {focusedShipment.destination}</span>}
                  {focusedShipment.vesselEta && <span><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />ETA: {formatDateUTC(focusedShipment.vesselEta)}</span>}
                  {focusedShipment.contact?.name && <span><User size={12} style={{ display: 'inline', marginRight: 4 }} />{focusedShipment.contact.name}</span>}
                  {focusedShipment.reeferTempSet && <span><Thermometer size={12} style={{ display: 'inline', marginRight: 4 }} />{focusedShipment.reeferTempSet}°C</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-glass"
                onClick={() => openDetail(focusedShipment)}
                style={{ fontSize: '0.82rem' }}
              >
                <FileText size={14} /> View Details
              </button>
              <button
                onClick={() => setFocusedShipment(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Kanban Progress */}
          <KanbanBoard shipment={focusedShipment} />
        </div>
      )}

      {/* Shipments List */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {query
              ? `${filteredShipments.length} result${filteredShipments.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : `All shipments (${shipments.length})`
            }
          </span>
          {filteredShipments.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {STAGES.map(stage => {
                const count = shipments.filter(s => s.status === stage.id).length;
                if (!count) return null;
                return (
                  <span key={stage.id} style={{
                    fontSize: '0.72rem', padding: '2px 8px',
                    background: `${stage.color}15`, color: stage.color,
                    borderRadius: '20px', border: `1px solid ${stage.color}30`,
                    cursor: 'pointer'
                  }}
                    onClick={() => setSearchQuery(stage.id)}
                  >
                    {stage.label} · {count}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {filteredShipments.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              color: 'var(--text-muted)', fontSize: '0.9rem'
            }}>
              <AlertCircle size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <div>{query ? `No shipment found for "${searchQuery}"` : 'No shipments yet.'}</div>
              <div style={{ fontSize: '0.8rem', marginTop: '6px', opacity: 0.6 }}>
                {query ? 'Try container number, reference ID, or vessel name.' : ''}
              </div>
            </div>
          ) : (
            filteredShipments.map(shipment => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                onClick={handleCardClick}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detailOpen && selectedShipment && (
        <ShipmentDetailModal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          shipment={selectedShipment}
          onUpdate={handleUpdateShipment}
          onDelete={handleDeleteShipment}
        />
      )}
    </div>
  );
};

export default ShipmentTracking;
