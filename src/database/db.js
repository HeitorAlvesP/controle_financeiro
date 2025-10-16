import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB_PATH = './src/database/financeiro.db';

export async function initializeDatabase() {
    try {
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database,
        });

        // 1. Verifica se a tabela 'users' já existe
        const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
        
        let logMessage;

        if (!tableExists) {
            // Se a tabela não existe, cria-a com todas as colunas
            await db.exec(`
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    senha TEXT NOT NULL,
                    dt_nascimento DATE,
                    ultimo_login DATETIME,
                    cpf TEXT UNIQUE,           -- Nova Coluna
                    tipo_user INTEGER DEFAULT 2, -- Nova Coluna (2: Padrão)
                    status INTEGER DEFAULT 1    -- Nova Coluna (1: Ativo)
                );
            `);
            // Mensagem solicitada quando a tabela é criada
            logMessage = '✅ Tabela users criada com sucesso.';
        } else {
            // Mensagem solicitada quando o banco já está conectado e a tabela existe
            logMessage = '✅ Banco conectado com sucesso.';
        }
        
        console.log(logMessage);


        return db;
    } catch (error) {
        console.error('❌ Erro ao inicializar o banco de dados:', error.message);
        throw error;
    }
}

let dbInstance;

export async function getDb() {
    if (!dbInstance) {
        dbInstance = await initializeDatabase();
    }
    return dbInstance;
}