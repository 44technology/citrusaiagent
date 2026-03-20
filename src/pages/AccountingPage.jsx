import React, { useState, useEffect } from 'react';
import { Receipt, FileText, ShoppingCart, ArrowRightLeft, Plus, Search, Calendar } from 'lucide-react';
import { accountingApi } from '../services/api';

const AccountingPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allInvoices, allPOs] = await Promise.all([
        accountingApi.getAllInvoices(),
        accountingApi.getAllPOs()
      ]);
      setInvoices(allInvoices);
      setPurchaseOrders(allPOs);
    } catch (err) {
      console.error('Failed to load accounting data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="accounting-page animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      
      <div className="flex-between">
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Receipt className="text-orange" size={28} /> Accounting Management
          </h1>
          <p className="text-muted mt-2">Manage Sales Invoices, Purchase Orders, and Supplier Billing.</p>
        </div>
      </div>

      <div className="flex-center gap-4" style={{ justifyContent: 'flex-start', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
        <button 
          className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-glass'}`}
          onClick={() => setActiveTab('invoices')}
        >
          <FileText size={18} /> Invoices
        </button>
        <button 
          className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-glass'}`}
          onClick={() => setActiveTab('pos')}
        >
          <ShoppingCart size={18} /> Purchase Orders
        </button>
      </div>

      <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'invoices' ? (
          <table className="customer-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th>INVOICE #</th>
                <th>TYPE</th>
                <th>AMOUNT</th>
                <th>ORDER REF</th>
                <th>STATUS</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading invoices...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No invoices found.</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="shipment-card">
                    <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td>
                      <span className={`status-badge status-${inv.type.toLowerCase()}`}>
                        {inv.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>${inv.amount.toLocaleString()}</td>
                    <td>{inv.order?.referenceId || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${inv.status.toLowerCase()}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="text-muted">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="customer-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th>PO #</th>
                <th>SUPPLIER</th>
                <th>AMOUNT</th>
                <th>LINKED SO</th>
                <th>STATUS</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading POs...</td></tr>
              ) : purchaseOrders.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No purchase orders found.</td></tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="shipment-card">
                    <td style={{ fontWeight: 600 }}>{po.poNumber}</td>
                    <td>{po.supplier?.name || 'Unknown'}</td>
                    <td style={{ fontWeight: 600 }}>${po.totalAmount.toLocaleString()}</td>
                    <td>{po.order?.referenceId || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${po.status.toLowerCase()}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="text-muted">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AccountingPage;
