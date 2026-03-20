import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, User, Phone, Mail, Building, Tag, Package, Hash, Plus, Loader2 } from 'lucide-react';
import { contactsApi } from '../services/api';

const OrderModal = ({ isOpen, onClose, onAdd, onEdit, initialData, customers }) => {
  const isEdit = !!initialData;
  const [formData, setFormData] = useState({
    referenceId: '',
    shipper: '',
    product: '',
    label: '',
    variety: '',
    boxType: '',
    boxQuantity: 0,
    receiver: '',
    week: '',
    contactId: ''
  });

  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    company: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        referenceId: initialData.referenceId || '',
        shipper: initialData.shipper || '',
        product: initialData.product || '',
        label: initialData.label || '',
        variety: initialData.variety || '',
        boxType: initialData.boxType || '',
        boxQuantity: initialData.boxQuantity || 0,
        receiver: initialData.receiver || '',
        week: initialData.week || '',
        contactId: initialData.contactId || ''
      });
      setIsNewCustomer(false);
    } else {
      setFormData({
        referenceId: '',
        shipper: '',
        product: '',
        label: '',
        variety: '',
        boxType: '',
        boxQuantity: 0,
        receiver: '',
        week: '',
        contactId: ''
      });
      setIsNewCustomer(false);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.referenceId || !formData.product || !formData.boxQuantity) {
      alert('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalContactId = formData.contactId;

      if (!isEdit && isNewCustomer) {
        if (!newCustomer.name || !newCustomer.phone) {
          alert('Please fill new customer name and phone');
          setIsSubmitting(false);
          return;
        }
        const created = await contactsApi.create({ ...newCustomer, type: 'Customer' });
        finalContactId = created.id;
      }

      const submissionData = { ...formData, contactId: finalContactId };

      if (isEdit) {
        await onEdit(initialData.id, submissionData);
      } else {
        await onAdd(submissionData);
      }
      onClose();
    } catch (err) {
      console.error('Failed to submit order:', err);
      alert('Failed to save order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content glass-panel" style={{ width: '600px', maxWidth: '95%', padding: 0 }}>
        
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="flex-center gap-3">
            <ShoppingBag className="text-orange" size={24} />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{isEdit ? 'Order Details / Edit' : 'New Order Entry'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            <div className="col-span-2">
              <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                {isEdit ? 'CUSTOMER' : 'SELECT CUSTOMER'}
              </label>
              
              {isEdit ? (
                <div className="glass-panel" style={{ padding: '12px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontWeight: 600 }}>{initialData.contact?.name || 'Unknown'}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{initialData.contact?.company}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                    <button 
                      type="button" 
                      className={`btn ${!isNewCustomer ? 'btn-primary' : 'btn-glass'}`} 
                      style={{ flex: 1, fontSize: '0.85rem' }}
                      onClick={() => setIsNewCustomer(false)}
                    >
                      Existing Customer
                    </button>
                    <button 
                      type="button" 
                      className={`btn ${isNewCustomer ? 'btn-primary' : 'btn-glass'}`} 
                      style={{ flex: 1, fontSize: '0.85rem' }}
                      onClick={() => setIsNewCustomer(true)}
                    >
                      New Customer
                    </button>
                  </div>

                  {isNewCustomer ? (
                    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(255,122,0,0.05)', padding: '16px', borderRadius: '12px' }}>
                      <input 
                        className="ui-input" 
                        placeholder="Customer Name *" 
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <input 
                        className="ui-input" 
                        placeholder="Phone Number *" 
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      />
                      <input 
                        className="ui-input" 
                        placeholder="Email Address" 
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      />
                      <input 
                        className="ui-input" 
                        placeholder="Company" 
                        value={newCustomer.company}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <select 
                      className="ui-select" 
                      value={formData.contactId}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactId: e.target.value }))}
                      style={{ width: '100%', padding: '10px' }}
                    >
                      <option value="">-- Choose a Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>REF ID *</label>
              <input 
                className="ui-input" 
                placeholder="Order Reference ID" 
                value={formData.referenceId}
                onChange={(e) => setFormData(prev => ({ ...prev, referenceId: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>PRODUCT *</label>
              <input 
                className="ui-input" 
                placeholder="Product (e.g. Avocado)" 
                value={formData.product}
                onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>VARIETY / LABEL</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  className="ui-input" 
                  placeholder="Variety" 
                  style={{ flex: 1 }}
                  value={formData.variety}
                  onChange={(e) => setFormData(prev => ({ ...prev, variety: e.target.value }))}
                />
                <input 
                  className="ui-input" 
                  placeholder="Label" 
                  style={{ flex: 1 }}
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>SHIPPER</label>
              <input 
                className="ui-input" 
                placeholder="Shipper Name" 
                value={formData.shipper}
                onChange={(e) => setFormData(prev => ({ ...prev, shipper: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>QUANTITY & BOX TYPE *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number"
                  className="ui-input" 
                  placeholder="Qty" 
                  style={{ width: '80px' }}
                  value={formData.boxQuantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, boxQuantity: parseInt(e.target.value) || 0 }))}
                />
                <input 
                  className="ui-input" 
                  placeholder="Box Type (e.g. 10kg)" 
                  style={{ flex: 1 }}
                  value={formData.boxType}
                  onChange={(e) => setFormData(prev => ({ ...prev, boxType: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>RECEIVER</label>
              <input 
                className="ui-input" 
                placeholder="Receiver Name" 
                value={formData.receiver}
                onChange={(e) => setFormData(prev => ({ ...prev, receiver: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>WEEK / TIMING</label>
              <input 
                className="ui-input" 
                placeholder="Scheduled Week (e.g. Week 12)" 
                value={formData.week}
                onChange={(e) => setFormData(prev => ({ ...prev, week: e.target.value }))}
              />
            </div>

          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
            <button type="button" className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Saving...
                </>
              ) : (
                isEdit ? 'Update Order Info' : 'Create Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;
