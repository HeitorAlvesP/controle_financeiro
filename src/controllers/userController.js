import { getDb } from '../database/db.js';

// Função para registrar um novo usuário
export const registerUser = async (req, res) => {
    const { nome, email, senha, dt_nascimento } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ message: 'Nome, Email e Senha são obrigatórios.' });
    }

    const user = { 
        nome, 
        email, 
        senha, // ATENÇÃO: Salvando como string simples, conforme sua solicitação.
        dt_nascimento: dt_nascimento || null,
        ultimo_login: null
    };

    try {
        const db = await getDb();
        const result = await db.run(
            'INSERT INTO users (nome, email, senha, dt_nascimento, ultimo_login) VALUES (?, ?, ?, ?, ?)',
            [user.nome, user.email, user.senha, user.dt_nascimento, user.ultimo_login]
        );

        const userId = result.lastID;
        
        console.log(`Usuário ${userId} (${user.email}) registrado com sucesso.`);
        return res.status(201).json({ 
            message: 'Usuário registrado com sucesso!', 
            userId,
            user: { nome: user.nome, email: user.email }
        });

    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed: users.email')) {
            return res.status(409).json({ message: 'Este email já está cadastrado.' });
        }
        console.error('Erro ao registrar usuário:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao registrar usuário.' });
    }
};

// Função para autenticar o login do usuário
export const loginUser = async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e Senha são obrigatórios para o login.' });
    }

    try {
        const db = await getDb();
        // Busca o usuário. Não traz a senha na seleção final para evitar exposição desnecessária no código.
        const user = await db.get('SELECT id, nome, email, senha FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas. Usuário não encontrado.' });
        }

        // Comparação de senha simples, conforme solicitado.
        if (user.senha !== senha) {
            return res.status(401).json({ message: 'Credenciais inválidas. Senha incorreta.' });
        }

        // Atualiza a data do último login
        const now = new Date().toISOString();
        await db.run('UPDATE users SET ultimo_login = ? WHERE id = ?', [now, user.id]);

        console.log(`Usuário ${user.id} (${user.email}) logado com sucesso.`);

        // Retorna informações básicas do usuário (SEM a senha)
        return res.status(200).json({
            message: 'Login realizado com sucesso!',
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                ultimo_login: now
            }
        });

    } catch (error) {
        console.error('Erro ao realizar login:', error);
        return res.status(500).json({ message: 'Erro interno do servidor ao realizar login.' });
    }
};

// Função auxiliar para listar todos os usuários (útil para teste e desenvolvimento)
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