import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  // Skip auth for login and webhook endpoints
  if (req.path === '/api/auth/login' || req.path === '/api/campaigns/webhook' || req.path === '/api/health') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    // Company context — sent by frontend as X-Company-Id header
    req.companyId = req.headers['x-company-id'] || null;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
