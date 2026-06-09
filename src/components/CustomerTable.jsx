import React from 'react';
import { Phone, Globe, CheckCircle2, Clock, Mail, DollarSign, MapPin } from 'lucide-react';
import '../index.css';

const CustomerTable = ({ data, isCampaignRunning, onPromote, onRowClick, users = [], onAssign }) => {
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
    if (status?.includes('Calling')) return 'status-calling';
    if (status?.includes('Completed')) return 'status-completed';
    return 'status-pending';
  };

  const tags = (arr) => {
    if (!arr || !arr.length) return <span className="text-muted" style={{ fontSize: '0.78rem' }}>—</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {arr.slice(0, 3).map((v, i) => (
          <span key={i} style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8', borderRadius: 4, padding: '1px 6px', fontSize: '0.72rem', fontWeight: 600 }}>{v}</span>
        ))}
        {arr.length > 3 && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+{arr.length - 3}</span>}
      </div>
    );
  };

  const thStyle = { padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap', letterSpacing: '0.04em', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-glass)' };
  const tdStyle = { padding: '10px 12px', fontSize: '0.82rem', verticalAlign: 'top', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap', color: '#e2e8f0' };

  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-glass)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
        <thead>
          <tr>
            <th style={thStyle}>COMPANY</th>
            <th style={thStyle}>CITY</th>
            <th style={thStyle}>STATE</th>
            <th style={thStyle}>ZIP</th>
            <th style={thStyle}>COUNTRY</th>
            <th style={thStyle}>COMPANY PHONE</th>
            <th style={thStyle}>EMAIL</th>
            <th style={thStyle}>WEBSITE</th>
            <th style={thStyle}>CLASSIFICATIONS</th>
            <th style={thStyle}>COMMODITIES</th>
            <th style={thStyle}>ASSIGNED TO</th>
            <th style={thStyle}>STATUS</th>
            <th style={thStyle}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick && onRowClick(row.id)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--orange-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.name}
                {row.credit > 0 && (
                  <div style={{ marginTop: 2 }}>
                    <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 4, padding: '1px 6px', fontSize: '0.68rem', fontWeight: 700 }}>
                      ${row.credit?.toLocaleString()}
                    </span>
                  </div>
                )}
              </td>
              <td style={tdStyle}>{row.city || '—'}</td>
              <td style={tdStyle}>{row.state || '—'}</td>
              <td style={tdStyle}>{row.zip || '—'}</td>
              <td style={tdStyle}>{row.country || '—'}</td>
              <td style={tdStyle}>
                {row.companyPhone && row.companyPhone !== 'N/A' ? row.companyPhone : '—'}
              </td>
              <td style={{ ...tdStyle, color: '#38bdf8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.email && row.email !== 'N/A' ? row.email : '—'}
              </td>
              <td style={{ ...tdStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {row.website ? (
                  <a href={row.website.startsWith('http') ? row.website : `https://${row.website}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: 'var(--orange-primary)', textDecoration: 'none', fontSize: '0.8rem' }}
                    onClick={e => e.stopPropagation()}>
                    {row.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : '—'}
              </td>
              <td style={{ ...tdStyle, maxWidth: 160 }}>{tags(row.classifications)}</td>
              <td style={{ ...tdStyle, maxWidth: 160 }}>{tags(row.commodities)}</td>
              <td style={tdStyle} onClick={e => e.stopPropagation()}>
                {onAssign && users.length > 0 ? (
                  <select
                    value={row.assignedTo || ''}
                    onChange={e => onAssign(row.id, e.target.value)}
                    style={{
                      background: row.assignedTo ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${row.assignedTo ? 'rgba(34,197,94,0.3)' : 'var(--border-glass)'}`,
                      borderRadius: 8, padding: '3px 8px',
                      fontSize: '0.75rem', fontWeight: 600,
                      color: row.assignedTo ? '#22c55e' : 'var(--text-muted)',
                      cursor: 'pointer', outline: 'none', maxWidth: 130,
                    }}
                  >
                    <option value="">— None —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {row.assignedTo ? (users.find(u => u.id === row.assignedTo)?.username || '—') : '—'}
                  </span>
                )}
              </td>
              <td style={tdStyle}>
                <div className={`status-pill ${getStatusClass(row.status)}`} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                  {getStatusIcon(row.status)}
                  <span>{row.status}</span>
                </div>
              </td>
              <td style={tdStyle}>
                {row.type === 'Lead' ? (
                  <button
                    className="btn-text-action text-orange"
                    style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                    onClick={(e) => { e.stopPropagation(); onPromote && onPromote(row.id); }}
                  >
                    Promote to Customer
                  </button>
                ) : (
                  <span className="text-green-accent" style={{ fontSize: '0.78rem', fontWeight: 500 }}>Active Customer</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerTable;
