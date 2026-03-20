import React, { useState, useEffect } from 'react';
import { Settings, Users, Shield, Trash2, Loader2, Save, UserX, CheckCircle } from 'lucide-react';
import { usersApi } from '../services/api';

const SettingsPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // stores userId being updated
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

      <div className="glass-panel" style={{ padding: '24px', background: 'rgba(255, 122, 0, 0.03)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <Shield className="text-orange" size={24} />
          <div>
            <h3 style={{ margin: '0 0 8px 0' }}>Security Note</h3>
            <p className="text-sec" style={{ fontSize: '0.9rem', margin: 0 }}>
              Deletion of records (Orders, Contacts, Shipments) is strictly restricted to **Super Admin** users only. 
              Standard admins can edit and view records but cannot remove them from the system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
