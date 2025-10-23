import express from 'express';
import { initializeDatabase } from './database/db.js';
import userRoutes from './routes/userRoutes.js';
import managementRoutes from './routes/managementRoutes.js'; 
import cardRoutes from './routes/cardRoutes.js'; // Importa as novas rotas de cartões
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// Obter __dirname em módulos ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..'); 

// Middleware para processar JSON
app.use(express.json());

// --- 1. ROTAS DE AUTENTICAÇÃO (REGISTRO/LOGIN) ---
app.use('/users', userRoutes);

// --- 2. ROTAS DE GERENCIAMENTO DE PERFIL ---
// Rota principal para todas as ações do painel da conta (PUT /users/management/name, etc.)
app.use('/users/management', managementRoutes);

// --- 3. NOVAS ROTAS DE CARTÕES ---
app.use('/cards', cardRoutes); // Endpoint principal para Cartões

// --- 4. ARQUIVOS ESTÁTICOS DO FRONTEND ---
app.use(express.static(path.join(rootDir, 'frontend')));

// Rota padrão para servir o login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'frontend/html/login.html'));
});

// Inicialização do Banco de Dados e do Servidor
(async () => {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`✨ Servidor Express rodando na porta ${PORT}`);
            console.log(`🔗 Acesse http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('🚨 Falha ao iniciar a aplicação:', error.message);
        process.exit(1);
    }
})();