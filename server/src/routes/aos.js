import { Router } from 'express';
import { getByShipment, getAll, upsertForShipment, deleteAos } from '../controllers/aosController.js';

const router = Router();
router.get('/', getAll);
router.get('/by-shipment/:shipmentId', getByShipment);
router.post('/by-shipment/:shipmentId', upsertForShipment);
router.delete('/:id', deleteAos);

export default router;
