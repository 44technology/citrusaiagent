import { Router } from 'express';
import {
  getShipments, getShipment, getShipmentsByContact,
  createShipment, updateShipment, deleteShipment,
  getEvents, createEvent, updateEvent, deleteEvent
} from '../controllers/shipmentController.js';

const router = Router();

// Shipments
router.get('/', getShipments);
router.post('/', createShipment);
router.get('/contact/:contactId', getShipmentsByContact);
router.get('/:id', getShipment);
router.patch('/:id', updateShipment);
router.delete('/:id', deleteShipment);

// Journey Events
router.get('/:id/events', getEvents);
router.post('/:id/events', createEvent);
router.patch('/:id/events/:eventId', updateEvent);
router.delete('/:id/events/:eventId', deleteEvent);

export default router;
