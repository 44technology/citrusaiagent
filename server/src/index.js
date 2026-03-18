import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import campaignRoutes from './routes/campaigns.js';
import uploadRoutes from './routes/upload.js';
import shipmentRoutes from './routes/shipments.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Auth routes (before middleware)
app.use('/api/auth', authRoutes);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook (public — called by Bland.ai)
app.post('/api/campaigns/webhook', (await import('./controllers/campaignController.js')).handleBlandWebhook);

// Auth middleware for all other /api routes
app.use('/api', authMiddleware);

// Protected routes
app.use('/api/contacts', contactRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/shipments', shipmentRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🍊 Citrus AI Caller server running on port ${PORT}`);
});
