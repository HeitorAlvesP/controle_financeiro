import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/userRoutes.js';
import { getDb } from './database/db.js';
import { get } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');

const app = express();
const port = process.env.PORT || 3000;


app.use(express.json());

app.use('/users', userRoutes);

app.use(express.static(path.join(rootDir, 'frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'frontend/html/login.html'));
});

app.listen(port, async () => {
            await getDb();
            console.log(`✨ Servidor Express rodando na porta ${port}`);
            console.log(`🔗 Acesse http://localhost:${port}`);
});
