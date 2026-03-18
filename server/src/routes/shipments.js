import { Router } from 'express';
import {
  getShipments,
  getShipment,
  getShipmentsByContact,
  createShipment,
  updateShipment,
  deleteShipment
} from '../controllers/shipmentController.js';

const router = Router();

router.get('/', getShipments);
router.post('/', createShipment);
router.get('/contact/:contactId', getShipmentsByContact);
router.get('/:id', getShipment);
router.patch('/:id', updateShipment);
router.delete('/:id', deleteShipment);

export default router;
