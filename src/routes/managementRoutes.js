import { Router } from 'express';
import { 
    getUserProfileData,
    updateUserName,
    updatePassword,
    validateCurrentPassword, // Importação da nova função
    requestEmailChangeCode,
    verifyEmailChange
} from '../controllers/userManagementController.js';

const router = Router();

// Aplica o middleware de autenticação em todas as rotas de gerenciamento
router.use(getUserProfileData); 

// Rota de Gerenciamento de Nome
router.put('/name', updateUserName);

// Rotas de Gerenciamento de Senha
router.post('/password/validate', validateCurrentPassword); // NOVO: Valida a senha atual
router.put('/password', updatePassword);

// Rotas de Gerenciamento de E-mail
router.post('/email/request-code', requestEmailChangeCode); 
router.put('/email/verify-change', verifyEmailChange);     

export default router;