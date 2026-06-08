import React, { useState, useEffect } from 'react';
import {
  Settings, Users, Shield, Trash2, Loader2, Save, UserX,
  Mail, Eye, EyeOff, UserPlus, CheckCircle2, XCircle, Lock, Key
} from 'lucide-react';
import { usersApi, emailApi } from '../services/api';

// ─── Role definitions ─────────────────────────────────────────────────────────

const ROLES = [
  { value: 'super admin',    label: 'Super Admin',    color: '#ef4444' },
  { value: 'admin',          label: 'Admin',          color: '#f97316' },
  { value: 'sales',          label: 'Sales',          color: '#a78bfa' },
  { value: 'logistics',      label: 'Logistics',      color: '#38bdf8' },
  { value: 'operation',      label: 'Operation',      color: '#fb923c' },
  { value: 'grower support', label: 'Grower Support', color: '#4ade80' },
  { value: 'accounting',     label: 'Accounting',     color: '#facc15' },
  { value: 'customer',       label: 'Customer',       color: '#94a3b8' },
];

// ─── Permission matrix ────────────────────────────────────────────────────────

const PAGES = [
  { key: 'dashboard',  label: 'Dashboard'     },
  { key: 'contacts',   label: 'Contacts'      },
  { key: 'shipments',  label: 'Shipments'     },
  { key: 'orders',     label: 'Orders'        },
  { key: 'accounting', label: 'Accounting'    },
  { key: 'outreach',   label: 'Outreach'      },
  { key: 'documents',  label: 'Documents'     },
  { key: 'settings',   label: 'Settings'      },
];

const DEFAULT_PERMS = {
  'super admin':    { dashboard: true,  contacts: true,  shipments: true,  orders: true,  accounting: true,  outreach: true,  documents: true,  settings: true  },
  'admin':          { dashboard: true,  contacts: true,  shipments: true,  orders: true,  accounting: true,  outreach: true,  documents: true,  settings: false },
  'sales':          { dashboard: true,  contacts: true,  shipments: false, orders: true,  accounting: false, outreach: true,  documents: true,  settings: false },
  'logistics':      { dashboard: true,  contacts: false, shipments: true,  orders: false, accounting: false, outreach: false, documents: true,  settings: false },
  'operation':      { dashboard: true,  contacts: true,  shipments: true,  orders: true,  accounting: false, outreach: false, documents: true,  settings: false },
  'grower support': { dashboard: true,  contacts: true,  shipments: true,  orders: false, accounting: false, outreach: false, documents: false, settings: false },
  'accounting':     { dashboard: true,  contacts: false, shipments: false, orders: true,  accounting: true,  outreach: false, documents: true,  settings: false },
  'customer':       { dashboard: false, contacts: false, shipments: true,  orders: false, accounting: false, outreach: false, documents: false, settings: false },
};

const RoleBadge = ({ role }) => {
  const r = ROLES.find(x => x.value === role) || { label: role, color: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.74rem', fontWeight: 700,
      background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}30`
    }}>{r.label}</span>
  );
};

// ─── Create User Form ─────────────────────────────────────────────────────────

const CreateUserForm = ({ onCreated, callerIsSuperAdmin }) => {
  const [form, setForm] = useState({ username: '', password: '', role: 'operation' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setMsg('❌ Username and password are required'); return; }
    setSaving(true); setMsg('');
    try {
      const user = await usersApi.create(form);
      setMsg('✅ User created successfully');
      setForm({ username: '', password: '', role: 'operation' });
      onCreated(user);
    } catch (err) {
      setMsg('❌ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
        {/* Username */}
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>USERNAME</label>
          <input
            className="ui-input"
            placeholder="e.g. john.smith"
            value={form.username}
            onChange={e => set('username', e.target.value)}
            autoComplete="off"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>PASSWORD</label>
          <div style={{ position: 'relative' }}>
            <input
              className="ui-input"
              type={showPw ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              autoComplete="new-password"
              required
              style={{ paddingRight: 38 }}
            />
            <button type="button" onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Role */}
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>ROLE</label>
          <select className="ui-input" value={form.role} onChange={e => set('role', e.target.value)}>
            {ROLES.filter(r => callerIsSuperAdmin || r.value !== 'super admin').map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {/* Submit */}
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ whiteSpace: 'nowrap' }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <><UserPlus size={15} /> Create User</>}
        </button>
      </div>

      {msg && (
        <div style={{
          marginTop: 10, padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem',
          background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.startsWith('✅') ? '#22c55e' : '#f87171',
        }}>{msg}</div>
      )}
    </form>
  );
};

// ─── Permissions Matrix ───────────────────────────────────────────────────────

const PermissionsMatrix = () => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr>
            <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-glass)', whiteSpace: 'nowrap' }}>
              PAGE / FEATURE
            </th>
            {ROLES.map(r => (
              <th key={r.value} style={{ padding: '10px 10px', textAlign: 'center', borderBottom: '1px solid var(--border-glass)', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: r.color }}>{r.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PAGES.map((page, i) => (
            <tr key={page.key} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
              <td style={{ padding: '9px 14px', color: 'var(--text-primary)', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {page.label}
              </td>
              {ROLES.map(r => {
                const has = DEFAULT_PERMS[r.value]?.[page.key];
                return (
                  <td key={r.value} style={{ padding: '9px 10px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {has
                      ? <CheckCircle2 size={16} style={{ color: '#22c55e', margin: 'auto' }} />
                      : <XCircle size={16} style={{ color: 'rgba(255,255,255,0.1)', margin: 'auto' }} />
                    }
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // users | email | permissions

  // Email settings
  const [emailForm, setEmailForm] = useState({
    email_host: 'smtp.office365.com', email_port: '587',
    email_user: '', email_pass: '', email_from_name: 'Sweet Fresh', email_signature: '',
  });
  const [emailSaving, setEmailSaving]   = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailMsg, setEmailMsg]         = useState('');
  const [showPass, setShowPass]         = useState(false);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('citrus_user') || '{}'); } catch { return {}; }
  })();
  const isSuperAdmin = currentUser?.role === 'super admin';
  const isAdmin = ['super admin', 'admin'].includes(currentUser?.role);

  useEffect(() => {
    loadUsers();
    emailApi.getSettings().then(s => setEmailForm(p => ({ ...p, ...s }))).catch(() => {});
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setUsers(await usersApi.getAll());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      setSaving(userId);
      await usersApi.updateRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSaving(null); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await usersApi.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) { alert('Failed: ' + err.message); }
  };

  if (!isAdmin) {
    return (
      <div className="flex-center" style={{ height: '80vh', flexDirection: 'column', gap: 16 }}>
        <Shield size={64} style={{ opacity: 0.15, color: 'var(--text-muted)' }} />
        <h2 style={{ color: 'var(--text-muted)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Only Admin and Super Admin can access settings.</p>
      </div>
    );
  }

  const tabs = [
    { key: 'users',       label: 'User Management', icon: Users },
    { key: 'email',       label: 'Email Config',     icon: Mail  },
    { key: 'permissions', label: 'Permissions',      icon: Shield },
  ];

  return (
    <div className="page-container fade-in" style={{ padding: '28px 32px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Settings size={30} style={{ color: 'var(--orange-primary)' }} />
        <div>
          <h1 style={{ fontSize: '1.6rem', margin: 0 }}>System Settings</h1>
          <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            User management, email configuration, and role permissions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border-glass)', paddingBottom: 0 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--orange-primary)' : 'var(--text-muted)',
                fontWeight: active ? 700 : 500, fontSize: '0.88rem',
                borderBottom: active ? '2px solid var(--orange-primary)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.2s',
              }}>
              <Icon size={15} />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Users ── */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Create User Card — super admin only */}
          {isSuperAdmin && (
            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <Key size={17} style={{ color: 'var(--orange-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Create New User</h3>
              </div>
              <CreateUserForm onCreated={u => setUsers(p => [u, ...p])} callerIsSuperAdmin={isSuperAdmin} />
            </div>
          )}

          {/* User List */}
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={17} style={{ color: 'var(--orange-primary)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>All Users</h3>
              <span style={{ marginLeft: 6, background: 'rgba(255,107,0,0.12)', color: 'var(--orange-primary)', padding: '1px 9px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
                {users.length}
              </span>
            </div>

            {loading ? (
              <div className="flex-center" style={{ height: 160 }}>
                <Loader2 className="animate-spin" size={28} style={{ color: 'var(--orange-primary)' }} />
              </div>
            ) : (
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>USERNAME</th>
                    <th>LINKED CONTACT</th>
                    <th>ROLE</th>
                    <th>CREATED</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.username}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {u.id.slice(-8)}</div>
                      </td>
                      <td>
                        {u.contact
                          ? <div><div style={{ fontSize: '0.88rem' }}>{u.contact.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.contact.company}</div></div>
                          : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>System / Admin</span>}
                      </td>
                      <td>
                        {isAdmin ? (
                          <>
                            <select
                              className="ui-input"
                              value={u.role}
                              onChange={e => handleUpdateRole(u.id, e.target.value)}
                              disabled={saving === u.id || u.id === currentUser.id}
                              style={{ padding: '4px 8px', fontSize: '0.82rem', width: 150 }}
                            >
                              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            {saving === u.id && <Loader2 size={13} className="animate-spin" style={{ marginLeft: 6, color: 'var(--orange-primary)', verticalAlign: 'middle' }} />}
                          </>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {new Date(u.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isAdmin && (
                          <button
                            className="btn btn-glass"
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === currentUser.id}
                            style={{ padding: '5px 7px', color: u.id === currentUser.id ? 'var(--text-muted)' : '#ef4444' }}
                            title="Delete User"
                          >
                            <UserX size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Email ── */}
      {activeTab === 'email' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <Mail style={{ color: 'var(--orange-primary)' }} size={20} />
            <div>
              <h3 style={{ margin: 0 }}>Email Configuration</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                GoDaddy Microsoft 365 SMTP — used by the Outreach page
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[
              { key: 'email_host',      label: 'SMTP Host',     placeholder: 'smtp.office365.com' },
              { key: 'email_port',      label: 'SMTP Port',     placeholder: '587' },
              { key: 'email_user',      label: 'Email Address', placeholder: 'you@swtfresh.com' },
              { key: 'email_from_name', label: 'Display Name',  placeholder: 'Sweet Fresh' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>{f.label.toUpperCase()}</label>
                <input className="ui-input" placeholder={f.placeholder} value={emailForm[f.key] || ''}
                  onChange={e => setEmailForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
              EMAIL PASSWORD / APP PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input className="ui-input" type={showPass ? 'text' : 'password'}
                placeholder="Your email password"
                value={emailForm.email_pass || ''}
                onChange={e => setEmailForm(p => ({ ...p, email_pass: e.target.value }))}
                style={{ paddingRight: 44 }} />
              <button onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
              EMAIL SIGNATURE (HTML supported)
            </label>
            <textarea value={emailForm.email_signature || ''}
              onChange={e => setEmailForm(p => ({ ...p, email_signature: e.target.value }))}
              placeholder={'<strong>Ali Akdogan</strong><br/>Regional Sales Director — Sweet Fresh'}
              rows={5}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', borderRadius: 8, color: 'white', fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical', outline: 'none' }} />
          </div>

          {emailMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: '0.85rem',
              background: emailMsg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${emailMsg.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: emailMsg.startsWith('✅') ? '#22c55e' : '#f87171',
            }}>{emailMsg}</div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-glass" disabled={emailTesting}
              onClick={async () => {
                setEmailTesting(true); setEmailMsg('');
                try {
                  await emailApi.saveSettings(emailForm);
                  await emailApi.test();
                  setEmailMsg('✅ SMTP connection successful!');
                } catch (e) { setEmailMsg('❌ ' + e.message); }
                finally { setEmailTesting(false); }
              }}>
              {emailTesting ? 'Testing…' : 'Test Connection'}
            </button>
            <button className="btn btn-primary" disabled={emailSaving}
              onClick={async () => {
                setEmailSaving(true); setEmailMsg('');
                try {
                  await emailApi.saveSettings(emailForm);
                  setEmailMsg('✅ Email settings saved!');
                } catch (e) { setEmailMsg('❌ ' + e.message); }
                finally { setEmailSaving(false); }
              }}>
              <Save size={14} /> {emailSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Permissions ── */}
      {activeTab === 'permissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Role legend */}
          <div className="glass-panel" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 12 }}>ROLES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ROLES.map(r => (
                <div key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', background: `${r.color}10`, border: `1px solid ${r.color}25`, borderRadius: 20 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: r.color }}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Matrix */}
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={15} style={{ color: 'var(--orange-primary)' }} />
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Page Access by Role</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={12} style={{ display: 'inline', color: '#22c55e', verticalAlign: 'middle', marginRight: 4 }} />= Access
                <XCircle size={12} style={{ display: 'inline', color: 'rgba(255,255,255,0.15)', verticalAlign: 'middle', marginLeft: 10, marginRight: 4 }} />= No Access
              </span>
            </div>
            <div style={{ padding: 16 }}>
              <PermissionsMatrix />
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 16, background: 'rgba(255,107,0,0.03)', border: '1px solid rgba(255,107,0,0.1)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Shield size={20} style={{ color: 'var(--orange-primary)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 4 }}>Security Note</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: 0, lineHeight: 1.6 }}>
                  Delete operations (contacts, shipments, orders) are restricted to <strong>Super Admin</strong> and <strong>Admin</strong> roles only.
                  <br />Role changes and user creation are restricted to <strong>Super Admin</strong> only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
