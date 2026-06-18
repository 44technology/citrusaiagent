import express from 'express';
import multer from 'multer';
import * as documentController from '../controllers/documentController.js';

const router = express.Router();

// Allowed MIME types — executables and scripts are blocked
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  // Archives (for multi-document shipments)
  'application/zip',
  'application/x-zip-compressed',
]);

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}. Accepted: PDF, Word, Excel, images, CSV, ZIP.`), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter
});

router.get('/', documentController.getAllDocuments);
router.post('/', upload.single('file'), documentController.uploadDocument);
router.get('/:id/download', documentController.downloadDocument);
router.get('/:id/view', documentController.viewDocument);
router.patch('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);

export default router;
