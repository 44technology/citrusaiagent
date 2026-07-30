import { Router } from 'express';
import { getCarriers, createCarrier, updateCarrier, deleteCarrier } from '../controllers/carrierController.js';

const router = Router();
router.get('/', getCarriers);
router.post('/', createCarrier);
router.patch('/:id', updateCarrier);
router.delete('/:id', deleteCarrier);

export default router;
