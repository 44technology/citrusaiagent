import { Router } from 'express';
import {
  getShipments, getShipment, getShipmentsByContact,
  createShipment, updateShipment, deleteShipment, importShipments,
  getEvents, createEvent, updateEvent, deleteEvent
} from '../controllers/shipmentController.js';
import {
  getExpenses, createExpense, updateExpense, deleteExpense
} from '../controllers/shipmentExpenseController.js';

const router = Router();

// Shipments
router.get('/', getShipments);
router.post('/', createShipment);
router.post('/import', importShipments);
router.get('/contact/:contactId', getShipmentsByContact);
router.get('/:id', getShipment);
router.patch('/:id', updateShipment);
router.delete('/:id', deleteShipment);

// Journey Events
router.get('/:id/events', getEvents);
router.post('/:id/events', createEvent);
router.patch('/:id/events/:eventId', updateEvent);
router.delete('/:id/events/:eventId', deleteEvent);

// Expenses & Revenue
router.get('/:id/expenses', getExpenses);
router.post('/:id/expenses', createExpense);
router.patch('/:id/expenses/:expenseId', updateExpense);
router.delete('/:id/expenses/:expenseId', deleteExpense);

export default router;
