import { Router } from 'express';
import { getProgramsByContact, createProgram, updateProgram, deleteProgram } from '../controllers/customerProgramController.js';

const router = Router();
router.get('/contact/:contactId', getProgramsByContact);
router.post('/', createProgram);
router.patch('/:id', updateProgram);
router.delete('/:id', deleteProgram);

export default router;
