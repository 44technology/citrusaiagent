import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddContactModal = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [language, setLanguage] = useState('English');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !phone) return;
    
    onAdd({
      id: Date.now().toString(),
      name,
      phone,
      email: email || 'N/A',
      company: company || 'N/A',
      department: department || 'N/A',
      language,
      status: 'Pending',
      type: 'Lead',
      credit: 0
    });
    
    setName('');
    setPhone('');
    setEmail('');
    setCompany('');
    setDepartment('');
    setLanguage('English');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-slide-up">
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Add New Contact</h3>
          <button type="button" className="icon-btn-small" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>NAME</label>
            <input 
              type="text" 
              className="ui-input" 
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>PHONE NUMBER</label>
            <input 
              type="text" 
              className="ui-input" 
              placeholder="e.g. +1 234 567 8900"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>EMAIL ADDRESS</label>
            <input 
              type="email" 
              className="ui-input" 
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>COMPANY NAME</label>
              <input 
                type="text" 
                className="ui-input" 
                placeholder="e.g. Citrus Co."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>DEPARTMENT</label>
              <input 
                type="text" 
                className="ui-input" 
                placeholder="e.g. Purchasing"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>LANGUAGE</label>
            <select 
              className="ui-select" 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
            </select>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Contact</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
