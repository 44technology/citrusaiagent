import React, { useState, useEffect } from 'react';
import { X, Ship, MapPin, Calendar, Anchor, Hash, FileText, Trash2, Save, Edit3, Clock, CheckCircle2, Navigation, Package } from 'lucide-react';
import { shipmentsApi } from '../services/api';
import { formatDateUTC, formatFullDateUTC } from '../utils/dateUtils';

const ShipmentDetailModal = ({ isOpen, onClose, shipment, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (shipment) {
      setEditData({
        label: shipment.label,
        origin: shipment.origin || '',
        destination: shipment.destination || '',
        vesselName: shipment.vesselName || '',
        containerNumber: shipment.containerNumber || '',
        bolNumber: shipment.bolNumber || '',
        vesselEta: shipment.vesselEta ? shipment.vesselEta.split('T')[0] : '',
        vesselDeparture: shipment.vesselDeparture ? shipment.vesselDeparture.split('T')[0] : '',
        vesselArrival: shipment.vesselArrival ? shipment.vesselArrival.split('T')[0] : '',
        shippingLine: shipment.shippingLine || '',
        status: shipment.status,
        notes: shipment.notes || ''
      });
      setIsEditing(false);
    }
  }, [shipment]);

  if (!isOpen || !shipment || !editData) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      // NOTE: We no longer auto-regenerate the label here to respect manual edits.
      const updated = await shipmentsApi.update(shipment.id, editData);
      onUpdate(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update shipment:', err);
      alert('Failed to save changes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this shipment?')) return;
    try {
      await shipmentsApi.delete(shipment.id);
      onDelete(shipment.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete shipment:', err);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return <Clock size={16} />;
      case 'Departed': return <Navigation size={16} />;
      case 'In Transit': return <Anchor size={16} />;
      case 'Arrived': return <CheckCircle2 size={16} />;
      default: return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%' }}>
        <div className="modal-header">
          <div className="flex-center gap-2">
            <Ship size={20} className="text-orange" />
            <h3 style={{ margin: 0 }}>Shipment Details</h3>
          </div>
          <div className="flex-center gap-2">
            {isEditing ? (
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading}>
                <Save size={16} /> Save
              </button>
            ) : (
              <button className="btn btn-glass btn-sm" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} /> Edit
              </button>
            )}
            <button className="icon-btn-small" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          
          {/* Status Badge Select (Always accessible if editing) */}
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex-center gap-2">
              <span className="shipment-detail-label">Current Status:</span>
              {isEditing ? (
                <select 
                  className="ui-input" 
                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                  value={editData.status}
                  onChange={(e) => setEditData(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="Pending">Pending</option>
                  <option value="Departed">Departed</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Arrived">Arrived</option>
                </select>
              ) : (
                <span className={`status-pill status-${shipment.status.toLowerCase().replace(' ', '-')}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getStatusIcon(shipment.status)} {shipment.status}
                </span>
              )}
            </div>
            {!isEditing && JSON.parse(localStorage.getItem('citrus_user') || '{}').role === 'super admin' && (
               <button className="btn btn-text-action" style={{ color: '#FF6B6B', fontSize: '0.85rem' }} onClick={handleDelete}>
                 <Trash2 size={14} /> Delete Shipment
               </button>
            )}
          </div>

          <div className="shipment-detail-grid">
            {/* Route Info */}
            <div className="shipment-detail-section" style={{ gridColumn: '1 / -1' }}>
              <div className="shipment-detail-section-title"><MapPin size={16} /> Route & Customer</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                
                {/* Manual Label Edit */}
                <div className="shipment-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="shipment-detail-label">Shipment Label (Display Name)</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      className="ui-input" 
                      value={editData.label} 
                      onChange={(e) => setEditData(p => ({ ...p, label: e.target.value }))} 
                      placeholder="e.g. 24/03/2026 Morocco - Newark" 
                    />
                  ) : (
                    <span className="shipment-detail-value" style={{ fontWeight: 700, color: 'var(--orange-primary)' }}>{shipment.label}</span>
                  )}
                </div>

                <div className="shipment-detail-item">
                  <span className="shipment-detail-label">Origin</span>
                  {isEditing ? (
                    <input type="text" className="ui-input" value={editData.origin} onChange={(e) => setEditData(p => ({ ...p, origin: e.target.value }))} />
                  ) : (
                    <span className="shipment-detail-value">{shipment.origin || '—'}</span>
                  )}
                </div>
                <div className="shipment-detail-item">
                  <span className="shipment-detail-label">Destination</span>
                  {isEditing ? (
                    <input type="text" className="ui-input" value={editData.destination} onChange={(e) => setEditData(p => ({ ...p, destination: e.target.value }))} />
                  ) : (
                    <span className="shipment-detail-value">{shipment.destination}</span>
                  )}
                </div>
                <div className="shipment-detail-item" style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <span className="shipment-detail-label">Customer</span>
                  <span className="shipment-detail-value">{shipment.contact?.name} — {shipment.contact?.company}</span>
                </div>
              </div>
            </div>

            {/* Vessel Info */}
            <div className="shipment-detail-section">
              <div className="shipment-detail-section-title"><Anchor size={16} /> Vessel Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="shipment-detail-item">
                  <span className="shipment-detail-label">Vessel Name</span>
                  {isEditing ? (
                    <input type="text" className="ui-input" value={editData.vesselName} onChange={(e) => setEditData(p => ({ ...p, vesselName: e.target.value }))} />
                  ) : (
                    <span className="shipment-detail-value">{shipment.vesselName || '—'}</span>
                  )}
                </div>
                <div className="shipment-detail-item">
                  <span className="shipment-detail-label">Shipping Line</span>
                  {isEditing ? (
                    <input type="text" className="ui-input" value={editData.shippingLine} onChange={(e) => setEditData(p => ({ ...p, shippingLine: e.target.value }))} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="shipment-detail-value">{shipment.shippingLine || '—'}</span>
                      {shipment.shippingLine && (shipment.shippingLine.toLowerCase().includes('maersk') || shipment.shippingLine.toLowerCase().includes('msc')) && (
                        <a 
                          href={shipment.shippingLine.toLowerCase().includes('maersk') ? 'https://www.maersk.com/tracking/' : 'https://www.msc.com/en/track-a-shipment'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-glass btn-sm"
                          style={{ fontSize: '0.7rem', padding: '4px 8px', color: 'var(--orange-primary)' }}
                        >
                          <Navigation size={12} /> Track
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="shipment-detail-item">
                  <span className="shipment-detail-label">Container Number</span>
                  {isEditing ? (
                    <input type="text" className="ui-input" value={editData.containerNumber} onChange={(e) => setEditData(p => ({ ...p, containerNumber: e.target.value }))} />
                  ) : (
                    <span className="shipment-detail-value">{shipment.containerNumber || '—'}</span>
                  )}
                </div>
                <div className="shipment-detail-item">
                  <span className="shipment-detail-label">BOL Number</span>
                  {isEditing ? (
                    <input type="text" className="ui-input" value={editData.bolNumber} onChange={(e) => setEditData(p => ({ ...p, bolNumber: e.target.value }))} />
                  ) : (
                    <span className="shipment-detail-value">{shipment.bolNumber || '—'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="shipment-detail-section">
              <div className="shipment-detail-section-title"><Calendar size={16} /> Schedule</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="shipment-detail-item">
                  <span className="shipment-detail-label">Vessel ETA</span>
                  {isEditing ? (
                    <input type="date" className="ui-input" value={editData.vesselEta} onChange={(e) => setEditData(p => ({ ...p, vesselEta: e.target.value }))} />
                  ) : (
                    <span className="shipment-detail-value" style={{ color: 'var(--orange-primary)', fontWeight: 700 }}>
                      {formatFullDateUTC(shipment.vesselEta)}
                    </span>
                  )}
                </div>
                <div className="shipment-detail-item">
                  <span className="shipment-detail-label">Departure Date</span>
                  {isEditing ? (
                    <input type="date" className="ui-input" value={editData.vesselDeparture} onChange={(e) => setEditData(p => ({ ...p, vesselDeparture: e.target.value }))} />
                  ) : (
                    <span className="shipment-detail-value">{formatFullDateUTC(shipment.vesselDeparture)}</span>
                  )}
                </div>
                <div className="shipment-detail-item">
                  <span className="shipment-detail-label">Actual Arrival</span>
                  {isEditing ? (
                    <input type="date" className="ui-input" value={editData.vesselArrival} onChange={(e) => setEditData(p => ({ ...p, vesselArrival: e.target.value }))} />
                  ) : (
                    <span className="shipment-detail-value">{formatFullDateUTC(shipment.vesselArrival)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="shipment-detail-section" style={{ gridColumn: '1 / -1' }}>
              <div className="shipment-detail-section-title"><FileText size={16} /> Notes</div>
              {isEditing ? (
                <textarea 
                  className="ui-input" 
                  style={{ width: '100%', minHeight: '80px', padding: '12px' }}
                  value={editData.notes}
                  onChange={(e) => setEditData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional shipping notes, instructions, or updates..."
                />
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', minHeight: '60px' }}>
                  {shipment.notes || 'No additional notes provided.'}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetailModal;
