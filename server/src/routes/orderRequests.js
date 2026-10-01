import { Router } from 'express';
import { getAll, create, remove, approve, reject } from '../controllers/orderRequestController.js';

const router = Router();
router.get('/', getAll);
router.post('/', create);
router.post('/:id/approve', approve);
router.post('/:id/reject', reject);
router.delete('/:id', remove);

export default router;
