import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, Mail, DollarSign, Globe, Calendar, FileText, CheckCircle2, Pencil, Save, X, Ship, Plus, MapPin, ShoppingBag } from 'lucide-react';
import CampaignSettings from './CampaignSettings';
import AddShipmentModal from './AddShipmentModal';
import AddOrderModal from './AddOrderModal';
import { contactsApi, campaignApi, shipmentsApi, ordersApi } from '../services/api';

const ContactDetail = ({ contact, onBack, onPromote, onRefresh }) => {
  const [note, setNote] = useState('');
  const [notesList, setNotesList] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [localContact, setLocalContact] = useState(contact);
  const [callResult, setCallResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [customerShipments, setCustomerShipments] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  useEffect(() => {
    setLocalContact(contact);
    loadNotes();
    loadShipments();
    loadOrders();
  }, [contact]);

  const loadOrders = async () => {
    try {
      const orders = await ordersApi.getByContact(contact.id);
      setCustomerOrders(orders);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const handleAddOrder = async (orderData) => {
    try {
      await ordersApi.create(orderData);
      await loadOrders();
    } catch (err) {
      console.error('Failed to add order:', err);
    }
  };

  const loadShipments = async () => {
    try {
      const shipments = await shipmentsApi.getByContact(contact.id);
      setCustomerShipments(shipments);
    } catch (err) {
      console.error('Failed to load shipments:', err);
    }
  };

  const handleAddShipment = async (shipmentData) => {
    try {
      await shipmentsApi.create(shipmentData);
      await loadShipments();
    } catch (err) {
      console.error('Failed to add shipment:', err);
    }
  };

  const loadNotes = async () => {
    try {
      const notes = await contactsApi.getNotes(contact.id);
      setNotesList(notes);
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await contactsApi.addNote(contact.id, note);
      setNote('');
      await loadNotes();
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const startEditing = () => {
    setEditData({
      name: localContact.name,
      phone: localContact.phone,
      email: localContact.email || '',
      company: localContact.company || '',
      department: localContact.department || '',
      language: localContact.language || 'English',
      credit: localContact.credit || 0
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  const saveEditing = async () => {
    try {
      const updated = await contactsApi.update(contact.id, editData);
      setLocalContact(updated);
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const startCampaign = async (settings) => {
    setIsRunning(true);
    setLocalContact(prev => ({ ...prev, status: 'Calling / Emailing' }));
    try {
      const result = await campaignApi.startCall(contact.id, settings);
      setCallResult(result);
      const pollInterval = setInterval(async () => {
        try {
          const updated = await contactsApi.getOne(contact.id);
          setLocalContact(updated);
          if (updated.status !== 'Calling / Emailing') {
            clearInterval(pollInterval);
            setIsRunning(false);
            await loadNotes();
            if (onRefresh) onRefresh();
          }
        } catch (err) {
          console.error('Poll failed:', err);
        }
      }, 2000);
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsRunning(false);
      }, 60000);
    } catch (err) {
      console.error('Campaign failed:', err);
      setIsRunning(false);
      setLocalContact(prev => ({ ...prev, status: contact.status }));
    }
  };

  const renderField = (label, field, icon, type = 'text') => {
    const IconComponent = icon;
    if (isEditing) {
      return (
        <div className="info-block">
          <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
          <div className="mt-2">
            {field === 'language' ? (
              <select
                className="ui-select"
                value={editData[field]}
                onChange={(e) => handleEditChange(field, e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-panel)', border: '1px solid var(--orange-primary)', borderRadius: 'var(--radius-sm)', color: 'white', fontFamily: 'var(--font-main)', outline: 'none' }}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
              </select>
            ) : (
              <input
                type={type}
                className="ui-input"
                value={editData[field]}
                onChange={(e) => handleEditChange(field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--orange-primary)' }}
              />
            )}
          </div>
        </div>
      );
    }

    // Read-only view
    if (field === 'credit') {
      return (
        <div className="info-block">
          <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
          <div className="flex-center gap-2 mt-2">
            {localContact.credit > 0 ? (
              <div className="credit-badge positive" style={{ margin: 0 }}>
                <DollarSign size={14} />
                {localContact.credit.toLocaleString('en-US')}
              </div>
            ) : (
              <span className="text-muted">Not Approved</span>
            )}
          </div>
        </div>
      );
    }

    const value = localContact[field] || 'N/A';
    return (
      <div className="info-block">
        <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
        <div className="flex-center gap-2 mt-2">
          {icon && <IconComponent size={16} className="text-orange" />}
          {!icon ? <div style={{ color: 'var(--text-primary)' }}>{value}</div> : value}
        </div>
      </div>
    );
  };

  return (
    <div className="contact-detail animate-slide-up" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="icon-btn" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem', background: 'linear-gradient(135deg, var(--bg-panel), rgba(255,122,0,0.2))' }}>
              <User size={24} className="text-orange" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem' }}>{localContact.name}</h2>
              <div className="flex-center gap-2 mt-2">
                <span className="status-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {localContact.type}
                </span>
                <div className="status-pill status-calling" style={{ background: 'transparent', padding: 0, border: 'none' }}>
                  <span>{localContact.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-center gap-2">
          {localContact.type === 'Lead' && (
            <button 
              className="btn btn-primary"
              onClick={() => {
                onPromote(localContact.id);
                onBack();
              }}
            >
              <CheckCircle2 size={18} />
              Promote to Customer
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-grid" style={{ flex: 1 }}>
        
        {/* Left Col: Info & Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Contact Information</h3>
              {isEditing ? (
                <div className="flex-center gap-2">
                  <button className="btn btn-glass" onClick={cancelEditing} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                    <X size={14} /> Cancel
                  </button>
                  <button className="btn btn-primary" onClick={saveEditing} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                    <Save size={14} /> Save
                  </button>
                </div>
              ) : (
                <button className="btn btn-glass" onClick={startEditing} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {renderField('PHONE', 'phone', Phone)}
              {renderField('EMAIL', 'email', Mail)}
              {renderField('LANGUAGE', 'language', Globe)}
              {renderField('COMPANY', 'company', null)}
              {renderField('DEPARTMENT', 'department', null)}
              {renderField('CAPITAL BOX CREDIT', 'credit', null, 'number')}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} className="text-orange" /> Activity & Notes
            </h3>
            
            <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input 
                type="text" 
                className="ui-input" 
                placeholder="Log a call, meeting, or finding..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button type="submit" className="btn btn-glass" style={{ whiteSpace: 'nowrap' }}>Add Note</button>
            </form>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notesList.length === 0 ? (
                <div className="text-muted" style={{ textAlign: 'center', margin: 'auto' }}>No notes yet.</div>
              ) : (
                notesList.map((n) => (
                  <div key={n.id} style={{ 
                    padding: '16px', 
                    background: n.isSystem ? 'rgba(174, 234, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid',
                    borderColor: n.isSystem ? 'rgba(174, 234, 0, 0.1)' : 'var(--border-glass-light)',
                    borderRadius: 'var(--radius-sm)' 
                  }}>
                    <div style={{ fontSize: '0.95rem', color: n.isSystem ? 'var(--green-accent)' : 'white' }}>{n.text}</div>
                    <div className="text-muted mt-2" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {new Date(n.createdAt).toLocaleString()} {n.isSystem && '• System generated'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Customer Shipments */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Ship size={18} className="text-orange" /> Shipments
              </h3>
              <button className="btn btn-text-action" style={{ color: 'var(--orange-primary)' }} onClick={() => setIsShipmentModalOpen(true)}>
                <Plus size={14} /> Add
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {customerShipments.length === 0 ? (
                <div className="text-muted" style={{ textAlign: 'center', margin: 'auto' }}>No shipments recorded for this customer.</div>
              ) : (
                customerShipments.map((s) => (
                  <div key={s.id} className="shipment-card" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{s.label}</div>
                        <div className="text-muted mt-1" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {s.origin ? `${s.origin} → ` : ''}{s.destination}
                        </div>
                      </div>
                      <span className="status-pill" style={{ 
                        fontSize: '0.75rem', 
                        padding: '2px 8px',
                        background: s.status === 'Arrived' ? 'rgba(174, 234, 0, 0.1)' : 'rgba(255, 122, 0, 0.1)',
                        color: s.status === 'Arrived' ? 'var(--green-accent)' : 'var(--orange-primary)'
                      }}>
                        {s.status}
                      </span>
                    </div>
                    {s.vesselName && (
                      <div className="text-muted mt-2" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Vessel: {s.vesselName}
                      </div>
                    )}
                  </div>
                ) )
              )}
            </div>
          </div>

          {/* Customer Orders */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <ShoppingBag size={18} className="text-orange" /> Orders
              </h3>
              <button className="btn btn-text-action" style={{ color: 'var(--orange-primary)' }} onClick={() => setIsOrderModalOpen(true)}>
                <Plus size={14} /> Add
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {customerOrders.length === 0 ? (
                <div className="text-muted" style={{ textAlign: 'center', margin: 'auto' }}>No orders recorded for this customer.</div>
              ) : (
                customerOrders.map((o) => (
                  <div key={o.id} className="shipment-card" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{o.product} - {o.variety}</div>
                        <div className="text-muted mt-1" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Ref: {o.referenceId} | Week: {o.week}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--orange-primary)' }}>{o.boxQuantity} Boxes</div>
                        <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>{o.boxType}</div>
                      </div>
                    </div>
                    <div className="text-muted mt-2" style={{ fontSize: '0.8rem' }}>
                      Shipper: {o.shipper} | Recv: {o.receiver}
                    </div>
                  </div>
                ) )
              )}
            </div>
          </div>

        </div>

        {/* Right Col: AI Campaign specific to this contact */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <CampaignSettings 
            onStart={startCampaign} 
            isRunning={isRunning}
            contactCount={1}
            isDetailView={true}
          />
        </div>
        
      </div>
      <AddShipmentModal 
        isOpen={isShipmentModalOpen} 
        onClose={() => setIsShipmentModalOpen(false)} 
        onAdd={handleAddShipment} 
        customers={[localContact]} 
      />
      <AddOrderModal 
        isOpen={isOrderModalOpen} 
        onClose={() => setIsOrderModalOpen(false)} 
        onAdd={handleAddOrder} 
        customers={[localContact]} 
      />
    </div>
  );
};

export default ContactDetail;
