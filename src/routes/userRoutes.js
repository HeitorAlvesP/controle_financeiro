import { Router } from 'express';
import { registerUser, loginUser, getAllUsers } from '../controllers/userController.js';

const router = Router();

// Rota de Registro (CREATE)
router.post('/register', registerUser);

// Rota de Login (READ/Query)
router.post('/login', loginUser);

// Rota para listar todos os usuários (TESTE)
router.get('/', getAllUsers);

export default router;