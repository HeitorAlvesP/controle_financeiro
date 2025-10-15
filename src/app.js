import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';

// Obter __dirname em módulos ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define o diretório raiz do projeto (um nível acima de 'src')
const rootDir = path.resolve(__dirname, '..');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para processar JSON no corpo das requisições
app.use(express.json());

// --- 1. ROTAS DA API (PRIORIDADE MÁXIMA) ---
// Qualquer requisição para /users/ será tratada aqui, evitando cair no static ou no get('/')
app.use('/users', userRoutes);

// --- 2. ARQUIVOS ESTÁTICOS DO FRONTEND ---
// Serve toda a pasta 'frontend' como raiz dos arquivos estáticos.
app.use(express.static(path.join(rootDir, 'frontend')));

// --- 3. ROTA PADRÃO (GET /) ---
// Rota padrão para servir o login.html na URL raiz (http://localhost:3000/)
app.get('/', (req, res) => {
    // Redireciona para o arquivo de login dentro da pasta 'html'
    res.sendFile(path.join(rootDir, 'frontend/html/login.html'));
});

// Inicialização do servidor
app.listen(port, () => {
            console.log(`✨ Servidor Express rodando na porta ${port}`);
            console.log(`🔗 Acesse http://localhost:${port}`);
        });
