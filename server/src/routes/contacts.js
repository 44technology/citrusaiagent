import { Router } from 'express';
import {
  getContacts,
  getContact,
  createContact,
  createContactsBulk,
  updateContact,
  deleteContact,
  promoteContact,
  addNote,
  getNotes
} from '../controllers/contactController.js';

const router = Router();

router.get('/', getContacts);
router.post('/', createContact);
router.post('/bulk', createContactsBulk);
router.get('/:id', getContact);
router.patch('/:id', updateContact);
router.delete('/:id', deleteContact);
router.post('/:id/promote', promoteContact);
router.post('/:id/notes', addNote);
router.get('/:id/notes', getNotes);

export default router;
