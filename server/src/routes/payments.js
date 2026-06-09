import express from 'express';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

router.get('/invoice/:invoiceId', paymentController.getPaymentsByInvoice);
router.post('/invoice/:invoiceId', paymentController.createPayment);
router.delete('/:id', paymentController.deletePayment);

export default router;
