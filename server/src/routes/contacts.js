import { Router } from 'express';
import {
  getContacts, getContact, createContact, createContactsBulk,
  updateContact, deleteContact, promoteContact, addNote, getNotes,
  getPersons, createPerson, updatePerson, deletePerson, importLeads,
  assignByCity
} from '../controllers/contactController.js';

const router = Router();

router.get('/', getContacts);
router.post('/', createContact);
router.post('/bulk', createContactsBulk);
router.post('/import-leads', importLeads);
router.patch('/assign-by-city', assignByCity);
router.get('/:id', getContact);
router.patch('/:id', updateContact);
router.delete('/:id', deleteContact);
router.post('/:id/promote', promoteContact);
router.post('/:id/notes', addNote);
router.get('/:id/notes', getNotes);

// Contact persons (people within a company)
router.get('/:id/persons',          getPersons);
router.post('/:id/persons',         createPerson);
router.patch('/:id/persons/:pid',   updatePerson);
router.delete('/:id/persons/:pid',  deletePerson);

export default router;
