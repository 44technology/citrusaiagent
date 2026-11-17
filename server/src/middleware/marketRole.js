// Market Data accounts: role 'market' (everything), 'market grapes' or 'market citrus'.
// They may only use the Market Data page — enforced here on the server, because
// hiding menu items in the UI is not enough.
export const isMarketRole = (role) => typeof role === 'string' && (role === 'market' || role.startsWith('market '));

// Which products the account may see: 'grapes' | 'citrus' | null (everything)
export const marketScope = (role) => (role === 'market grapes' ? 'grapes' : role === 'market citrus' ? 'citrus' : null);

export const restrictMarketRole = (req, res, next) => {
  if (!isMarketRole(req.user?.role)) return next();
  const url = req.originalUrl.split('?')[0].replace(/\/+$/, '');
  if (url === '/api/market-data' || url.startsWith('/api/market-data/') || url === '/api/users/change-password') return next();
  return res.status(403).json({ error: 'This account can only access Market Data' });
};
