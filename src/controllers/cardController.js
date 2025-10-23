import { getDb } from '../database/db.js';
import { getUserProfileData } from './userManagementController.js'; // Reutilizamos o middleware de autenticação

// Estrutura para armazenar o ID do usuário logado durante as requisições
// Note: Essa dependência de userId no corpo é uma simulação de autenticação via token/sessão.

/**
 * Cria um novo cartão de crédito para o usuário logado.
 * Rota: POST /cards
 */
export const createCard = async (req, res) => {
    // O middleware getUserProfileData já anexou req.user (com o ID)
    const userId = req.user.id; 
    const { nome_banco, nome_identificacao, limite_total } = req.body;

    if (!nome_banco || !nome_identificacao || limite_total === undefined || limite_total < 0) {
        return res.status(400).json({ message: 'Todos os campos do cartão (banco, identificação, limite) são obrigatórios.' });
    }

    try {
        const db = await getDb();
        
        // Verifica se já existe um cartão com o mesmo nome de identificação para este usuário
        const existingCard = await db.get(
            'SELECT id FROM cartoes WHERE user_id = ? AND nome_identificacao = ?',
            [userId, nome_identificacao]
        );

        if (existingCard) {
            return res.status(409).json({ message: 'Você já tem um cartão com este nome de identificação.' });
        }

        const result = await db.run(
            `INSERT INTO cartoes (user_id, nome_banco, nome_identificacao, limite_total) 
             VALUES (?, ?, ?, ?)`,
            [userId, nome_banco, nome_identificacao, limite_total]
        );

        return res.status(201).json({
            message: 'Cartão cadastrado com sucesso!',
            cardId: result.lastID,
            nome: nome_identificacao
        });

    } catch (error) {
        console.error('Erro ao cadastrar cartão:', error);
        return res.status(500).json({ message: 'Erro interno ao cadastrar cartão.' });
    }
};

/**
 * Lista todos os cartões do usuário logado.
 * Rota: GET /cards
 */
export const getAllCards = async (req, res) => {
    const userId = req.user.id;

    try {
        const db = await getDb();
        // Seleciona todos os campos, exceto o user_id, por segurança/clareza
        const cards = await db.all(
            `SELECT id, nome_banco, nome_identificacao, limite_total, valor_fatura, status 
             FROM cartoes 
             WHERE user_id = ? AND status = 1`,
            [userId]
        );

        return res.status(200).json(cards);

    } catch (error) {
        console.error('Erro ao listar cartões:', error);
        return res.status(500).json({ message: 'Erro interno ao listar cartões.' });
    }
};

/**
 * Atualiza os dados de um cartão existente (exceto user_id).
 * Rota: PUT /cards/:cardId
 */
export const updateCard = async (req, res) => {
    const userId = req.user.id;
    const cardId = req.params.cardId;
    const { nome_banco, nome_identificacao, limite_total } = req.body;

    if (!nome_banco || !nome_identificacao || limite_total === undefined || limite_total < 0) {
        return res.status(400).json({ message: 'Todos os campos do cartão são obrigatórios.' });
    }

    try {
        const db = await getDb();
        
        // 1. Verifica se o cartão pertence ao usuário
        const card = await db.get('SELECT id FROM cartoes WHERE id = ? AND user_id = ?', [cardId, userId]);
        
        if (!card) {
            return res.status(404).json({ message: 'Cartão não encontrado ou você não tem permissão.' });
        }

        const result = await db.run(
            `UPDATE cartoes 
             SET nome_banco = ?, nome_identificacao = ?, limite_total = ? 
             WHERE id = ?`,
            [nome_banco, nome_identificacao, limite_total, cardId]
        );

        if (result.changes === 0) {
             return res.status(400).json({ message: 'Nenhuma alteração foi realizada.' });
        }

        return res.status(200).json({ message: 'Cartão atualizado com sucesso!' });

    } catch (error) {
        console.error('Erro ao atualizar cartão:', error);
        return res.status(500).json({ message: 'Erro interno ao atualizar cartão.' });
    }
};

/**
 * Marca um cartão como inativo (soft delete).
 * Rota: DELETE /cards/:cardId (Usaremos PUT/status)
 */
export const deleteCard = async (req, res) => {
    const userId = req.user.id;
    const cardId = req.params.cardId;

    try {
        const db = await getDb();
        
        // Soft delete: Marca o status como 0 (Inativo)
        const result = await db.run(
            `UPDATE cartoes 
             SET status = 0 
             WHERE id = ? AND user_id = ?`,
            [cardId, userId]
        );

        if (result.changes === 0) {
             return res.status(404).json({ message: 'Cartão não encontrado ou você não tem permissão para excluí-lo.' });
        }

        // TODO: Em um sistema completo, você precisaria também marcar as 'condicoes' como inativas ou arquivá-las.
        
        return res.status(200).json({ message: 'Cartão desativado (excluído) com sucesso!' });

    } catch (error) {
        console.error('Erro ao excluir cartão:', error);
        return res.status(500).json({ message: 'Erro interno ao excluir cartão.' });
    }
};