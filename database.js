const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'database.db');

// Function to recreate the database
const recreateDb = () => {
  try {
    // Close existing connection if open
    if (db) {
      db.close();
    }
    
    // Remove existing database file
    const fs = require('fs');
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
      console.log('Existing database file removed');
    }
    
    // Create new database connection
    const newDb = new sqlite3.Database(DB_FILE, (err) => {
      if (err) {
        console.error('Erro ao criar o banco de dados', err.message);
      } else {
        console.log('Novo banco de dados criado com sucesso.');
        initDb();
      }
    });
    
    return newDb;
  } catch (error) {
    console.error('Error recreating database:', error);
  }
};

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    db.exec('PRAGMA journal_mode = WAL;', (err) => {
      if (err) console.error('Failed to enable WAL:', err);
    });
  }
});

const initDb = () => {
  // Add IF NOT EXISTS to avoid errors if tables already exist
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      createdAt TEXT NOT NULL,
      totalRevenue REAL DEFAULT 0,
      adminShare REAL DEFAULT 0,
      developerShare REAL DEFAULT 0
    );
  `;

  const createAppsTable = `
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      platform TEXT,
      filename TEXT NOT NULL,
      originalName TEXT,
      size INTEGER,
      ownerEmail TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      approved INTEGER DEFAULT 0,
      downloadCount INTEGER DEFAULT 0,
      totalRevenue REAL DEFAULT 0,
      adminShare REAL DEFAULT 0,
      developerShare REAL DEFAULT 0,
      screenshots TEXT, -- JSON array of screenshot filenames
      icon TEXT, -- Icon filename
      FOREIGN KEY (ownerEmail) REFERENCES users (email)
    );
  `;
  
  const createCheckoutsTable = `
    CREATE TABLE IF NOT EXISTS checkouts (
      id TEXT PRIMARY KEY,
      appId TEXT NOT NULL,
      userId TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (appId) REFERENCES apps (id),
      FOREIGN KEY (userId) REFERENCES users (id)
    );
  `;

  db.serialize(() => {
    db.exec(createUsersTable, (err) => {
      if (err) console.error("Erro ao criar tabela 'users'", err);
      else console.log("Tabela 'users' criada com sucesso");
    });
    db.exec(createAppsTable, (err) => {
      if (err) console.error("Erro ao criar tabela 'apps'", err);
      else console.log("Tabela 'apps' criada com sucesso");
    });
    db.exec(createCheckoutsTable, (err) => {
      if (err) console.error("Erro ao criar tabela 'checkouts'", err);
      else console.log("Tabela 'checkouts' criada com sucesso");
    });
    
    // Add missing columns to existing users table if they don't exist
    db.exec(`ALTER TABLE users ADD COLUMN totalRevenue REAL DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Erro ao adicionar coluna 'totalRevenue'", err.message);
    });
    db.exec(`ALTER TABLE users ADD COLUMN adminShare REAL DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Erro ao adicionar coluna 'adminShare'", err.message);
    });
    db.exec(`ALTER TABLE users ADD COLUMN developerShare REAL DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Erro ao adicionar coluna 'developerShare'", err.message);
    });
    
    // Add missing columns to existing apps table if they don't exist
    db.exec(`ALTER TABLE apps ADD COLUMN totalRevenue REAL DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Erro ao adicionar coluna 'totalRevenue'", err.message);
    });
    db.exec(`ALTER TABLE apps ADD COLUMN adminShare REAL DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Erro ao adicionar coluna 'adminShare'", err.message);
    });
    db.exec(`ALTER TABLE apps ADD COLUMN developerShare REAL DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Erro ao adicionar coluna 'developerShare'", err.message);
    });
    db.exec(`ALTER TABLE apps ADD COLUMN downloadCount INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Erro ao adicionar coluna 'downloadCount'", err.message);
    });
    db.exec(`ALTER TABLE apps ADD COLUMN icon TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Erro ao adicionar coluna 'icon'", err.message);
    });
    db.exec(`ALTER TABLE apps ADD COLUMN screenshots TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error("Erro ao adicionar coluna 'screenshots'", err.message);
    });
  });
};

// Promisify db methods
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Database query error:', err.message);
        console.error('Query:', query);
        console.error('Params:', params);
        reject(err);
      }
      else resolve(rows);
    });
  });
}

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        console.error('Database query error:', err.message);
        console.error('Query:', query);
        console.error('Params:', params);
        reject(err);
      }
      else resolve(row);
    });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        console.error('Database query error:', err.message);
        console.error('Query:', query);
        console.error('Params:', params);
        reject(err);
      }
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

module.exports = {
  initDb,
  db,
  dbAll,
  dbGet,
  dbRun,
  recreateDb
};