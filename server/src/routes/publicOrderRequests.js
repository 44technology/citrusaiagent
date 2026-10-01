import { Router } from 'express';
import { getPublic, submitPublic } from '../controllers/orderRequestController.js';

const router = Router();
router.get('/:token', getPublic);
router.post('/:token/submit', submitPublic);

export default router;
