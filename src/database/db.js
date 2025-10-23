import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB_PATH = './src/database/financeiro.db';

/**
 * Verifica se a tabela existe no banco de dados.
 * @param {object} db - Instância do banco de dados SQLite.
 * @param {string} tableName - Nome da tabela.
 * @returns {Promise<boolean>}
 */
async function checkTableExists(db, tableName) {
    const result = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
    return !!result;
}

/**
 * Inicializa a conexão com o banco de dados e cria as tabelas necessárias.
 * @returns {Promise<object>} - Instância do banco de dados.
 */
export async function initializeDatabase() {
    try {
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database,
        });

        const userTableExists = await checkTableExists(db, 'users');

        if (userTableExists) {
            console.log('✅ Banco conectado com sucesso.');
        } else {
            // Criação da tabela de Usuários
            await db.exec(`
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    senha TEXT NOT NULL,
                    cpf TEXT UNIQUE,
                    dt_nascimento DATE,
                    tipo_user INTEGER DEFAULT 2, 
                    status INTEGER DEFAULT 1, 
                    ultimo_login DATETIME
                );
            `);
            console.log('✅ Tabela users criada com sucesso.');
        }

        // ------------------------------------
        // NOVO: Criação da Tabela de Cartões
        // ------------------------------------
        await db.exec(`
            CREATE TABLE IF NOT EXISTS cartoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                nome_banco TEXT NOT NULL,
                nome_identificacao TEXT UNIQUE NOT NULL,
                limite_total REAL NOT NULL,
                valor_fatura REAL DEFAULT 0.0,
                status INTEGER DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('✅ Tabela cartoes verificada/criada com sucesso.');

        // ------------------------------------
        // NOVO: Criação da Tabela de Parcelamentos
        // ------------------------------------
        await db.exec(`
            CREATE TABLE IF NOT EXISTS condicoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id INTEGER NOT NULL,
                descricao TEXT NOT NULL,
                valor_total REAL NOT NULL,
                valor_parcela REAL NOT NULL,
                parcela_atual INTEGER NOT NULL,
                total_parcelas INTEGER NOT NULL,
                data_proxima_cobranca DATE NOT NULL,
                FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
            );
        `);
        console.log('✅ Tabela condicoes verificada/criada com sucesso.');


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