import { Router } from 'express';
import { 
    getUserProfileData,
    updateUserName,
    updatePassword,
    requestEmailChangeCode,
    verifyEmailChange
} from '../controllers/userManagementController.js';

const router = Router();

// Aplica o middleware de autenticação (getUserProfileData) em todas as rotas de gerenciamento
// Este middleware anexa os dados do usuário logado à requisição (req.user)
router.use(getUserProfileData); 

// Rota de Gerenciamento de Nome
router.put('/name', updateUserName);

// Rota de Gerenciamento de Senha
router.put('/password', updatePassword);

// Rotas de Gerenciamento de E-mail (Fluxo de 2 passos)
router.post('/email/request-code', requestEmailChangeCode); // Passo 1: Envia código
router.put('/email/verify-change', verifyEmailChange);     // Passo 2: Verifica e altera

export default router;