import { Router } from 'express';
import multer from 'multer';
import { uploadExcel } from '../controllers/uploadController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), uploadExcel);

export default router;
