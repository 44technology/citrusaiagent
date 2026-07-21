import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, Mail, DollarSign, Globe, Calendar, FileText, CheckCircle2, Pencil, Save, X, Ship, Plus, MapPin, ShoppingBag, Users, Trash2, Check, Layers, Edit3, Loader2 } from 'lucide-react';
import CampaignSettings from './CampaignSettings';
import AddShipmentModal from './AddShipmentModal';
import OrderModal from './OrderModal';
import { contactsApi, campaignApi, shipmentsApi, ordersApi, customerProgramsApi } from '../services/api';
import { PRODUCTS } from '../constants/products';

const CATEGORY_OPTIONS = ['Cat 1', 'Cat 1.5', 'Cat 2'];


const ContactDetail = ({ contact, onBack, onPromote, onRefresh }) => {
  const isSuperAdmin = (() => { try { return JSON.parse(localStorage.getItem('citrus_user') || '{}').role === 'super admin'; } catch { return false; } })();
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [persons, setPersons] = useState([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [personForm, setPersonForm] = useState({ firstName: '', lastName: '', title: '', email: '', phone: '', linkedinUrl: '' });
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [editPersonForm, setEditPersonForm] = useState({});
  const [savingPerson, setSavingPerson] = useState(false);
  const [programs, setPrograms] = useState(localContact.programs || []);
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState(null);
  const [programForm, setProgramForm] = useState({});
  const [savingProgram, setSavingProgram] = useState(false);

  useEffect(() => {
    setLocalContact(contact);
    loadNotes();
    loadShipments();
    loadOrders();
    loadPersons();
    loadPrograms();
  }, [contact]);

  const loadPrograms = async () => {
    try {
      const data = await customerProgramsApi.getByContact(contact.id);
      setPrograms(data);
      setLocalContact(prev => ({ ...prev, programs: data }));
    } catch (e) { console.error(e); }
  };

  const startAddProgram = () => {
    setProgramForm({
      product: 'Mandarin', variety: '', origin: '', grower: '', incoterm: 'FOB',
      packType: '', category: '', startWeek: '', totalWeeks: '', containersPerWeek: '',
      status: 'Active', startDate: '', notes: '',
    });
    setEditingProgramId(null);
    setShowAddProgram(true);
  };

  const startEditProgram = (p) => {
    setProgramForm({
      product: p.product || 'Mandarin', variety: p.variety || '', origin: p.origin || '',
      grower: p.grower || '', incoterm: p.incoterm || 'FOB',
      packType: p.packType || '', category: p.category || '',
      startWeek: p.startWeek ?? '', totalWeeks: p.totalWeeks ?? '', containersPerWeek: p.containersPerWeek ?? '',
      status: p.status || 'Active',
      startDate: p.startDate ? p.startDate.split('T')[0] : '', notes: p.notes || '',
    });
    setEditingProgramId(p.id);
    setShowAddProgram(true);
  };

  const handleSaveProgram = async () => {
    if (!programForm.product) { alert('Product is required'); return; }
    setSavingProgram(true);
    try {
      if (editingProgramId) {
        await customerProgramsApi.update(editingProgramId, programForm);
      } else {
        await customerProgramsApi.create({ ...programForm, contactId: contact.id });
      }
      setShowAddProgram(false);
      setEditingProgramId(null);
      await loadPrograms();
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSavingProgram(false); }
  };

  const handleCompleteProgram = async (p) => {
    try {
      await customerProgramsApi.update(p.id, { status: 'Active' === p.status ? 'Completed' : 'Active' });
      await loadPrograms();
    } catch (e) { alert('Update failed: ' + e.message); }
  };

  const handleDeleteProgram = async (id) => {
    if (!window.confirm('Delete this program?')) return;
    try {
      await customerProgramsApi.delete(id);
      await loadPrograms();
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  const loadPersons = async () => {
    try {
      const data = await contactsApi.getPersons(contact.id);
      setPersons(data);
    } catch (e) { console.error(e); }
  };

  const handleAddPerson = async () => {
    if (!personForm.name.trim()) return;
    setSavingPerson(true);
    try {
      const p = await contactsApi.createPerson(contact.id, personForm);
      setPersons(prev => [...prev, p]);
      setPersonForm({ firstName: '', lastName: '', title: '', email: '', phone: '', linkedinUrl: '' });
      setShowAddPerson(false);
    } catch (e) { console.error(e); }
    finally { setSavingPerson(false); }
  };

  const handleSavePerson = async (pid) => {
    setSavingPerson(true);
    try {
      const updated = await contactsApi.updatePerson(contact.id, pid, editPersonForm);
      setPersons(prev => prev.map(p => p.id === pid ? updated : p));
      setEditingPersonId(null);
    } catch (e) { console.error(e); }
    finally { setSavingPerson(false); }
  };

  const handleDeletePerson = async (pid) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await contactsApi.deletePerson(contact.id, pid);
      setPersons(prev => prev.filter(p => p.id !== pid));
    } catch (e) { console.error(e); }
  };

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

  const handleEditOrder = async (id, orderData) => {
    try {
      await ordersApi.update(id, orderData);
      await loadOrders();
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const openAddOrderModal = () => {
    setSelectedOrder(null);
    setIsOrderModalOpen(true);
  };

  const openEditOrderModal = (order) => {
    // Inject contact info for the modal
    setSelectedOrder({ ...order, contact: localContact });
    setIsOrderModalOpen(true);
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
      city: localContact.city || '',
      state: localContact.state || '',
      zip: localContact.zip || '',
      country: localContact.country || '',
      companyPhone: localContact.companyPhone || '',
      website: localContact.website || '',
      classifications: localContact.classifications || [],
      commodities: localContact.commodities || [],
      language: localContact.language || 'English',
      credit: localContact.credit || 0,
      lineOfCredit: localContact.lineOfCredit ?? '',
      openBalance:  localContact.openBalance  ?? '',
      termDays:     localContact.termDays     ?? '',
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
                {(localContact.programs || []).filter(p => p.status === 'Active').map(p => (
                  <span key={p.id} style={{
                    padding: '3px 10px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 700,
                    background: { FOB: 'rgba(56,189,248,0.15)', CIF: 'rgba(168,85,247,0.15)', DDP: 'rgba(34,197,94,0.15)' }[p.incoterm] || 'rgba(255,255,255,0.07)',
                    color: { FOB: '#38bdf8', CIF: '#a855f7', DDP: '#22c55e' }[p.incoterm] || 'var(--text-muted)',
                    border: `1px solid ${({ FOB: 'rgba(56,189,248,0.35)', CIF: 'rgba(168,85,247,0.35)', DDP: 'rgba(34,197,94,0.35)' }[p.incoterm] || 'rgba(255,255,255,0.15)')}`,
                  }}>
                    {[p.product, p.origin, p.incoterm].filter(Boolean).join(' · ')}
                  </span>
                ))}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {isSuperAdmin && renderField('COMPANY NAME', 'name', User)}
              {renderField('COMPANY PHONE', 'companyPhone', Phone)}
              {renderField('EMAIL', 'email', Mail)}
              {renderField('WEBSITE', 'website', Globe)}
              {renderField('CAPITAL BOX CREDIT', 'credit', null, 'number')}
              {renderField('CITY', 'city', null)}
              {renderField('STATE', 'state', null)}
              {renderField('ZIP CODE', 'zip', null)}
              {renderField('COUNTRY', 'country', null)}
            </div>
            {/* Shipment Stats */}
            {customerShipments.length > 0 && (() => {
              const ADV = [
                { label: 'Pending',      color: '#f59e0b', count: customerShipments.filter(s => (s.advancePaymentStatus || 'Pending') === 'Pending').length },
                { label: 'Requested',    color: '#3b82f6', count: customerShipments.filter(s => s.advancePaymentStatus === 'Requested').length },
                { label: 'Paid',         color: '#22c55e', count: customerShipments.filter(s => s.advancePaymentStatus === 'Paid').length },
                { label: 'Not Required', color: '#94a3b8', count: customerShipments.filter(s => s.advancePaymentStatus === 'Not Required').length },
              ];
              return (
                <div style={{ marginTop: 4, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--orange-primary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                    Advance Payments · {customerShipments.length} Shipments
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {ADV.map(st => (
                      <div key={st.label} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: `${st.color}10`, border: `1px solid ${st.color}25` }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.count}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: st.color, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{st.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Financial */}
            <div style={{ marginTop: 4, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--orange-primary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                Financial
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {/* Line of Credit */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>LINE OF CREDIT</div>
                  {isEditing ? (
                    <input className="ui-input" type="number" step="0.01" placeholder="0.00"
                      value={editData.lineOfCredit}
                      onChange={e => handleEditChange('lineOfCredit', e.target.value)}
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: localContact.lineOfCredit ? '#22c55e' : 'var(--text-muted)' }}>
                      {localContact.lineOfCredit != null ? `$${Number(localContact.lineOfCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                    </div>
                  )}
                </div>
                {/* Open Balance */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>OPEN BALANCE</div>
                  {isEditing ? (
                    <input className="ui-input" type="number" step="0.01" placeholder="0.00"
                      value={editData.openBalance}
                      onChange={e => handleEditChange('openBalance', e.target.value)}
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: localContact.openBalance > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                      {localContact.openBalance != null ? `$${Number(localContact.openBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                    </div>
                  )}
                </div>
                {/* Term Days */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>TERM DAYS</div>
                  {isEditing ? (
                    <input className="ui-input" type="number" placeholder="e.g. 30"
                      value={editData.termDays}
                      onChange={e => handleEditChange('termDays', e.target.value)}
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {localContact.termDays != null ? `${localContact.termDays} days` : '—'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Classifications & Commodities */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: 4 }}>
              {['classifications', 'commodities'].map(field => {
                const arr = isEditing ? (editData[field] || []) : (localContact[field] || []);
                const label = field === 'classifications' ? 'CLASSIFICATIONS' : 'COMMODITIES';
                return (
                  <div key={field} className="info-block">
                    <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
                    {isEditing ? (
                      <input className="ui-input" style={{ marginTop: 8 }}
                        placeholder="Comma separated"
                        value={arr.join(', ')}
                        onChange={e => handleEditChange(field, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                        {arr.length ? arr.map((v, i) => (
                          <span key={i} style={{ background: 'rgba(255,107,0,0.12)', color: 'var(--orange-primary)', borderRadius: 5, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>{v}</span>
                        )) : <span className="text-muted" style={{ fontSize: '0.82rem' }}>—</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trading Programs */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} className="text-orange" /> Trading Programs
              </h3>
              <button className="btn btn-glass" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={startAddProgram}>
                <Plus size={13} /> Add Program
              </button>
            </div>

            {programs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No programs yet. Click <strong>+ Add Program</strong> to record what this customer is currently buying.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border-glass-light)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {['Product', 'Variety', 'Origin', 'Grower', 'Incoterm', 'Category', 'Pack', 'Schedule', 'Started', 'Ended', 'Status', 'Notes', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {programs.map((p, i) => (
                      <tr key={p.id} style={{ borderTop: '1px solid var(--border-glass-light)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{p.product}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{p.variety || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>{p.origin || '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{p.grower || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {p.incoterm ? (
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                              background: { FOB: 'rgba(56,189,248,0.15)', CIF: 'rgba(168,85,247,0.15)', DDP: 'rgba(34,197,94,0.15)' }[p.incoterm] || 'rgba(255,255,255,0.07)',
                              color: { FOB: '#38bdf8', CIF: '#a855f7', DDP: '#22c55e' }[p.incoterm] || 'var(--text-muted)',
                            }}>{p.incoterm}</span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {p.category ? (
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(255,107,0,0.12)', color: 'var(--orange-primary)' }}>{p.category}</span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.packType || '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                          {[
                            p.startWeek ? `W${p.startWeek}` : null,
                            p.totalWeeks ? `${p.totalWeeks} wks` : null,
                            p.containersPerWeek ? `${p.containersPerWeek}/wk` : null,
                          ].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB') : '—'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <button
                            onClick={() => handleCompleteProgram(p)}
                            style={{
                              border: 'none', cursor: 'pointer', padding: '2px 10px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
                              background: p.status === 'Active' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                              color: p.status === 'Active' ? '#22c55e' : 'var(--text-muted)',
                            }}
                            title="Click to toggle Active / Completed"
                          >
                            {p.status}
                          </button>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => startEditProgram(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, marginRight: 6 }}>
                            <Edit3 size={13} />
                          </button>
                          {isSuperAdmin && (
                            <button onClick={() => handleDeleteProgram(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', padding: 2 }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add / Edit Program modal */}
            {showAddProgram && (
              <div className="modal-overlay" onClick={() => setShowAddProgram(false)}>
                <div className="modal-content glass-panel" style={{ maxWidth: 480, padding: 0 }} onClick={e => e.stopPropagation()}>
                  <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{editingProgramId ? 'Edit Program' : 'Add Program'}</h3>
                    <button className="icon-btn" onClick={() => setShowAddProgram(false)}><X size={18} /></button>
                  </div>
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PRODUCT *</label>
                        <select className="ui-select" value={programForm.product} onChange={e => setProgramForm(p => ({ ...p, product: e.target.value }))}>
                          {Object.keys(PRODUCTS).map(prod => <option key={prod} value={prod}>{prod}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>VARIETY</label>
                        <select className="ui-select" value={programForm.variety} onChange={e => setProgramForm(p => ({ ...p, variety: e.target.value }))}>
                          <option value="">— Select —</option>
                          {(PRODUCTS[programForm.product] || []).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>ORIGIN</label>
                        <input className="ui-input" placeholder="e.g. Morocco, Peru" value={programForm.origin} onChange={e => setProgramForm(p => ({ ...p, origin: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>GROWER (OPTIONAL)</label>
                        <input className="ui-input" placeholder="Grower / supplier name" value={programForm.grower} onChange={e => setProgramForm(p => ({ ...p, grower: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>INCOTERM</label>
                        <select className="ui-select" value={programForm.incoterm} onChange={e => setProgramForm(p => ({ ...p, incoterm: e.target.value }))}>
                          <option value="">— Select —</option>
                          <option value="FOB">FOB</option>
                          <option value="CIF">CIF</option>
                          <option value="DDP">DDP</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>STATUS</label>
                        <select className="ui-select" value={programForm.status} onChange={e => setProgramForm(p => ({ ...p, status: e.target.value }))}>
                          <option value="Active">Active</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>CATEGORY</label>
                        <select className="ui-select" value={programForm.category} onChange={e => setProgramForm(p => ({ ...p, category: e.target.value }))}>
                          <option value="">— Select —</option>
                          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PACK</label>
                        <input className="ui-input" placeholder="e.g. 18 KG" value={programForm.packType} onChange={e => setProgramForm(p => ({ ...p, packType: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>WEEK (START)</label>
                        <input type="number" className="ui-input" placeholder="e.g. 22" min="1" max="53" value={programForm.startWeek} onChange={e => setProgramForm(p => ({ ...p, startWeek: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>TOTAL WEEKS</label>
                        <input type="number" className="ui-input" placeholder="e.g. 12" min="1" value={programForm.totalWeeks} onChange={e => setProgramForm(p => ({ ...p, totalWeeks: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>CONTAINERS / WEEK</label>
                        <input type="number" className="ui-input" placeholder="e.g. 3" min="0" value={programForm.containersPerWeek} onChange={e => setProgramForm(p => ({ ...p, containersPerWeek: e.target.value }))} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>START DATE</label>
                        <input type="date" className="ui-input" value={programForm.startDate} onChange={e => setProgramForm(p => ({ ...p, startDate: e.target.value }))} style={{ width: '100%' }} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>NOTES</label>
                        <input className="ui-input" placeholder="Optional notes" value={programForm.notes} onChange={e => setProgramForm(p => ({ ...p, notes: e.target.value }))} style={{ width: '100%' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setShowAddProgram(false)}>Cancel</button>
                      <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSaveProgram} disabled={savingProgram}>
                        {savingProgram ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : editingProgramId ? 'Save Changes' : 'Add Program'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700,
                        padding: '3px 10px', borderRadius: 20,
                        background: {
                          'Pending':       'rgba(148,163,184,0.15)',
                          'Loading':       'rgba(245,158,11,0.15)',
                          'Departed':      'rgba(59,130,246,0.15)',
                          'Transshipment': 'rgba(139,92,246,0.15)',
                          'In Transit':    'rgba(6,182,212,0.15)',
                          'Arrived':       'rgba(16,185,129,0.15)',
                          'Customs':       'rgba(249,115,22,0.15)',
                          'Ready for Pickup': 'rgba(163,230,53,0.15)',
                          'Delivered':     'rgba(34,197,94,0.2)',
                        }[s.status] || 'rgba(255,255,255,0.07)',
                        color: {
                          'Pending':       '#94a3b8',
                          'Loading':       '#f59e0b',
                          'Departed':      '#3b82f6',
                          'Transshipment': '#8b5cf6',
                          'In Transit':    '#06b6d4',
                          'Arrived':       '#10b981',
                          'Customs':       '#f97316',
                          'Ready for Pickup': '#a3e635',
                          'Delivered':     '#22c55e',
                        }[s.status] || '#94a3b8',
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
              <button className="btn btn-text-action" style={{ color: 'var(--orange-primary)' }} onClick={openAddOrderModal}>
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
                    <div className="text-muted mt-2" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Shipper: {o.shipper} | Recv: {o.receiver}</span>
                      <button 
                        className="btn btn-text-action" 
                        style={{ fontSize: '0.75rem', padding: '2px 6px', height: 'auto' }}
                        onClick={() => openEditOrderModal(o)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) )
              )}
            </div>
          </div>

          {/* People / Contacts within this company */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Users size={18} className="text-orange" /> People
              </h3>
              <button className="btn btn-text-action" style={{ color: 'var(--orange-primary)' }} onClick={() => setShowAddPerson(p => !p)}>
                <Plus size={14} /> Add
              </button>
            </div>

            {/* Add person form */}
            {showAddPerson && (
              <div style={{ marginBottom: 14, padding: '12px 14px', background: 'rgba(255,107,0,0.06)', borderRadius: 10, border: '1px dashed rgba(255,107,0,0.3)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--orange-primary)', marginBottom: 10 }}>NEW CONTACT</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  {[['firstName','First Name *'],['lastName','Last Name'],['title','Title / Role'],['email','Email'],['phone','Phone'],['linkedinUrl','LinkedIn URL']].map(([k,l]) => (
                    <input key={k} className="ui-input" placeholder={l}
                      value={personForm[k]} onChange={e => setPersonForm(p => ({ ...p, [k]: e.target.value }))}
                      style={{ padding: '8px 12px', fontSize: '0.82rem' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAddPerson} disabled={savingPerson || !personForm.firstName.trim()}
                    style={{ padding: '6px 16px', borderRadius: 8, background: 'var(--orange-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                    {savingPerson ? 'Adding...' : 'Add'}
                  </button>
                  <button onClick={() => setShowAddPerson(false)}
                    style={{ padding: '6px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {persons.length === 0 && !showAddPerson ? (
                <div className="text-muted" style={{ textAlign: 'center', margin: 'auto', fontSize: '0.85rem' }}>
                  No contacts yet. Click + Add to add people from this company.
                </div>
              ) : persons.map(p => (
                <div key={p.id} style={{ borderRadius: 8, border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                  {editingPersonId === p.id ? (
                    <div style={{ padding: '10px 12px', background: 'rgba(255,107,0,0.06)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        {[['firstName','First Name'],['lastName','Last Name'],['title','Title'],['email','Email'],['phone','Phone'],['linkedinUrl','LinkedIn URL']].map(([k,l]) => (
                          <input key={k} className="ui-input" placeholder={l}
                            value={editPersonForm[k] || ''} onChange={e => setEditPersonForm(f => ({ ...f, [k]: e.target.value }))}
                            style={{ padding: '7px 10px', fontSize: '0.8rem' }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleSavePerson(p.id)} disabled={savingPerson}
                          style={{ padding: '5px 14px', borderRadius: 6, background: 'var(--orange-primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                          {savingPerson ? '...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingPersonId(null)}
                          style={{ padding: '5px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.78rem' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,107,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--orange-primary)', fontSize: '0.85rem', flexShrink: 0 }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {p.name}
                          {p.title && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.78rem', marginLeft: 6 }}>· {p.title}</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                          {p.email && <span style={{ color: '#38bdf8' }}>✉ {p.email}</span>}
                          {p.phone && <span>📞 {p.phone}</span>}
                          {p.linkedinUrl && <a href={p.linkedinUrl.startsWith('http') ? p.linkedinUrl : `https://${p.linkedinUrl}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>🔗 LinkedIn</a>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => { setEditingPersonId(p.id); setEditPersonForm({ firstName: p.firstName || '', lastName: p.lastName || '', title: p.title || '', email: p.email || '', phone: p.phone || '', linkedinUrl: p.linkedinUrl || '' }); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeletePerson(p.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
      <OrderModal 
        isOpen={isOrderModalOpen} 
        onClose={() => setIsOrderModalOpen(false)} 
        onAdd={handleAddOrder}
        onEdit={handleEditOrder}
        initialData={selectedOrder}
        customers={[localContact]} 
      />
    </div>
  );
};

export default ContactDetail;
