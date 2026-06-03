import React, { useState, useEffect } from 'react';
import ExcelUpload from './ExcelUpload';
import CustomerTable from './CustomerTable';
import AddContactModal from './AddContactModal';
import ContactDetail from './ContactDetail';
import ImportLeadsModal from './ImportLeadsModal';
import { contactsApi, shipmentsApi } from '../services/api';
import { FileSpreadsheet } from 'lucide-react';
import '../index.css';

const Dashboard = ({ activeTab }) => {
  const [contacts, setContacts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);

  const currentUser = (() => {
    try {
      const userStr = localStorage.getItem('citrus_user');
      return userStr ? JSON.parse(userStr) : {};
    } catch (e) {
      return { username: localStorage.getItem('citrus_user'), role: 'customer' };
    }
  })();
  const isSuperAdmin = currentUser?.role === 'super admin';

  // Fetch contacts from API
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const [data, sData] = await Promise.all([
        contactsApi.getAll(),
        shipmentsApi.getAll().catch(() => []),
      ]);
      setContacts(data);
      setShipments(Array.isArray(sData) ? sData : []);
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

          {/* Shipment stats — customers tab only */}
          {activeTab === 'customers' && shipments.length > 0 && (() => {
            const stats = [
              { label: 'Pending',    color: '#94a3b8', count: shipments.filter(s => s.status === 'Pending').length },
              { label: 'In Transit', color: '#06b6d4', count: shipments.filter(s => ['Departed','Transshipment','In Transit'].includes(s.status)).length },
              { label: 'Delivered',  color: '#22c55e', count: shipments.filter(s => s.status === 'Delivered').length },
              { label: 'Paid',       color: '#f59e0b', count: shipments.filter(s => s.advancePaymentStatus === 'Paid').length },
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {stats.map(st => (
                  <div key={st.label} style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: `${st.color}12`,
                    border: `1px solid ${st.color}30`,
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: st.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{st.label}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.count}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>shipments</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Loading contacts...
            </div>
          ) : filteredContacts.length === 0 && activeTab === 'leads' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
              <div className="flex-center gap-3">
                <button className="btn btn-primary" onClick={() => setShowImport(true)}>
                  <FileSpreadsheet size={15} /> Import from Excel
                </button>
                <button className="btn btn-glass" onClick={() => setIsModalOpen(true)}>+ Add Manually</button>
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
                  {activeTab === 'leads' && (
                    <button
                      className="btn btn-glass"
                      onClick={() => setShowImport(true)}
                    >
                      <FileSpreadsheet size={14} /> Import Excel
                    </button>
                  )}
                  <button
                    className="btn btn-glass"
                    onClick={() => setIsModalOpen(true)}
                  >
                    {activeTab === 'leads' ? '+ Add Lead' : '+ Add Customer'}
                  </button>
                  {isSuperAdmin && (
                    <button
                      className="btn btn-glass"
                      onClick={handleClearList}
                    >
                      Clear List
                    </button>
                  )}
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

          <ImportLeadsModal
            isOpen={showImport}
            onClose={() => setShowImport(false)}
            onImported={fetchContacts}
            importType={activeTab === 'customers' ? 'Customer' : 'Lead'}
          />

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
