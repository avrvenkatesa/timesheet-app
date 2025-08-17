const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
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
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

async function initializeDatabase() {
  if (isProduction && process.env.DATABASE_URL) {
    // Use PostgreSQL on Railway
    console.log('Using PostgreSQL database');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    // Create tables in PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        hourly_rate DECIMAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        project_id INTEGER REFERENCES projects(id),
        hours DECIMAL NOT NULL,
        description TEXT,
        billable BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        to_phone TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add default project if none exists
    const result = await client.query('SELECT COUNT(*) FROM projects');
    if (result.rows[0].count === '0') {
      await client.query('INSERT INTO projects (name, hourly_rate) VALUES ($1, $2)', ['Default Project', 100]);
      console.log('Added default project');
    }

    console.log('PostgreSQL tables initialized');
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
        name TEXT NOT NULL,
        hourly_rate REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        project_id INTEGER,
        hours REAL NOT NULL,
        description TEXT,
        billable INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
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
        to_phone TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add default project if none exists
    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
    if (projectCount.count === 0) {
      db.prepare('INSERT INTO projects (name, hourly_rate) VALUES (?, ?)').run('Default Project', 100);
      console.log('Added default project');
    }

    console.log('SQLite tables initialized');
    return db;
  }
}

// Initialize database
let pgClient;
initializeDatabase().then(result => {
  if (isProduction) {
    pgClient = result;
  }
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Helper functions for database operations
async function runQuery(query, params = []) {
  if (isProduction && pgClient) {
    const result = await pgClient.query(query, params);
    return result.rows;
  } else if (db) {
    // Convert PostgreSQL query to SQLite
    const sqliteQuery = query
      .replace(/\$(\d+)/g, '?') // Replace $1, $2 with ?
      .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/BOOLEAN/g, 'INTEGER')
      .replace(/DECIMAL/g, 'REAL');

    if (query.toLowerCase().startsWith('select')) {
      return db.prepare(sqliteQuery).all(...params);
    } else {
      const info = db.prepare(sqliteQuery).run(...params);
      return [{ id: info.lastInsertRowid }];
    }
  }
  return [];
}

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await runQuery('SELECT * FROM projects ORDER BY name');
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.json([]);
  }
});

// Create project
app.post('/api/projects', async (req, res) => {
  const { name, hourlyRate = 0 } = req.body;
  try {
    const result = await runQuery(
      'INSERT INTO projects (name, hourly_rate) VALUES ($1, $2) RETURNING id',
      [name, hourlyRate]
    );
    res.json({ id: result[0].id, name, hourlyRate });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get all entries
app.get('/api/entries', async (req, res) => {
  try {
    const entries = await runQuery('SELECT * FROM entries ORDER BY date DESC, id DESC');
    res.json(entries || []);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Create entry
app.post('/api/entries', async (req, res) => {
  const { date, projectId, hours, description, billable = true } = req.body;
  try {
    const result = await runQuery(
      'INSERT INTO entries (date, project_id, hours, description, billable) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [date, projectId, hours, description, billable ? 1 : 0]
    );
    res.json({ id: result[0].id, date, projectId, hours, description, billable });
  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Get invoice data
app.get('/api/invoice', async (req, res) => {
  try {
    // Get invoice info
    const infoResult = await runQuery('SELECT * FROM invoice_info LIMIT 1');
    const info = infoResult[0] || {};

    // Get billable entries
    const entries = await runQuery(
      isProduction 
        ? 'SELECT * FROM entries WHERE billable = true ORDER BY date DESC'
        : 'SELECT * FROM entries WHERE billable = 1 ORDER BY date DESC'
    );

    res.json({ info, entries: entries || [] });
  } catch (error) {
    console.error('Error fetching invoice data:', error);
    res.json({ info: {}, entries: [] });
  }
});

// Update invoice info
app.post('/api/invoice/info', async (req, res) => {
  const { from, to } = req.body;
  try {
    // Check if invoice info exists
    const existing = await runQuery('SELECT id FROM invoice_info LIMIT 1');

    if (existing.length > 0) {
      // Update existing
      await runQuery(
        `UPDATE invoice_info SET 
         from_name = $1, from_address = $2, from_email = $3, from_phone = $4,
         to_name = $5, to_address = $6, to_email = $7, to_phone = $8,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [from.name, from.address, from.email, from.phone,
         to.name, to.address, to.email, to.phone, existing[0].id]
      );
    } else {
      // Insert new
      await runQuery(
        `INSERT INTO invoice_info 
         (from_name, from_address, from_email, from_phone,
          to_name, to_address, to_email, to_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [from.name, from.address, from.email, from.phone,
         to.name, to.address, to.email, to.phone]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating invoice info:', error);
    res.status(500).json({ error: 'Failed to update invoice info' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production (PostgreSQL)' : 'Development (SQLite)'}`);
});