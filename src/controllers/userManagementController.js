import { getDb } from '../database/db.js';
import { sendVerificationCode } from '../services/emailService.js'; 

const pendingEmailChanges = {};
const EXPIRATION_TIME_MS = 15 * 60 * 1000; 

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const validateNewPasswordRules = (password) => {
    if (password.length < 6) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
};

// --- Rota de Verificação de Usuário (Middleware - CORRIGIDO) ---
export const getUserProfileData = async (req, res, next) => {
    // CORREÇÃO: Lê o ID do body (para POST/PUT) OU do query (para GET)
    const userId = req.query.userId || (req.body ? req.body.userId : undefined);

    if (!userId) {
        // Retorna 401 para o frontend saber que a sessão é inválida
        return res.status(401).json({ message: 'Sessão inválida. Usuário não identificado.' });
    }

    try {
        const db = await getDb();
        const user = await db.get(
            'SELECT id, nome, email, dt_nascimento, cpf, ultimo_login, senha FROM users WHERE id = ?', 
            [userId]
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        req.user = user;
        next();

    } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        return res.status(500).json({ message: 'Erro interno ao carregar perfil.' });
    }
};

// --- Rotas de Gerenciamento (MANTIDAS) ---

export const validateCurrentPassword = (req, res) => {
    const { currentPassword } = req.body;
    const { user } = req; 

    if (!currentPassword) {
        return res.status(400).json({ message: 'A senha atual é obrigatória para validação.' });
    }
    
    if (user.senha === currentPassword) {
        return res.status(200).json({ message: 'Senha validada com sucesso. Prossiga com a alteração.' });
    } else {
        return res.status(401).json({ message: 'Senha atual incorreta.' });
    }
};


export const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { user } = req;

    if (!validateNewPasswordRules(newPassword)) {
        return res.status(400).json({ message: 'A nova senha não atende aos requisitos de segurança (min. 6, maiúscula, minúscula, número).' });
    }
    
    if (user.senha !== currentPassword) {
        return res.status(401).json({ message: 'Senha atual incorreta. Tente novamente.' });
    }

    try {
        const db = await getDb();
        await db.run('UPDATE users SET senha = ? WHERE id = ?', [newPassword, user.id]);
        
        return res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar senha:', error);
        return res.status(500).json({ message: 'Erro interno ao atualizar senha.' });
    }
};


export const updateUserName = async (req, res) => {
    const { newName } = req.body;
    const { user } = req; 

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

export const requestEmailChangeCode = async (req, res) => {
    const { newEmail } = req.body;
    const { user } = req;

    if (newEmail === user.email) {
        return res.status(400).json({ message: 'O novo email não pode ser igual ao email atual.' });
    }

    try {
        const db = await getDb();
        const existingEmailUser = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [newEmail, user.id]);
        
        if (existingEmailUser) {
            return res.status(409).json({ message: 'Este novo email já está em uso por outra conta.' });
        }

        const code = generateCode();
        const expiration = Date.now() + EXPIRATION_TIME_MS;
        
        pendingEmailChanges[user.id] = {
            newEmail: newEmail,
            code: code,
            expiration: expiration
        };

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

export const verifyEmailChange = async (req, res) => {
    const { newEmail, code } = req.body;
    const { user } = req;
    
    if (!newEmail || !code) {
        return res.status(400).json({ message: 'Email e Código de verificação são obrigatórios.' });
    }

    const pending = pendingEmailChanges[user.id];

    if (!pending || pending.newEmail !== newEmail) {
        return res.status(400).json({ message: 'Processo de alteração de e-mail inválido. Tente novamente.' });
    }
    
    if (Date.now() > pending.expiration) {
        delete pendingEmailChanges[user.id]; 
        return res.status(400).json({ message: 'O código de verificação expirou.' });
    }
    if (pending.code !== code) {
        return res.status(401).json({ message: 'Código de verificação incorreto.' });
    }

    try {
        const db = await getDb();
        await db.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, user.id]);

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
