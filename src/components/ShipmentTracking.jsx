import React, { useState, useEffect } from 'react';
import { Ship, Plus, Search, Filter, Calendar, MapPin, Anchor, Clock, CheckCircle2, Navigation, Package, Hash, ChevronDown, X } from 'lucide-react';
import { shipmentsApi, contactsApi } from '../services/api';
import AddShipmentModal from './AddShipmentModal';
import ShipmentDetailModal from './ShipmentDetailModal';

const ShipmentTracking = () => {
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  
  // Filters State
  const [filters, setFilters] = useState({
    customer: '',
    container: '',
    shippingLine: '',
    origin: '',
    destination: '',
    eta: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const statuses = ['Pending', 'Departed', 'In Transit', 'Arrived'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, cData] = await Promise.all([
        shipmentsApi.getAll(),
        contactsApi.getAll()
      ]);
      setShipments(sData);
      // Filter for only 'Customer' type
      const customerOnly = cData.filter(c => c.type === 'Customer');
      setCustomers(customerOnly);
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShipment = async (shipmentData) => {
    try {
      await shipmentsApi.create(shipmentData);
      loadData();
    } catch (err) {
      console.error('Failed to create shipment:', err);
    }
  };

  const handleUpdateShipment = (updated) => {
    setShipments(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleteShipment = (id) => {
    setShipments(prev => prev.filter(s => s.id !== id));
  };

  const filteredShipments = shipments.filter(s => {
    const matchCustomer = !filters.customer || (s.contact?.name && s.contact.name.toLowerCase().includes(filters.customer.toLowerCase())) || (s.contact?.company && s.contact.company.toLowerCase().includes(filters.customer.toLowerCase()));
    const matchContainer = !filters.container || (s.containerNumber && s.containerNumber.toLowerCase().includes(filters.container.toLowerCase()));
    const matchShippingLine = !filters.shippingLine || (s.shippingLine && s.shippingLine.toLowerCase().includes(filters.shippingLine.toLowerCase()));
    const matchOrigin = !filters.origin || (s.origin && s.origin.toLowerCase().includes(filters.origin.toLowerCase()));
    const matchDestination = !filters.destination || (s.destination && s.destination.toLowerCase().includes(filters.destination.toLowerCase()));
    const matchEta = !filters.eta || (s.vesselEta && s.vesselEta.startsWith(filters.eta));
    
    return matchCustomer && matchContainer && matchShippingLine && matchOrigin && matchDestination && matchEta;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return <Clock size={16} />;
      case 'Departed': return <Navigation size={16} />;
      case 'In Transit': return <Anchor size={16} />;
      case 'Arrived': return <CheckCircle2 size={16} />;
      default: return null;
    }
  };

  const resetFilters = () => {
    setFilters({ customer: '', container: '', shippingLine: '', origin: '', destination: '', eta: '' });
  };

  if (loading) return <div className="flex-center" style={{ height: '100%' }}><div className="loader"></div></div>;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      
      {/* Header Section */}
      <div className="flex-between">
        <div className="page-header">
          <div className="page-icon-box">
            <Ship size={24} className="text-orange" />
          </div>
          <div>
            <h1 className="page-title">Shipment Tracking</h1>
            <p className="page-subtitle">Track and manage your vessel shipments in real-time.</p>
          </div>
        </div>
        <div className="flex-center gap-3">
          <button 
            className={`btn ${showFilters ? 'btn-primary' : 'btn-glass'}`} 
            onClick={() => setShowFilters(!showFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Filter size={18} /> {showFilters ? 'Hide Filters' : 'Filters'}
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} /> Add Shipment
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="glass-panel" style={{ padding: '20px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
             <div className="shipment-detail-item">
               <label className="shipment-detail-label">Customer / Company</label>
               <input type="text" className="ui-input" placeholder="Search customer..." value={filters.customer} onChange={(e) => setFilters(p => ({ ...p, customer: e.target.value }))} />
             </div>
             <div className="shipment-detail-item">
               <label className="shipment-detail-label">Container No</label>
               <input type="text" className="ui-input" placeholder="Search container..." value={filters.container} onChange={(e) => setFilters(p => ({ ...p, container: e.target.value }))} />
             </div>
             <div className="shipment-detail-item">
               <label className="shipment-detail-label">Origin</label>
               <input type="text" className="ui-input" placeholder="Origin..." value={filters.origin} onChange={(e) => setFilters(p => ({ ...p, origin: e.target.value }))} />
             </div>
             <div className="shipment-detail-item">
               <label className="shipment-detail-label">Destination</label>
               <input type="text" className="ui-input" placeholder="Destination..." value={filters.destination} onChange={(e) => setFilters(p => ({ ...p, destination: e.target.value }))} />
             </div>
             <div className="shipment-detail-item">
               <label className="shipment-detail-label">Shipping Line</label>
               <input type="text" className="ui-input" placeholder="e.g. MSC, Maersk..." value={filters.shippingLine} onChange={(e) => setFilters(p => ({ ...p, shippingLine: e.target.value }))} />
             </div>
             <div className="shipment-detail-item">
               <label className="shipment-detail-label">ETA Date</label>
               <input type="date" className="ui-input" value={filters.eta} onChange={(e) => setFilters(p => ({ ...p, eta: e.target.value }))} />
             </div>
           </div>
           <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
             <button className="btn btn-text-action" onClick={resetFilters} style={{ fontSize: '0.85rem' }}>
               <X size={14} /> Clear All Filters
             </button>
           </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="kanban-board">
        {statuses.map(status => {
          const statusShipments = filteredShipments.filter(s => s.status === status);
          return (
            <div key={status} className="kanban-column">
              <div className="kanban-header">
                <div className="flex-center gap-2">
                  <span style={{ color: 'var(--orange-primary)' }}>{getStatusIcon(status)}</span>
                  <h3>{status}</h3>
                </div>
                <span className="kanban-count">{statusShipments.length}</span>
              </div>
              <div className="kanban-cards">
                {statusShipments.map(shipment => (
                  <div key={shipment.id} className="kanban-card" onClick={() => setSelectedShipment(shipment)}>
                    <div className="kanban-card-title">{shipment.label}</div>
                    <div className="kanban-card-route">
                      <MapPin size={12} /> {shipment.origin ? `${shipment.origin} → ` : ''}{shipment.destination}
                    </div>
                    <div className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                      {shipment.contact?.name} {shipment.contact?.company && `(${shipment.contact.company})`}
                    </div>
                    <div className="kanban-card-footer">
                      <div className="kanban-card-vessel">
                        <Anchor size={12} /> {shipment.vesselName || 'No vessel info'}
                      </div>
                      {shipment.vesselEta && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--orange-primary)' }}>
                          {new Date(shipment.vesselEta).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {statusShipments.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.5 }}>
                    No shipments in this stage.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddShipmentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddShipment} 
        customers={customers} 
      />

      {selectedShipment && (
        <ShipmentDetailModal
          isOpen={!!selectedShipment}
          onClose={() => setSelectedShipment(null)}
          shipment={selectedShipment}
          onUpdate={handleUpdateShipment}
          onDelete={handleDeleteShipment}
        />
      )}
    </div>
  );
};

export default ShipmentTracking;
