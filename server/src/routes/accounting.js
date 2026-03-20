import express from 'express';
import * as accountingController from '../controllers/accountingController.js';

const router = express.Router();

// Purchase Orders
router.get('/purchase-orders', accountingController.getAllPurchaseOrders);
router.post('/purchase-orders', accountingController.createPurchaseOrder);
router.patch('/purchase-orders/:id', accountingController.updatePurchaseOrder);

// Invoices
router.get('/invoices', accountingController.getAllInvoices);
router.post('/invoices', accountingController.createInvoice);
router.patch('/invoices/:id', accountingController.updateInvoice);

// Actions
router.post('/convert-to-invoice/:orderId', accountingController.convertToInvoice);

export default router;
