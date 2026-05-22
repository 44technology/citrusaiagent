import React, { useState, useEffect } from 'react';
import { Settings, Users, Shield, Trash2, Loader2, Save, UserX, CheckCircle, Mail, Eye, EyeOff } from 'lucide-react';
import { usersApi, emailApi } from '../services/api';

const SettingsPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  // Email settings
  const [emailForm, setEmailForm] = useState({
    email_host: 'smtp.office365.com',
    email_port: '587',
    email_user: '',
    email_pass: '',
    email_from_name: 'Sweet Fresh',
    email_signature: '',
  });
  const [emailSaving, setEmailSaving]   = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailMsg, setEmailMsg]         = useState('');
  const [showPass, setShowPass]         = useState(false);
  const currentUser = (() => {
    try {
      const userStr = localStorage.getItem('citrus_user');
      return userStr ? JSON.parse(userStr) : {};
    } catch (e) {
      return { username: localStorage.getItem('citrus_user'), role: 'customer' };
    }
  })();
  const isSuperAdmin = currentUser?.role === 'super admin';

  useEffect(() => {
    loadUsers();
    emailApi.getSettings().then(s => {
      setEmailForm(prev => ({ ...prev, ...s }));
    }).catch(() => {});
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      setSaving(userId);
      await usersApi.updateRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed to update role: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersApi.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert('Failed to delete user: ' + err.message);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex-center" style={{ height: '80vh', flexDirection: 'column', gap: '16px' }}>
        <Shield size={64} className="text-muted" style={{ opacity: 0.2 }} />
        <h2 className="text-muted">Access Restricted</h2>
        <p className="text-sec">Only Super Admins can access user management settings.</p>
      </div>
    );
  }

  return (
    <div className="page-container glass-panel fade-in" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <Settings size={32} className="text-orange" />
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>System Settings</h1>
          <p className="text-sec">Manage user access and global configurations.</p>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Users size={20} className="text-orange" />
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>User Management</h2>
        </div>

        {loading ? (
          <div className="flex-center" style={{ height: '200px' }}>
            <Loader2 className="animate-spin text-orange" size={32} />
          </div>
        ) : (
          <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>USERNAME</th>
                  <th>LINKED CONTACT</th>
                  <th>ASSIGNED ROLE</th>
                  <th>CREATED</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.username}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>ID: {u.id.slice(-8)}</div>
                    </td>
                    <td>
                      {u.contact ? (
                        <div>
                          <div style={{ fontSize: '0.9rem' }}>{u.contact.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.8rem' }}>{u.contact.company}</div>
                        </div>
                      ) : (
                        <span className="text-muted" style={{ fontStyle: 'italic' }}>System/Admin</span>
                      )}
                    </td>
                    <td>
                      <select 
                        className="ui-select" 
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        disabled={saving === u.id || u.id === currentUser.id}
                        style={{ padding: '4px 8px', fontSize: '0.85rem', width: '140px' }}
                      >
                        <option value="customer">Customer</option>
                        <option value="operation">Operation</option>
                        <option value="admin">Admin</option>
                        <option value="super admin">Super Admin</option>
                      </select>
                      {saving === u.id && <Loader2 className="animate-spin inline-block ml-2 text-orange" size={14} />}
                    </td>
                    <td className="text-sec">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-glass text-red" 
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === currentUser.id}
                        style={{ padding: '6px', color: '#ff4d4d' }}
                        title="Delete User"
                      >
                        <UserX size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Settings */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Mail className="text-orange" size={22} />
          <div>
            <h3 style={{ margin: 0 }}>Email Configuration</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              GoDaddy Microsoft 365 SMTP settings for the Outreach page
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[
            { key: 'email_host',      label: 'SMTP Host',    placeholder: 'smtp.office365.com' },
            { key: 'email_port',      label: 'SMTP Port',    placeholder: '587' },
            { key: 'email_user',      label: 'Email Address',placeholder: 'you@yourdomain.com' },
            { key: 'email_from_name', label: 'Display Name', placeholder: 'Sweet Fresh' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
                {f.label.toUpperCase()}
              </label>
              <input
                className="ui-input"
                placeholder={f.placeholder}
                value={emailForm[f.key] || ''}
                onChange={e => setEmailForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {/* Password */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
            EMAIL PASSWORD / APP PASSWORD
          </label>
          <div style={{ position: 'relative' }}>
            <input
              className="ui-input"
              type={showPass ? 'text' : 'password'}
              placeholder="Your email password or app password"
              value={emailForm.email_pass || ''}
              onChange={e => setEmailForm(p => ({ ...p, email_pass: e.target.value }))}
              style={{ paddingRight: 44 }}
            />
            <button
              onClick={() => setShowPass(p => !p)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Signature */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
            EMAIL SIGNATURE (HTML supported)
          </label>
          <textarea
            value={emailForm.email_signature || ''}
            onChange={e => setEmailForm(p => ({ ...p, email_signature: e.target.value }))}
            placeholder="e.g. Best regards,&#10;John Smith | Sweet Fresh&#10;📞 +1 (555) 000-0000"
            rows={4}
            style={{
              width: '100%', padding: '12px 16px',
              background: 'var(--bg-panel)', border: '1px solid var(--border-glass)',
              borderRadius: 8, color: 'white', fontFamily: 'var(--font-main)',
              fontSize: '0.85rem', resize: 'vertical', outline: 'none',
            }}
          />
        </div>

        {emailMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: '0.85rem',
            background: emailMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${emailMsg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: emailMsg.startsWith('✅') ? '#22c55e' : '#f87171',
          }}>
            {emailMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-glass"
            disabled={emailTesting}
            onClick={async () => {
              setEmailTesting(true); setEmailMsg('');
              try {
                await emailApi.saveSettings(emailForm);
                await emailApi.test();
                setEmailMsg('✅ SMTP connection successful!');
              } catch (e) { setEmailMsg('❌ ' + e.message); }
              finally { setEmailTesting(false); }
            }}
          >
            {emailTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            className="btn btn-primary"
            disabled={emailSaving}
            onClick={async () => {
              setEmailSaving(true); setEmailMsg('');
              try {
                await emailApi.saveSettings(emailForm);
                setEmailMsg('✅ Email settings saved!');
              } catch (e) { setEmailMsg('❌ ' + e.message); }
              finally { setEmailSaving(false); }
            }}
          >
            {emailSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', background: 'rgba(255, 122, 0, 0.03)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <Shield className="text-orange" size={24} />
          <div>
            <h3 style={{ margin: '0 0 8px 0' }}>Security Note</h3>
            <p className="text-sec" style={{ fontSize: '0.9rem', margin: 0 }}>
              Deletion of records (Orders, Contacts, Shipments) is strictly restricted to Super Admin users only.
              Standard admins can edit and view records but cannot remove them from the system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
