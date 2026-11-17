// Accounts with the 'market' role may only use the Market Data page.
// Enforced here on the server — hiding menu items in the UI is not enough.
export const restrictMarketRole = (req, res, next) => {
  if (req.user?.role !== 'market') return next();
  const url = req.originalUrl.split('?')[0].replace(/\/+$/, '');
  if (url === '/api/market-data' || url.startsWith('/api/market-data/') || url === '/api/users/change-password') return next();
  return res.status(403).json({ error: 'This account can only access Market Data' });
};
