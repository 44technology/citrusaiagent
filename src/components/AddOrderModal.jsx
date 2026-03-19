import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Hash, Truck, Package, Tag, Layers, Database, UserCheck, UserPlus, Plus } from 'lucide-react';
import { contactsApi } from '../services/api';

const AddOrderModal = ({ isOpen, onClose, onAdd, customers }) => {
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    contactId: '',
    referenceId: '',
    shipper: '',
    product: '',
    label: '',
    variety: '',
    boxType: '',
    boxQuantity: 0,
    receiver: '',
    week: '',
    // New customer fields
    customerName: '',
    customerCompany: '',
    customerEmail: '',
    customerPhone: ''
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let finalContactId = form.contactId;

      // 1. If it's a new customer, create the contact first
      if (isNewCustomer) {
        if (!form.customerName) {
           alert('Please enter a customer name.');
           setLoading(false);
           return;
        }
        const newContact = await contactsApi.create({
          name: form.customerName,
          company: form.customerCompany,
          email: form.customerEmail,
          phone: form.customerPhone,
          type: 'Customer',
          status: 'Active'
        });
        finalContactId = newContact.id;
      }

      if (!finalContactId) {
        alert('Please select or create a customer.');
        setLoading(false);
        return;
      }

      // 2. Prepare data for create
      const orderData = {
        referenceId: form.referenceId,
        shipper: form.shipper,
        product: form.product,
        label: form.label,
        variety: form.variety,
        boxType: form.boxType,
        boxQuantity: parseInt(form.boxQuantity) || 0,
        receiver: form.receiver,
        week: form.week,
        contactId: finalContactId
      };

      // 3. Create order
      await onAdd(orderData);

      // 4. Reset & Close
      setForm({
        contactId: '', referenceId: '', shipper: '', product: '', label: '',
        variety: '', boxType: '', boxQuantity: 0, receiver: '', week: '',
        customerName: '', customerCompany: '', customerEmail: '', customerPhone: ''
      });
      setIsNewCustomer(false);
      onClose();
    } catch (err) {
      console.error('Failed to process order creation:', err);
      alert('Error creating order/customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content shipment-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div className="flex-center gap-2">
            <ShoppingBag size={20} className="text-orange" />
            <h3>Add New Order</h3>
          </div>
          <button className="icon-btn-small" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: '14px', paddingBottom: '20px' }}>

            {/* Customer Selection Header */}
            <div className="flex-between" style={{ marginBottom: '4px' }}>
              <label className="shipment-label" style={{ marginBottom: 0 }}>Customer Info *</label>
              <button 
                type="button" 
                className="btn btn-glass" 
                style={{ fontSize: '0.75rem', gap: '4px', padding: '4px 10px', background: 'rgba(255,107,0,0.1)', color: 'var(--orange-primary)' }}
                onClick={() => setIsNewCustomer(!isNewCustomer)}
              >
                {isNewCustomer ? <><UserCheck size={14} /> Use Existing</> : <><UserPlus size={14} /> + New Customer</>}
              </button>
            </div>

            {/* Customer Toggle Areas */}
            {!isNewCustomer ? (
              <div>
                <select
                  className="ui-input"
                  value={form.contactId}
                  onChange={(e) => handleChange('contactId', e.target.value)}
                  style={{ width: '100%', border: form.contactId ? '1px solid var(--orange-primary)' : '1px solid var(--border-glass)' }}
                >
                  <option value="">Select Customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company && `(${c.company})`}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,107,0,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,107,0,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="Full Name *"
                    value={form.customerName}
                    onChange={(e) => handleChange('customerName', e.target.value)}
                    required={isNewCustomer}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="Company"
                    value={form.customerCompany}
                    onChange={(e) => handleChange('customerCompany', e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="Phone"
                    value={form.customerPhone}
                    onChange={(e) => handleChange('customerPhone', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="divider" style={{ margin: '8px 0', opacity: 0.1 }}></div>

            {/* Reference & Shipper */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label"><Hash size={14} /> Referans ID</label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. REF-12345"
                  value={form.referenceId}
                  onChange={(e) => handleChange('referenceId', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="shipment-label"><Truck size={14} /> Shipper</label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. AgriTrade Co."
                  value={form.shipper}
                  onChange={(e) => handleChange('shipper', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Product & Variety */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label"><Package size={14} /> Product</label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Lemon"
                  value={form.product}
                  onChange={(e) => handleChange('product', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="shipment-label"><Tag size={14} /> Variety</label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Interdonato"
                  value={form.variety}
                  onChange={(e) => handleChange('variety', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Label & Week */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label"><Tag size={14} /> Label</label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Premium Selection"
                  value={form.label}
                  onChange={(e) => handleChange('label', e.target.value)}
                />
              </div>
              <div>
                <label className="shipment-label"><Package size={14} /> Week</label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Week 12"
                  value={form.week}
                  onChange={(e) => handleChange('week', e.target.value)}
                />
              </div>
            </div>

            {/* Box Type & Box Quantity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label"><Layers size={14} /> Box Type</label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Wooden Case"
                  value={form.boxType}
                  onChange={(e) => handleChange('boxType', e.target.value)}
                />
              </div>
              <div>
                <label className="shipment-label"><Database size={14} /> Box Quantity</label>
                <input
                  type="number"
                  className="ui-input"
                  placeholder="0"
                  value={form.boxQuantity}
                  onChange={(e) => handleChange('boxQuantity', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Receiver */}
            <div>
              <label className="shipment-label"><UserCheck size={14} /> Customer Receiver</label>
              <input
                type="text"
                className="ui-input"
                placeholder="e.g. Fresh Mart Inc."
                value={form.receiver}
                onChange={(e) => handleChange('receiver', e.target.value)}
                required
              />
            </div>

          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="loader-small"></div> : <><Plus size={16} /> Add Order</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrderModal;
