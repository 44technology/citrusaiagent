import { Router } from 'express';
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  createVariety, updateVariety, deleteVariety,
  createSource, updateSource, deleteSource,
} from '../controllers/productController.js';

const router = Router();

// Products
router.get('/', getProducts);
router.post('/', createProduct);
router.patch('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Varieties (created under a product)
router.post('/:id/varieties', createVariety);
router.patch('/varieties/:varietyId', updateVariety);
router.delete('/varieties/:varietyId', deleteVariety);

// Sources (country + quarters, created under a variety)
router.post('/varieties/:varietyId/sources', createSource);
router.patch('/sources/:sourceId', updateSource);
router.delete('/sources/:sourceId', deleteSource);

export default router;
