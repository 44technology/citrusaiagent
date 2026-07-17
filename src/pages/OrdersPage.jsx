import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Calendar, Hash, Truck, Package, Calculator } from 'lucide-react';
import { ordersApi, contactsApi, accountingApi } from '../services/api';
import OrderModal from '../components/OrderModal';
import ProfitCalculator from '../components/ProfitCalculator';

const OrdersPage = ({ selectedCompany }) => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCalc, setShowCalc] = useState(false);

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

  const handleCreatePO = async (order) => {
    try {
      // Find the grower's contact record to use as PO supplier
      const growerContacts = await contactsApi.getAll('Grower');
      let supplier = null;
      if (order.grower) {
        supplier = growerContacts.find(g => g.name?.trim().toLowerCase() === order.grower.trim().toLowerCase());
      }
      if (!supplier && order.contact?.type === 'Grower') supplier = order.contact;
      if (!supplier) {
        alert(`No grower contact found for "${order.grower || '—'}".\nAdd the grower on the Growers page first, then create the PO.`);
        return;
      }

      // Default amount: unit price × boxes (editable before confirm)
      const suggested = ((order.purchasePrice || 0) * (order.boxQuantity || 0)) || order.purchasePrice || 0;
      const amountStr = window.prompt(
        `Create PO for order #${order.referenceId}\nSupplier: ${supplier.name}\n\nPO total amount ($):`,
        suggested.toFixed(2)
      );
      if (amountStr === null) return;
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) { alert('Invalid amount'); return; }

      const po = await accountingApi.createPO({
        orderId: order.id,
        supplierId: supplier.id,
        totalAmount: amount,
        poNumber: `PO-${order.referenceId}`,
      });
      alert(`Purchase Order ${po.poNumber} created (Draft).\nYou can manage it in the Accounting tab.`);
      loadData();
    } catch (err) {
      alert('Create PO failed: ' + err.message);
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
                          {o.purchaseOrders?.length > 0 ? (
                            <span
                              title={o.purchaseOrders.map(p => `${p.poNumber} (${p.status})`).join(', ')}
                              style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: 700, whiteSpace: 'nowrap' }}
                            >
                              PO ✓
                            </span>
                          ) : (
                            <button
                              className="btn btn-glass"
                              style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                              onClick={() => handleCreatePO(o)}
                            >
                              Create PO
                            </button>
                          )}
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
    </div>
  );
};

export default OrdersPage;
