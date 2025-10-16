import { Router } from 'express';
import { 
    sendVerificationCodeController, 
    verifyAndRegisterUser, 
    loginUser, 
    getAllUsers 
} from '../controllers/userController.js';

const router = Router();

router.post('/send-code', sendVerificationCodeController);

router.post('/verify-register', verifyAndRegisterUser);

router.post('/login', loginUser);

router.get('/', getAllUsers);

export default router;
