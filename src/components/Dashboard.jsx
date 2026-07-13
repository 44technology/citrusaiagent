import React, { useState, useEffect } from 'react';
import ExcelUpload from './ExcelUpload';
import CustomerTable from './CustomerTable';
import AddContactModal from './AddContactModal';
import ContactDetail from './ContactDetail';
import ImportLeadsModal from './ImportLeadsModal';
import { contactsApi, shipmentsApi, usersApi } from '../services/api';
import { FileSpreadsheet, Search, X, MapPin } from 'lucide-react';
import '../index.css';

const Dashboard = ({ activeTab, selectedCompany }) => {
  const [contacts, setContacts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showCityAssign, setShowCityAssign] = useState(false);
  const [cityAssignments, setCityAssignments] = useState({}); // { city: userId }
  const [savingCities, setSavingCities] = useState(new Set());
  const [citySearch, setCitySearch] = useState('');

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
      const [data, sData, uData] = await Promise.all([
        contactsApi.getAll(),
        shipmentsApi.getAll().catch(() => []),
        usersApi.getAll().catch(() => []),
      ]);
      setContacts(data);
      setShipments(Array.isArray(sData) ? sData : []);
      setUsers(Array.isArray(uData) ? uData : []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [selectedCompany?.id]);

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

  const filteredContacts = contacts.filter(c => {
    const matchType = activeTab === 'leads' ? c.type === 'Lead' : c.type === 'Customer';
    if (!matchType) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q)
    );
  });

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
          
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <h2>{activeTab === 'leads' ? 'Leads Management' : 'Customer Directory'}</h2>
              <p className="text-sec mt-2">
                {activeTab === 'leads'
                  ? 'Upload and manage potential customers. Click on a row to configure AI outreach.'
                  : 'View and manage your converted customers.'}
              </p>
            </div>
            <div style={{ position: 'relative', flexShrink: 0, minWidth: 260 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'leads' ? 'leads' : 'customers'}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 32, paddingRight: search ? 32 : 12, paddingTop: 8, paddingBottom: 8,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)',
                  borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.84rem', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>


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
                    onClick={() => { setShowCityAssign(true); setCityAssignments({}); setCitySearch(''); }}
                    title="Assign contacts by city"
                  >
                    <MapPin size={14} /> City Assign
                  </button>
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
                users={users}
                onAssign={async (contactId, userId) => {
                  try {
                    await contactsApi.update(contactId, { assignedTo: userId || null });
                    await fetchContacts();
                  } catch (err) { console.error(err); }
                }}
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

          {/* City Assignments Modal */}
          {showCityAssign && (() => {
            const type = activeTab === 'leads' ? 'Lead' : 'Customer';
            const cityContacts = contacts.filter(c => c.type === type && c.city);
            const cityMap = {};
            cityContacts.forEach(c => {
              if (!cityMap[c.city]) cityMap[c.city] = { count: 0, assigned: {} };
              cityMap[c.city].count++;
              if (c.assignedTo) cityMap[c.city].assigned[c.assignedTo] = (cityMap[c.city].assigned[c.assignedTo] || 0) + 1;
            });
            const cities = Object.entries(cityMap)
              .sort((a, b) => b[1].count - a[1].count)
              .filter(([city]) => !citySearch || city.toLowerCase().includes(citySearch.toLowerCase()));

            const handleAssignCity = async (city, userId) => {
              setSavingCities(p => new Set([...p, city]));
              try {
                await contactsApi.assignByCity(city, userId || null, type);
                await fetchContacts();
                setCityAssignments(p => ({ ...p, [city]: userId }));
              } catch (err) { alert('Failed: ' + err.message); }
              finally { setSavingCities(p => { const n = new Set(p); n.delete(city); return n; }); }
            };

            return (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MapPin size={18} style={{ color: 'var(--orange-primary)' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>City Assignments</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Assign all contacts in a city to a team member</div>
                      </div>
                    </div>
                    <button onClick={() => setShowCityAssign(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                      <X size={18} />
                    </button>
                  </div>

                  {/* Search */}
                  <div style={{ padding: '12px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        className="ui-input"
                        placeholder="Search city…"
                        value={citySearch}
                        onChange={e => setCitySearch(e.target.value)}
                        style={{ paddingLeft: 30, fontSize: '0.82rem', width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* City list */}
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {cities.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No cities found</div>
                    ) : cities.map(([city, info]) => {
                      const topUserId = Object.entries(info.assigned).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
                      const currentVal = cityAssignments[city] !== undefined ? cityAssignments[city] : topUserId;
                      const saving = savingCities.has(city);
                      return (
                        <div key={city} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 22px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <MapPin size={13} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{city}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{info.count} contact{info.count !== 1 ? 's' : ''}</div>
                          </div>
                          <select
                            className="ui-input"
                            value={currentVal}
                            onChange={e => setCityAssignments(p => ({ ...p, [city]: e.target.value }))}
                            style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: 150 }}
                          >
                            <option value="">— Unassigned —</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                          </select>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '5px 12px', flexShrink: 0, opacity: saving ? 0.6 : 1 }}
                            disabled={saving}
                            onClick={() => handleAssignCity(city, cityAssignments[city] !== undefined ? cityAssignments[city] : topUserId)}
                          >
                            {saving ? '…' : 'Assign All'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ padding: '12px 22px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {cities.length} cities · Changes save immediately when you click "Assign All"
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
