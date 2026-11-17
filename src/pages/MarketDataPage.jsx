import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// US citrus & grape import dashboard (USDA + Census). The dashboard is a
// self-contained HTML document served by the API behind the login; it is
// loaded with the user's token and shown in an iframe so its own styles and
// scripts can't touch the rest of the portal.
const MarketDataPage = () => {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('citrus_token');
    fetch(`${apiBase}/market-data/page`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(setHtml)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 24, color: '#ef4444' }}>Could not load Market Data: {error}</div>;
  if (!html) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--text-muted)' }}>
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }
  return (
    <iframe
      title="Market Data"
      srcDoc={html}
      // same-origin so the dashboard can send the portal token with its data request
      sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-forms"
      style={{ width: '100%', height: 'calc(100vh - 110px)', minHeight: 560, border: 0, borderRadius: 12, display: 'block' }}
    />
  );
};

export default MarketDataPage;
