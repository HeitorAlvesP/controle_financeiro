import { Router } from 'express';
import { 
    createCard,
    getAllCards,
    updateCard,
    deleteCard
} from '../controllers/cardController.js';
import { getUserProfileData } from '../controllers/userManagementController.js';

const router = Router();

// Aplica o middleware de autenticação (reutilizado do userManagementController) em todas as rotas
router.use(getUserProfileData);

// Rotas de Cartões (CRUD)
router.post('/', createCard);       // POST /cards
router.get('/', getAllCards);        // GET /cards
router.put('/:cardId', updateCard);  // PUT /cards/:cardId
router.delete('/:cardId', deleteCard); // DELETE /cards/:cardId (Soft Delete)

export default router;