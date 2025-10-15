import express from 'express';
import { initializeDatabase } from './database/db.js';
import userRoutes from './routes/userRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

// Configuração para lidar com caminhos em módulos ES (import)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Acessa a pasta raiz (sobe um nível de 'src')
const rootDir = path.resolve(__dirname, '..'); 

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());

// -----------------------------------------------------------
// 1. CONFIGURAÇÃO ESTÁTICA: Apontar para a pasta 'frontend'
// Isso permite que o navegador acesse arquivos em 'frontend/html' e 'frontend/javascript'
app.use(express.static(path.join(rootDir, 'frontend')));
// -----------------------------------------------------------

// 2. ROTA RAIZ: Rota GET que serve o HTML principal na URL '/'
app.get('/', (req, res) => {
    // Redireciona para o arquivo index.html que está dentro de 'frontend/html'
    res.sendFile(path.join(rootDir, 'frontend', 'html', 'index.html'));
});

// Rotas de Usuário
// Ex: POST /users/register, POST /users/login
app.use('/users', userRoutes);

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
