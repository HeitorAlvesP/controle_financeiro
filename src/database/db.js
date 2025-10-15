import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const DB_PATH = './src/database/financeiro.db';

// Função para inicializar o banco de dados
export async function initializeDatabase() {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });

    console.log('✅ Banco de dados conectado com sucesso!');

    // Cria a tabela de usuários conforme a estrutura solicitada
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL, -- Senha salva como string simples, conforme solicitado
        dt_nascimento DATE,
        ultimo_login DATETIME
      );
    `);
    
    console.log('✅ Tabela "users" verificada/criada com sucesso.');

    return db;
  } catch (error) {
    console.error('❌ Erro ao inicializar o banco de dados:', error.message);
    throw error;
  }
}

let dbInstance;

// Função para obter a instância do banco de dados (singleton)
export async function getDb() {
  if (!dbInstance) {
    dbInstance = await initializeDatabase();
  }
  return dbInstance;
}