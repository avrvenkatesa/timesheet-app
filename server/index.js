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
        id TEXT PRIMARY KEY,
        date DATE,
        project_id TEXT,
        phase_id TEXT,
        task_id TEXT,
        project_name TEXT,
        phase_name TEXT,
        task_name TEXT,
        billable BOOLEAN DEFAULT true,
        hours DECIMAL,
        amount DECIMAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        notes TEXT,
        start_time TIME,
        end_time TIME,
        invoice_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
        id TEXT PRIMARY KEY,
        date TEXT,
        project_id TEXT,
        phase_id TEXT,
        task_id TEXT,
        project_name TEXT,
        phase_name TEXT,
        task_name TEXT,
        billable INTEGER DEFAULT 1,
        hours REAL,
        amount REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        notes TEXT,
        start_time TEXT,
        end_time TEXT,
        invoice_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
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

// Update entry
app.put('/api/entries/:id', async (req, res) => {
  const entryId = req.params.id;
  const {
    date,
    projectId,
    phaseId,
    taskId,
    projectName,
    phaseName,
    taskName,
    billable,
    hours,
    amount,
    currency,
    notes,
    startTime,
    endTime
  } = req.body;

  try {
    if (pgClient) {
      // PostgreSQL implementation
      const existingResult = await pgClient.query('SELECT * FROM entries WHERE id = $1', [entryId]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      
      const existingEntry = existingResult.rows[0];
      
      // Check if entry is invoiced
      if (existingEntry.invoice_id) {
        return res.status(403).json({ 
          error: `This entry is part of Invoice #${existingEntry.invoice_id} and cannot be modified` 
        });
      }

      // Validation
      if (new Date(date) > new Date()) {
        return res.status(400).json({ error: 'Cannot create entries for future dates' });
      }

      if (hours <= 0 || hours > 24) {
        return res.status(400).json({ error: 'Hours must be between 0 and 24' });
      }

      // Update entry
      const updateResult = await pgClient.query(`
        UPDATE entries 
        SET date = $1, project_id = $2, phase_id = $3, task_id = $4, 
            project_name = $5, phase_name = $6, task_name = $7,
            billable = $8, hours = $9, amount = $10, currency = $11, notes = $12,
            start_time = $13, end_time = $14, updated_at = NOW()
        WHERE id = $15
        RETURNING *
      `, [date, projectId, phaseId, taskId, projectName, phaseName, taskName, 
          billable, hours, amount, currency, notes, startTime, endTime, entryId]);

      res.json({ message: 'Entry updated successfully', entry: updateResult.rows[0] });

    } else if (db) {
      // SQLite implementation
      const existingEntry = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId);
      if (!existingEntry) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      // Check if entry is invoiced
      if (existingEntry.invoice_id) {
        return res.status(403).json({ 
          error: `This entry is part of Invoice #${existingEntry.invoice_id} and cannot be modified` 
        });
      }

      // Validation
      if (new Date(date) > new Date()) {
        return res.status(400).json({ error: 'Cannot create entries for future dates' });
      }

      if (hours <= 0 || hours > 24) {
        return res.status(400).json({ error: 'Hours must be between 0 and 24' });
      }

      // Check for time overlaps if start/end times provided
      if (startTime && endTime) {
        if (startTime >= endTime) {
          return res.status(400).json({ error: 'End time must be after start time' });
        }
      }

      // Update entry
      const updateStmt = db.prepare(`
        UPDATE entries 
        SET date = ?, project_id = ?, phase_id = ?, task_id = ?, 
            project_name = ?, phase_name = ?, task_name = ?,
            billable = ?, hours = ?, amount = ?, currency = ?, notes = ?
        WHERE id = ?
      `);

      updateStmt.run(date, projectId, phaseId, taskId, projectName, phaseName, taskName, 
                     billable, hours, amount, currency, notes, entryId);

      // Return updated entry
      const updatedEntry = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId);
      res.json({ message: 'Entry updated successfully', entry: updatedEntry });
    }

  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
});
