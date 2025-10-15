import { Router } from 'express';
import { 
    sendVerificationCodeController, 
    verifyAndRegisterUser, 
    loginUser, 
    getAllUsers 
} from '../controllers/userController.js';

const router = Router();

// Rota 1: Envia o código de verificação (inicia o processo de cadastro)
router.post('/send-code', sendVerificationCodeController);

// Rota 2: Verifica o código e finaliza o registro (CREATE)
router.post('/verify-register', verifyAndRegisterUser);

// Rota de Login (READ/Query)
router.post('/login', loginUser);

// Rota para listar todos os usuários (TESTE)
router.get('/', getAllUsers);

export default router;
