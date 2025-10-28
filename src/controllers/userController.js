import { getDb } from '../database/db.js';
import { sendVerificationCode } from '../services/emailService.js'; 

// Estrutura para manter os cadastros pendentes na memória
const pendingRegistrations = {};
const EXPIRATION_TIME_MS = 15 * 60 * 1000; 
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();


const validateCPF = (cpf) => {
    if (!cpf) return false;
    // Remove caracteres não numéricos e verifica se tem 11 dígitos
    const cleanCpf = cpf.replace(/\D/g, '');
    return cleanCpf.length === 11;
};


// ----------------------------------------------------------------------
// PASSO 1: Envia o Código de Verificação
// Rota: POST /users/send-code
// ----------------------------------------------------------------------
export const sendVerificationCodeController = async (req, res) => {
    // Adicionado 'cpf' à desestruturação
    const { nome, email, senha, dt_nascimento, cpf } = req.body;

    if (!nome || !email || !senha || !cpf) {
        return res.status(400).json({ message: 'Nome, Email, Senha e CPF são obrigatórios.' });
    }

    if (!validateCPF(cpf)) {
        return res.status(400).json({ message: 'O formato do CPF é inválido. Utilize apenas 11 dígitos numéricos.' });
    }

    try {
        const db = await getDb();
        // 1. Verifica se o email OU o CPF já existem no banco
        const existingUser = await db.get('SELECT email, cpf FROM users WHERE email = ? OR cpf = ?', [email, cpf]);

        if (existingUser) {
            // Verifica qual campo causou a falha de unicidade para retornar uma mensagem específica
            if (existingUser.email === email) {
                return res.status(409).json({ message: 'Este email já está cadastrado.' });
            }
            if (existingUser.cpf === cpf) {
                // CORREÇÃO: Esta verificação é crucial para evitar o erro SQLITE_CONSTRAINT
                return res.status(409).json({ message: 'Este CPF já está cadastrado.' });
            }
            return res.status(409).json({ message: 'Usuário já cadastrado com este e-mail ou CPF.' });
        }

        // 2. Gera e armazena o código de verificação
        const code = generateCode();
        const expiration = Date.now() + EXPIRATION_TIME_MS;

        // Armazena todos os dados, incluindo o CPF
        pendingRegistrations[email] = {
            user: { nome, email, senha, dt_nascimento: dt_nascimento || null, cpf },
            code: code,
            expiration: expiration
        };
        
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

    // Valores padrão para as novas colunas
    const tipoUser = 2; // Padrão
    const status = 1;   // Padrão

    try {
        const db = await getDb();
        // CORREÇÃO: INSERÇÃO COMPLETA com cpf, tipo_user e status
        const result = await db.run(
            `INSERT INTO users (nome, email, senha, dt_nascimento, cpf, tipo_user, status, ultimo_login) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user.nome, 
                user.email, 
                user.senha, 
                user.dt_nascimento, 
                user.cpf, // Novo campo
                tipoUser, // Novo campo (padrão 2)
                status,   // Novo campo (padrão 1)
                null
            ]
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
        // Em um cenário de erro inesperado, ainda é bom informar o usuário
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
        // GARANTINDO que todos os campos sejam selecionados
        const user = await db.get(
            'SELECT id, nome, email, senha, cpf, dt_nascimento, tipo_user, status FROM users WHERE email = ?', 
            [email]
        );

        if (!user || user.senha !== senha) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        if (user.status !== 1) {
             return res.status(403).json({ message: 'Sua conta está inativa.' });
        }

        const now = new Date().toISOString();
        await db.run('UPDATE users SET ultimo_login = ? WHERE id = ?', [now, user.id]);

        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            // Retorna o objeto user COMPLETO para o frontend salvar
            user: { 
                id: user.id, 
                nome: user.nome, 
                email: user.email, 
                cpf: user.cpf, 
                dt_nascimento: user.dt_nascimento,
                tipo_user: user.tipo_user,
                status: user.status,
                ultimo_login: now 
            }
        });

    } catch (error) {
        console.error('Erro ao realizar login:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao realizar login.' });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const db = await getDb();
        const users = await db.all('SELECT id, nome, email, dt_nascimento, ultimo_login, cpf, tipo_user, status FROM users');
        return res.status(200).json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao buscar usuários.' });
    }
};