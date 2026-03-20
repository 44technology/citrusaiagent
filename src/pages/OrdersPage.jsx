import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Calendar, Hash, Truck, Package } from 'lucide-react';
import { ordersApi, contactsApi, accountingApi } from '../services/api';
import OrderModal from '../components/OrderModal';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const userRole = localStorage.getItem('citrus_role') || 'user';
  const userContactId = localStorage.getItem('citrus_contact_id');
  const isOp = userRole === 'admin' || userRole === 'operation';

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

  const filteredOrders = orders.filter(o => 
    o.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.shipper.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.contact?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="orders-page animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      
      <div className="flex-between">
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingBag className="text-orange" size={28} /> Order Management
          </h1>
          <p className="text-muted mt-2">Manage customer orders, box quantities, and shipping details.</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={20} /> New Order
        </button>
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
                  <td style={{ fontWeight: 600 }}>{o.referenceId}</td>
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
                          <option value="pending shipment">Pending Shipment</option>
                          <option value="in-transit">In-Transit</option>
                          <option value="completed">Completed</option>
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
                            style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                            onClick={() => alert('Create PO feature coming in Accounting tab')}
                          >
                            Create PO
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
                      {isOp && (
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
    </div>
  );
};

export default OrdersPage;
