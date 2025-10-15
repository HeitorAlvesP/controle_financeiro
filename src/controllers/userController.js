import { getDb } from '../database/db.js';
import { sendVerificationCode } from '../services/emailService.js'; 

// Estrutura para manter os cadastros pendentes na memória
const pendingRegistrations = {};
const EXPIRATION_TIME_MS = 15 * 60 * 1000; // 15 minutos

// Função auxiliar para gerar um código de 6 dígitos
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// ----------------------------------------------------------------------
// PASSO 1: Envia o Código de Verificação
// Rota: POST /users/send-code
// ----------------------------------------------------------------------
export const sendVerificationCodeController = async (req, res) => {
    const { nome, email, senha, dt_nascimento } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ message: 'Nome, Email e Senha são obrigatórios.' });
    }

    try {
        const db = await getDb();
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);

        if (existingUser) {
            return res.status(409).json({ message: 'Este email já está cadastrado.' });
        }

        const code = generateCode();
        const expiration = Date.now() + EXPIRATION_TIME_MS;

        pendingRegistrations[email] = {
            user: { nome, email, senha, dt_nascimento: dt_nascimento || null },
            code: code,
            expiration: expiration
        };
        
        // TENTA ENVIAR O E-MAIL REAL
        const emailSent = await sendVerificationCode(email, code);

        if (!emailSent) {
             delete pendingRegistrations[email];
             return res.status(500).json({ message: 'Falha ao enviar o código de verificação por e-mail. Verifique seu e-mail ou tente novamente mais tarde.' });
        }
        
        return res.status(200).json({ 
            message: `Código enviado para ${email}. Verifique sua caixa de entrada.`,
        });

    } catch (error) {
        console.error('Erro ao preparar registro:', error.message);
        return res.status(500).json({ message: 'Erro interno ao iniciar o registro.' });
    }
};

// ----------------------------------------------------------------------
// PASSO 2: Verifica o Código e Finaliza o Cadastro
// Rota: POST /users/verify-register
// ----------------------------------------------------------------------
export const verifyAndRegisterUser = async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ message: 'Email e Código de verificação são obrigatórios.' });
    }

    const pending = pendingRegistrations[email];

    if (!pending) {
        return res.status(400).json({ message: 'Processo de registro expirado ou não encontrado. Tente novamente.' });
    }
    if (Date.now() > pending.expiration) {
        delete pendingRegistrations[email]; 
        return res.status(400).json({ message: 'O código de verificação expirou. Comece o cadastro novamente.' });
    }
    if (pending.code !== code) {
        return res.status(401).json({ message: 'Código de verificação incorreto.' });
    }

    // Persiste o usuário no banco
    const user = pending.user;

    try {
        const db = await getDb();
        const result = await db.run(
            'INSERT INTO users (nome, email, senha, dt_nascimento, ultimo_login) VALUES (?, ?, ?, ?, ?)',
            [user.nome, user.email, user.senha, user.dt_nascimento, null]
        );

        delete pendingRegistrations[email];

        const userId = result.lastID;
        
        console.log(`Usuário ${userId} (${user.email}) registrado e verificado com sucesso.`);
        return res.status(201).json({ 
            message: 'Conta verificada e registrada com sucesso!', 
            userId,
            user: { nome: user.nome, email: user.email }
        });

    } catch (error) {
        console.error('Erro ao finalizar o registro:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao finalizar registro.' });
    }
};

// --- Funções de Login e Listagem (Mantidas) ---

export const loginUser = async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e Senha são obrigatórios para o login.' });
    }

    try {
        const db = await getDb();
        const user = await db.get('SELECT id, nome, email, senha FROM users WHERE email = ?', [email]);

        if (!user || user.senha !== senha) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const now = new Date().toISOString();
        await db.run('UPDATE users SET ultimo_login = ? WHERE id = ?', [now, user.id]);

        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            user: { id: user.id, nome: user.nome, email: user.email, ultimo_login: now }
        });

    } catch (error) {
        console.error('Erro ao realizar login:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao realizar login.' });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const db = await getDb();
        const users = await db.all('SELECT id, nome, email, dt_nascimento, ultimo_login FROM users');
        return res.status(200).json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao buscar usuários.' });
    }
};
