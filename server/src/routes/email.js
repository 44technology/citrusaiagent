import { Router } from 'express';
import { getEmailSettings, saveEmailSettings, sendEmails, testEmailConnection } from '../controllers/emailController.js';

const router = Router();

router.get('/settings',     getEmailSettings);
router.post('/settings',    saveEmailSettings);
router.post('/send',        sendEmails);
router.post('/test',        testEmailConnection);

export default router;
