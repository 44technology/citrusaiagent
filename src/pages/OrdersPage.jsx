import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Calendar, Hash, Truck, Package, Calculator, X, UploadCloud, FileText, Loader2, Eye, Download, Trash2 } from 'lucide-react';
import { ordersApi, contactsApi, accountingApi, documentsApi } from '../services/api';
import OrderModal from '../components/OrderModal';
import ProfitCalculator from '../components/ProfitCalculator';

// ─── PO Docs Modal — the offer/order itself IS the PO (created under
// Growers when the offer is made); this just lets staff attach the PO
// document to that order — no separate PO record to create anymore.
const OrderPODocsModal = ({ order, onClose, onChanged }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    documentsApi.getAll({ orderId: order.id })
      .then(d => setDocs((Array.isArray(d) ? d : []).filter(doc => doc.category === 'PO')))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [order.id]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await documentsApi.upload(file, { orderId: order.id, category: 'PO' });
      }
      load();
      onChanged?.();
    } catch (err) { alert('Upload failed: ' + err.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const fetchBlob = (doc, mode) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('citrus_token');
    return fetch(`${apiBase}/documents/${doc.id}/${mode}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Request failed'); return r.blob(); });
  };
  const handleView = (doc) => fetchBlob(doc, 'view')
    .then(blob => window.open(URL.createObjectURL(blob), '_blank'))
    .catch(err => alert('View failed: ' + err.message));
  const handleDownload = (doc) => fetchBlob(doc, 'download')
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(err => alert('Download failed: ' + err.message));
  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.originalName}"?`)) return;
    try { await documentsApi.delete(doc.id); setDocs(p => p.filter(d => d.id !== doc.id)); onChanged?.(); }
    catch (err) { alert('Delete failed: ' + err.message); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: 480, padding: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} className="text-orange" /> PO Documents
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Order #{order.referenceId || order.offerId}</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: 24 }}>
          <label
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              border: '1.5px dashed var(--border-glass)', borderRadius: 10, padding: '18px 12px',
              cursor: uploading ? 'default' : 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', marginBottom: 16,
            }}
          >
            {uploading ? <Loader2 size={22} className="animate-spin" style={{ color: 'var(--orange-primary)' }} /> : <UploadCloud size={22} style={{ color: 'var(--orange-primary)' }} />}
            {uploading ? 'Uploading…' : 'Click to upload PO document(s)'}
            <input type="file" multiple hidden disabled={uploading} onChange={handleUpload} />
          </label>

          {loading ? (
            <div className="flex-center" style={{ padding: 20 }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--orange-primary)' }} /></div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '10px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No PO documents uploaded yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: 6, fontSize: '0.8rem' }}>
                  <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.originalName}</span>
                  <button title="View" onClick={() => handleView(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Eye size={14} /></button>
                  <button title="Download" onClick={() => handleDownload(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Download size={14} /></button>
                  <button title="Delete" onClick={() => handleDelete(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4 }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OrdersPage = ({ selectedCompany }) => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCalc, setShowCalc] = useState(false);
  const [poDocsOrder, setPoDocsOrder] = useState(null); // order | null — shows the PO Docs modal

  const currentUser = (() => {
    try {
      const uStr = localStorage.getItem('citrus_user');
      return uStr ? JSON.parse(uStr) : {};
    } catch (e) {
      return { role: localStorage.getItem('citrus_role') || 'customer', contactId: localStorage.getItem('citrus_contact_id') };
    }
  })();

  const userRole = currentUser?.role || 'customer';
  const userContactId = currentUser?.contactId;
  const isOp = userRole === 'admin' || userRole === 'operation' || userRole === 'super admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allOrders, allContacts] = await Promise.all([
        ordersApi.getAll(),
        contactsApi.getAll('Customer')
      ]);
      setOrders(allOrders);
      setCustomers(allContacts);
    } catch (err) {
      console.error('Failed to load orders data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = async (orderData) => {
    try {
      await ordersApi.create(orderData);
      await loadData();
    } catch (err) {
      console.error('Failed to add order:', err);
    }
  };

  const handleEditOrder = async (id, orderData) => {
    try {
      await ordersApi.update(id, orderData);
      await loadData();
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await ordersApi.delete(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert('Delete failed: ' + err.message);
    }
  };

  const handleConvertToInvoice = async (orderId) => {
    try {
      await accountingApi.convertToInvoice(orderId);
      alert('Order converted to Invoice successfully!');
      loadData();
    } catch (err) {
      alert('Conversion failed: ' + err.message);
    }
  };

  const openAddModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(true);
  };

  const openEditModal = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const filteredOrders = orders.filter(o => {
    const q = searchTerm.toLowerCase();
    return (
      (o.referenceId || '').toLowerCase().includes(q) ||
      (o.grower || o.shipper || '').toLowerCase().includes(q) ||
      (o.product || '').toLowerCase().includes(q) ||
      (o.contact?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="orders-page animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      
      <div className="flex-between">
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingBag className="text-orange" size={28} /> Order Management
          </h1>
          <p className="text-muted mt-2">Manage customer orders, box quantities, and shipping details.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${showCalc ? 'btn-primary' : 'btn-glass'}`}
            onClick={() => setShowCalc(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            title="Profit Calculator"
          >
            <Calculator size={18} /> P&L Calc
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={20} /> New Order
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Search size={20} className="text-muted" />
        <input 
          type="text" 
          className="ui-input" 
          placeholder="Search by Ref ID, Shipper, Product or Customer..." 
          style={{ flex: 1, border: 'none', background: 'transparent' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
        <table className="customer-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
          <thead>
            <tr>
              <th>REF ID</th>
              <th>CUSTOMER</th>
              <th>PRODUCT / VARIETY</th>
              <th>QUANTITY</th>
              <th>WEEK</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>Loading orders...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No orders found.</td></tr>
            ) : (
              filteredOrders.map((o) => (
                <tr key={o.id} className="shipment-card" style={{ marginBottom: '8px' }}>
                  <td style={{ fontWeight: 600 }}>
                    {o.referenceId ? o.referenceId : (
                      <span title="Not yet linked to a shipment" style={{ color: '#f59e0b' }}>{o.offerId}</span>
                    )}
                  </td>
                  <td>
                    <div className="font-medium text-white">{o.contact?.name || 'Unknown'}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{o.contact?.company}</div>
                  </td>
                  <td>
                    <div className="flex-center gap-2">
                      <Package size={14} className="text-orange" />
                      {o.product} ({o.variety})
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--orange-primary)' }}>{o.boxQuantity} Boxes</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{o.boxType}</div>
                  </td>
                  <td>
                    <div className="flex-center gap-2 text-muted">
                      <Calendar size={14} />
                      {o.week}
                    </div>
                  </td>
                  <td>
                    {isOp ? (
                      <>
                        <select 
                          className="status-badge"
                          value={o.status || 'pending'}
                          onChange={async (e) => {
                            try {
                              await ordersApi.update(o.id, { status: e.target.value });
                              loadData();
                            } catch (err) {
                              alert('Update failed: ' + err.message);
                            }
                          }}
                          style={{ 
                            background: 'rgba(255,107,0,0.1)', 
                            border: '1px solid rgba(255,107,0,0.2)',
                            color: 'var(--orange-primary)',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                        </select>
                        <div className="flex-center gap-2 mt-2">
                          <button 
                            className="btn btn-glass" 
                            style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                            onClick={() => handleConvertToInvoice(o.id)}
                          >
                            Conv. to Invoice
                          </button>
                          <button
                            className="btn btn-glass"
                            style={{ fontSize: '0.7rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setPoDocsOrder(o)}
                          >
                            <FileText size={11} /> PO Docs
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className={`status-badge status-${(o.status || 'pending').replace(' ', '-')}`} style={{ 
                        background: 'rgba(255,107,0,0.1)', 
                        color: 'var(--orange-primary)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem'
                      }}>
                        {o.status || 'pending'}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex-center gap-2">
                      <button 
                        className="btn btn-glass" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => openEditModal(o)}
                      >
                        View / Edit
                      </button>
                      {userRole === 'super admin' && (
                        <button 
                          className="btn btn-glass text-red" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ff4d4d' }}
                          onClick={() => handleDeleteOrder(o.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCalc && <ProfitCalculator onClose={() => setShowCalc(false)} />}

      <OrderModal
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddOrder}
        onEdit={handleEditOrder}
        initialData={selectedOrder}
        customers={customers}
        userRole={userRole}
        userContactId={userContactId}
      />

      {poDocsOrder && (
        <OrderPODocsModal
          order={poDocsOrder}
          onClose={() => setPoDocsOrder(null)}
          onChanged={loadData}
        />
      )}
    </div>
  );
};

export default OrdersPage;
