import { Router } from 'express';
import {
  startCall,
  startBulkCampaign,
  handleBlandWebhook,
  checkCallStatus
} from '../controllers/campaignController.js';

const router = Router();

router.post('/call', startCall);
router.post('/bulk', startBulkCampaign);
router.post('/webhook', handleBlandWebhook);
router.get('/status/:callId', checkCallStatus);

export default router;
