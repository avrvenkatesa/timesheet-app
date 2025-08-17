# Create a fixed version that conditionally loads better-sqlite3
cat > server/index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db;
let pgClient;
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

// Only require better-sqlite3 in development
let Database;
if (!isProduction) {
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.log('SQLite not available, using PostgreSQL only mode');
  }
}

async function initializeDatabase() {
  if (isProduction || !Database) {
    // Use PostgreSQL on Railway
    console.log('Using PostgreSQL database');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });

    await client.connect();
    console.log('Connected to PostgreSQL');

    // Create tables in PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        date DATE,
        project_id INTEGER,
        hours DECIMAL,
        description TEXT,
        billable BOOLEAN DEFAULT true
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_info (
        id SERIAL PRIMARY KEY,
        from_name TEXT,
        from_address TEXT,
        from_email TEXT,
        from_phone TEXT,
        to_name TEXT,
        to_address TEXT,
        to_email TEXT,
        to_phone TEXT
      )
    `);

    console.log('PostgreSQL tables created');
    return client;

  } else {
    // Use SQLite for local development
    console.log('Using SQLite database for development');
    const dbPath = path.join(__dirname, 'database.sqlite');
    db = new Database(dbPath);

    // Create tables in SQLite
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        project_id INTEGER,
        hours REAL,
        description TEXT,
        billable INTEGER DEFAULT 1
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS invoice_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_name TEXT,
        from_address TEXT,
        from_email TEXT,
        from_phone TEXT,
        to_name TEXT,
        to_address TEXT,
        to_email TEXT,
        to_phone TEXT
      )
    `);

    console.log('SQLite tables created');
    return db;
  }
}

// Initialize database
initializeDatabase().then(result => {
  if (isProduction || !Database) {
    pgClient = result;
  }
  console.log('Database initialized');
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running',
    database: pgClient ? 'PostgreSQL' : 'SQLite',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    if (pgClient) {
      const result = await pgClient.query('SELECT * FROM projects ORDER BY name');
      res.json(result.rows);
    } else if (db) {
      const projects = db.prepare('SELECT * FROM projects ORDER BY name').all();
      res.json(projects);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.json([]);
  }
});

// Create project
app.post('/api/projects', async (req, res) => {
  const { name } = req.body;
  try {
    if (pgClient) {
      const result = await pgClient.query(
        'INSERT INTO projects (name) VALUES ($1) RETURNING id',
        [name]
      );
      res.json({ id: result.rows[0].id, name });
    } else if (db) {
      const info = db.prepare('INSERT INTO projects (name) VALUES (?)').run(name);
      res.json({ id: info.lastInsertRowid, name });
    }
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get all entries
app.get('/api/entries', async (req, res) => {
  try {
    if (pgClient) {
      const result = await pgClient.query('SELECT * FROM entries ORDER BY date DESC');
      res.json(result.rows || []);
    } else if (db) {
      const entries = db.prepare('SELECT * FROM entries ORDER BY date DESC').all();
      res.json(entries || []);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.json([]);
  }
});

// Get invoice data
app.get('/api/invoice', async (req, res) => {
  try {
    let info = {};
    let entries = [];

    if (pgClient) {
      const infoResult = await pgClient.query('SELECT * FROM invoice_info LIMIT 1');
      info = infoResult.rows[0] || {};

      const entriesResult = await pgClient.query('SELECT * FROM entries WHERE billable = true');
      entries = entriesResult.rows || [];
    } else if (db) {
      info = db.prepare('SELECT * FROM invoice_info LIMIT 1').get() || {};
      entries = db.prepare('SELECT * FROM entries WHERE billable = 1').all() || [];
    }

    res.json({ info, entries });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.json({ info: {}, entries: [] });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
});
EOF

# Also remove better-sqlite3 from production dependencies
cat > server/package.json << 'EOF'
{
  "name": "timesheet-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "better-sqlite3": "^8.7.0",
    "nodemon": "^3.0.1"
  }
}
EOF