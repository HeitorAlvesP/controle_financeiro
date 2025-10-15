import express from 'express';
import { initializeDatabase } from './database/db.js';
import userRoutes from './routes/userRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..'); 


app.use(express.json());
app.use(express.static(path.join(rootDir, 'frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'frontend', 'html', 'login.html'));
});

app.use('/users', userRoutes);

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
