import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Calendar, Hash, Truck, Package } from 'lucide-react';
import { ordersApi, contactsApi } from '../services/api';
import OrderModal from '../components/OrderModal';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
              <th>SHIPPER / RECEIVER</th>
              <th>QUANTITY</th>
              <th>WEEK</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading orders...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No orders found.</td></tr>
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
                    <div style={{ fontSize: '0.9rem' }}>S: {o.shipper}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>R: {o.receiver}</div>
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
                    <button 
                      className="btn btn-glass" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => openEditModal(o)}
                    >
                      View / Edit
                    </button>
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
      />
    </div>
  );
};

export default OrdersPage;
