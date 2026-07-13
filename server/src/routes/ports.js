import { Router } from 'express';
import { getPorts, createPort, deletePort } from '../controllers/portController.js';

const router = Router();
router.get('/', getPorts);
router.post('/', createPort);
router.delete('/:id', deletePort);

export default router;
