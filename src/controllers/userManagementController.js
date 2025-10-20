import { getDb } from '../database/db.js';
import { sendVerificationCode } from '../services/emailService.js'; 

// Estrutura para gerenciar processos temporários (Alteração de Email)
// Note: Essa estrutura deve ser persistente em produção (ex: Redis ou DB).
const pendingEmailChanges = {};
const EXPIRATION_TIME_MS = 15 * 60 * 1000; // 15 minutos

// Função auxiliar para gerar um código de 6 dígitos
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// --- Rota de Verificação de Usuário (Middleware) ---
// Verifica se o usuário existe e retorna os dados completos (usado para GET e PUT/POST)
export const getUserProfileData = async (req, res, next) => {
    const userId = req.body.userId || req.params.userId; // Espera o userId do corpo da requisição (simulando token)

    if (!userId) {
        return res.status(401).json({ message: 'ID de usuário não fornecido.' });
    }

    try {
        const db = await getDb();
        // Seleciona TODOS os campos necessários para o perfil
        const user = await db.get(
            'SELECT id, nome, email, dt_nascimento, cpf, ultimo_login, senha FROM users WHERE id = ?', 
            [userId]
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        // Anexa os dados do usuário ao objeto de requisição para uso posterior nos controllers
        req.user = user;
        next();

    } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        return res.status(500).json({ message: 'Erro interno ao carregar perfil.' });
    }
};


// ----------------------------------------------------------------------
// Rota: PUT /users/management/name
// ----------------------------------------------------------------------
export const updateUserName = async (req, res) => {
    const { newName } = req.body;
    const { user } = req; // Dados do usuário anexados pelo middleware getUserProfileData

    if (!newName || newName.trim().length < 2) {
        return res.status(400).json({ message: 'O novo nome deve ter pelo menos 2 caracteres.' });
    }

    try {
        const db = await getDb();
        await db.run('UPDATE users SET nome = ? WHERE id = ?', [newName, user.id]);
        
        return res.status(200).json({ message: 'Nome atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar nome:', error);
        return res.status(500).json({ message: 'Erro interno ao atualizar nome.' });
    }
};


// ----------------------------------------------------------------------
// Rota: PUT /users/management/password
// ----------------------------------------------------------------------
export const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { user } = req;

    // Validação de senha fraca (básica)
    if (newPassword.length < 6 || newPassword === currentPassword) {
        return res.status(400).json({ message: 'A nova senha deve ter no mínimo 6 caracteres e ser diferente da atual.' });
    }

    // 1. Verifica se a senha atual está correta (como não estamos usando hash, é uma comparação direta)
    if (user.senha !== currentPassword) {
        return res.status(401).json({ message: 'Senha atual incorreta.' });
    }

    try {
        const db = await getDb();
        // ATENÇÃO: Salvando nova senha como string simples (conforme a solicitação inicial)
        await db.run('UPDATE users SET senha = ? WHERE id = ?', [newPassword, user.id]);
        
        return res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar senha:', error);
        return res.status(500).json({ message: 'Erro interno ao atualizar senha.' });
    }
};


// ----------------------------------------------------------------------
// Rota: POST /users/management/email/request-code (PASSO 1)
// ----------------------------------------------------------------------
export const requestEmailChangeCode = async (req, res) => {
    const { newEmail } = req.body;
    const { user } = req;

    if (newEmail === user.email) {
        return res.status(400).json({ message: 'O novo email não pode ser igual ao email atual.' });
    }

    try {
        const db = await getDb();
        // 1. Verifica se o novo email já está em uso por OUTRO usuário
        const existingEmailUser = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [newEmail, user.id]);
        
        if (existingEmailUser) {
            return res.status(409).json({ message: 'Este novo email já está em uso por outra conta.' });
        }

        // 2. Gera e armazena o código de verificação
        const code = generateCode();
        const expiration = Date.now() + EXPIRATION_TIME_MS;
        
        // Armazena o processo na fila pendente
        pendingEmailChanges[user.id] = {
            newEmail: newEmail,
            code: code,
            expiration: expiration
        };

        // 3. TENTA ENVIAR O E-MAIL REAL (para o NOVO e-mail)
        // NOTA: O 'sendVerificationCode' é o mesmo serviço que usamos no registro.
        const emailSent = await sendVerificationCode(newEmail, code);

        if (!emailSent) {
             delete pendingEmailChanges[user.id];
             return res.status(500).json({ message: 'Falha ao enviar o código de verificação para o novo e-mail.' });
        }

        return res.status(200).json({ 
            message: `Código enviado para ${newEmail}. Verifique sua caixa de entrada para continuar.`,
        });

    } catch (error) {
        console.error('Erro ao solicitar troca de email:', error);
        return res.status(500).json({ message: 'Erro interno ao iniciar a troca de email.' });
    }
};


// ----------------------------------------------------------------------
// Rota: PUT /users/management/email/verify-change (PASSO 2)
// ----------------------------------------------------------------------
export const verifyEmailChange = async (req, res) => {
    const { newEmail, code } = req.body;
    const { user } = req;
    
    if (!newEmail || !code) {
        return res.status(400).json({ message: 'Email e Código de verificação são obrigatórios.' });
    }

    const pending = pendingEmailChanges[user.id];

    // 1. Verifica o processo pendente
    if (!pending || pending.newEmail !== newEmail) {
        return res.status(400).json({ message: 'Processo de alteração de e-mail inválido. Tente novamente.' });
    }
    
    // 2. Valida o tempo e o código
    if (Date.now() > pending.expiration) {
        delete pendingEmailChanges[user.id]; 
        return res.status(400).json({ message: 'O código de verificação expirou.' });
    }
    if (pending.code !== code) {
        return res.status(401).json({ message: 'Código de verificação incorreto.' });
    }

    // 3. Código correto: Atualiza o email no banco
    try {
        const db = await getDb();
        await db.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, user.id]);

        // 4. Sucesso: remove da fila pendente
        delete pendingEmailChanges[user.id];
        
        return res.status(200).json({ 
            message: 'E-mail alterado e verificado com sucesso!', 
            newEmail
        });

    } catch (error) {
        console.error('Erro ao finalizar a troca de email:', error);
        return res.status(500).json({ message: 'Erro interno ao finalizar a troca de email.' });
    }
};