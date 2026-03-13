import React from 'react';
import { Phone, Globe, CheckCircle2, Clock, Mail, DollarSign } from 'lucide-react';
import '../index.css';

const CustomerTable = ({ data, isCampaignRunning, onPromote, onRowClick }) => {
  if (!data || data.length === 0) return null;

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Pending': return <Clock size={16} className="text-muted" />;
      case 'Calling / Emailing': return <Phone size={16} className="text-orange animate-pulse" />;
      case 'Completed (Interested)': return <CheckCircle2 size={16} className="text-green-accent" />;
      case 'Completed (Call & Email Sent)': return <CheckCircle2 size={16} className="text-green-accent" />;
      case 'Completed (Not Interested)': return <CheckCircle2 size={16} className="text-muted" />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusClass = (status) => {
    if (status.includes('Calling')) return 'status-calling';
    if (status.includes('Completed')) return 'status-completed';
    return 'status-pending';
  };

  return (
    <div className="table-container">
      <div className="table-header">
        <h4 className="table-title">Imported Contacts ({data.length})</h4>
      </div>
      
      <div className="table-responsive">
        <table className="customer-table">
          <thead>
            <tr>
              <th><div className="th-content">Name</div></th>
              <th><div className="th-content">Contact Info</div></th>
              <th><div className="th-content">Language</div></th>
              <th><div className="th-content">Credit Approval</div></th>
              <th><div className="th-content">Call/Email Status</div></th>
              <th><div className="th-content">Actions</div></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr 
                key={row.id || idx} 
                className={isCampaignRunning && row.status === 'Calling' ? 'active-row' : ''}
                onClick={() => onRowClick && onRowClick(row.id)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                <td className="font-medium text-white">{row.name}</td>
                <td className="text-sec">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div className="flex-center gap-2">
                      <Phone size={14} className="text-muted" />
                      {row.phone}
                    </div>
                    {row.email && row.email !== 'N/A' && (
                      <div className="flex-center gap-2" style={{ fontSize: '0.85rem' }}>
                        <Mail size={14} className="text-muted" />
                        {row.email}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="lang-badge">
                    <Globe size={12} />
                    {row.language}
                  </div>
                </td>
                <td>
                  {row.credit > 0 ? (
                    <div className="credit-badge positive">
                      <DollarSign size={14} />
                      {row.credit.toLocaleString('en-US')}
                    </div>
                  ) : (
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Not Approved</span>
                  )}
                </td>
                <td>
                  <div className={`status-pill ${getStatusClass(row.status)}`}>
                    {getStatusIcon(row.status)}
                    <span>{row.status}</span>
                  </div>
                </td>
                <td>
                  {row.type === 'Lead' && (
                    <button 
                      className="btn-text-action text-orange"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPromote && onPromote(row.id);
                      }}
                    >
                      Promote to Customer
                    </button>
                  )}
                  {row.type === 'Customer' && (
                    <span className="text-green-accent" style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      Active Customer
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerTable;
