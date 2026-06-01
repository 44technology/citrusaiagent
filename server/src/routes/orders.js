import express from 'express';
import * as orderController from '../controllers/orderController.js';

const router = express.Router();

router.get('/', orderController.getAllOrders);
router.get('/contact/:contactId', orderController.getContactOrders);
router.post('/', orderController.createOrder);
router.patch('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

export default router;
