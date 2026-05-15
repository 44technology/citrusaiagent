const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('citrus_token');
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options
  });

  // If unauthorized, redirect to login
  if (res.status === 401) {
    localStorage.removeItem('citrus_token');
    localStorage.removeItem('citrus_user');
    window.location.reload();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'API request failed');
  }
  return res.json();
}

// ─── Contacts ────────────────────────────────────────
export const contactsApi = {
  getAll: (type) => request(`/contacts${type ? `?type=${type}` : ''}`),
  getOne: (id) => request(`/contacts/${id}`),
  create: (data) => request('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),
  promote: (id) => request(`/contacts/${id}/promote`, { method: 'POST' }),
  addNote: (id, text, isSystem = false) =>
    request(`/contacts/${id}/notes`, { method: 'POST', body: JSON.stringify({ text, isSystem }) }),
  getNotes: (id) => request(`/contacts/${id}/notes`),
};

// ─── Upload ──────────────────────────────────────────
export const uploadApi = {
  excel: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData, headers });
    if (res.status === 401) {
      localStorage.removeItem('citrus_token');
      window.location.reload();
      throw new Error('Session expired');
    }
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }
};

// ─── Campaigns ───────────────────────────────────────
export const campaignApi = {
  startCall: (contactId, settings) =>
    request('/campaigns/call', { method: 'POST', body: JSON.stringify({ contactId, settings }) }),
  startBulk: (contactIds, settings) =>
    request('/campaigns/bulk', { method: 'POST', body: JSON.stringify({ contactIds, settings }) }),
  getStatus: (callId) => request(`/campaigns/status/${callId}`),
};

// ─── Shipments ───────────────────────────────────────
export const shipmentsApi = {
  getAll: () => request('/shipments'),
  getByContact: (contactId) => request(`/shipments/contact/${contactId}`),
  getOne: (id) => request(`/shipments/${id}`),
  create: (data) => request('/shipments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/shipments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/shipments/${id}`, { method: 'DELETE' }),
  import: (rows) => request('/shipments/import', { method: 'POST', body: JSON.stringify({ rows }) }),
  // Journey events
  getEvents: (id) => request(`/shipments/${id}/events`),
  createEvent: (id, data) => request(`/shipments/${id}/events`, { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, eventId, data) => request(`/shipments/${id}/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEvent: (id, eventId) => request(`/shipments/${id}/events/${eventId}`, { method: 'DELETE' }),
};
// ─── Orders ──────────────────────────────────────────
export const ordersApi = {
  getAll: () => request('/orders'),
  getByContact: (contactId) => request(`/orders/contact/${contactId}`),
  getOne: (id) => request(`/orders/${id}`),
  create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
};

// ─── Accounting ──────────────────────────────────────
export const accountingApi = {
  // Purchase Orders
  getAllPOs: () => request('/accounting/purchase-orders'),
  createPO: (data) => request('/accounting/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePO: (id, data) => request(`/accounting/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  
  // Invoices
  getAllInvoices: () => request('/accounting/invoices'),
  createInvoice: (data) => request('/accounting/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id, data) => request(`/accounting/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  
  // Actions
  convertToInvoice: (orderId) => request(`/accounting/convert-to-invoice/${orderId}`, { method: 'POST' }),
};

// ─── Users ───────────────────────────────────────────
export const usersApi = {
  getAll: () => request('/users'),
  updateRole: (id, role) => request(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

// ─── Payments ────────────────────────────────────────
export const paymentsApi = {
  getByInvoice: (invoiceId) => request(`/payments/invoice/${invoiceId}`),
  create: (invoiceId, data) =>
    request(`/payments/invoice/${invoiceId}`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/payments/${id}`, { method: 'DELETE' }),
};

// ─── Documents ───────────────────────────────────────
export const documentsApi = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    ).toString();
    return request(`/documents${params ? `?${params}` : ''}`);
  },
  upload: async (file, meta = {}) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(meta).forEach(([k, v]) => { if (v) formData.append(k, v); });
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/documents`, { method: 'POST', body: formData, headers });
    if (res.status === 401) {
      localStorage.removeItem('citrus_token');
      window.location.reload();
      throw new Error('Session expired');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },
  delete: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
};
