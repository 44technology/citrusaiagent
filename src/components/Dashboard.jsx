import React, { useState, useEffect } from 'react';
import ExcelUpload from './ExcelUpload';
import CustomerTable from './CustomerTable';
import AddContactModal from './AddContactModal';
import ContactDetail from './ContactDetail';
import { contactsApi } from '../services/api';
import '../index.css';

const Dashboard = ({ activeTab }) => {
  const [contacts, setContacts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch contacts from API
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const data = await contactsApi.getAll();
      setContacts(data);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Polling for status updates every 5 seconds when campaign is active
  useEffect(() => {
    const hasActive = contacts.some(c => c.status === 'Calling / Emailing');
    if (!hasActive) return;
    const interval = setInterval(fetchContacts, 5000);
    return () => clearInterval(interval);
  }, [contacts]);

  const handleDataParsed = (newContacts) => {
    setContacts(newContacts);
  };

  const handleAddContact = async (newContact) => {
    try {
      await contactsApi.create(newContact);
      await fetchContacts();
    } catch (err) {
      console.error('Failed to add contact:', err);
    }
  };

  const handlePromote = async (contactId) => {
    try {
      await contactsApi.promote(contactId);
      await fetchContacts();
      if (activeTab === 'leads') {
        setSelectedContactId(null);
      }
    } catch (err) {
      console.error('Failed to promote:', err);
    }
  };

  const handleClearList = async () => {
    const toDelete = filteredContacts;
    for (const c of toDelete) {
      try {
        await contactsApi.delete(c.id);
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    }
    await fetchContacts();
  };

  const handleRowClick = (contactId) => {
    setSelectedContactId(contactId);
  };

  const handleBackToList = () => {
    setSelectedContactId(null);
    fetchContacts(); // Refresh after viewing detail
  };

  const filteredContacts = contacts.filter(c => 
    activeTab === 'leads' ? c.type === 'Lead' : c.type === 'Customer'
  );

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  // Render detail view if a contact is selected
  if (selectedContactId && selectedContact) {
    return (
      <ContactDetail 
        contact={selectedContact} 
        onBack={handleBackToList} 
        onPromote={handlePromote}
        onRefresh={fetchContacts}
      />
    );
  }

  return (
    <div className="dashboard animate-slide-up">
      <div className="dashboard-grid full-width">
        <div className="main-panel glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2>{activeTab === 'leads' ? 'Leads Management' : 'Customer Directory'}</h2>
              <p className="text-sec mt-2">
                {activeTab === 'leads' 
                  ? 'Upload and manage potential customers. Click on a row to configure AI outreach.' 
                  : 'View and manage your converted customers.'}
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Loading contacts...
            </div>
          ) : filteredContacts.length === 0 && activeTab === 'leads' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
              <ExcelUpload onDataParsed={handleDataParsed} />
              <div className="flex-center gap-2">
                <span className="text-muted">or</span>
                <button className="btn btn-glass" onClick={() => setIsModalOpen(true)}>Add Contact Manually</button>
              </div>
            </div>
          ) : filteredContacts.length === 0 && activeTab === 'customers' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
              <div style={{ color: 'var(--text-muted)' }}>No customers yet. Promote a Lead or add one manually.</div>
              <button className="btn btn-glass" onClick={() => setIsModalOpen(true)}>+ Add Customer Manually</button>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="status-badge" style={{ background: 'rgba(255, 122, 0, 0.1)', color: 'var(--orange-primary)', borderColor: 'rgba(255, 122, 0, 0.2)' }}>
                  {filteredContacts.length} {activeTab === 'leads' ? 'Leads' : 'Customers'}
                </span>
                <div className="flex-center gap-2">
                  <button 
                    className="btn btn-glass"
                    onClick={() => setIsModalOpen(true)}
                  >
                    {activeTab === 'leads' ? '+ Add Lead' : '+ Add Customer'}
                  </button>
                  <button 
                    className="btn btn-glass"
                    onClick={handleClearList}
                  >
                    Clear List
                  </button>
                </div>
              </div>
              
              <CustomerTable 
                data={filteredContacts} 
                onPromote={handlePromote} 
                onRowClick={handleRowClick}
              />
            </div>
          )}

          <AddContactModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onAdd={handleAddContact} 
            defaultType={activeTab === 'customers' ? 'Customer' : 'Lead'}
          />

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
