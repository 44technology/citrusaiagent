import express from 'express';
import { getAllUsers, updateUserRole, deleteUser, createUser, changePassword } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAllUsers);
router.post('/', createUser);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);
router.post('/change-password', changePassword);

export default router;
