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

// Health check (alternative endpoint)
app.get('/health', (req, res) => {
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

// Create new entry (NEW - Story 1.1 requirement)
app.post('/api/entries', async (req, res) => {
  const {
    date,
    projectId,
    taskName,
    description,
    billable,
    hours,
    amount,
    currency,
    notes
  } = req.body;

  try {
    // Basic validation
    if (new Date(date) > new Date()) {
      return res.status(400).json({ error: 'Cannot create entries for future dates' });
    }

    if (hours <= 0 || hours > 24) {
      return res.status(400).json({ error: 'Hours must be between 0 and 24' });
    }

    if (pgClient) {
      // PostgreSQL implementation (full schema)
      const id = 'entry-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const result = await pgClient.query(`
        INSERT INTO entries (
          id, date, project_id, task_name,
          billable, hours, amount, currency, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING *
      `, [id, date, projectId, taskName || description, billable, hours, amount, currency || 'USD', notes]);

      res.status(201).json({ 
        message: 'Entry created successfully', 
        entry: result.rows[0] 
      });

    } else if (db) {
      // SQLite implementation - match actual schema with correct data types
      // Schema: id(INTEGER), date(TEXT), project_id(INTEGER), hours(REAL), description(TEXT), billable(INTEGER)

      const stmt = db.prepare(`
        INSERT INTO entries (date, project_id, hours, description, billable)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Let SQLite auto-generate the INTEGER id, fix project_id to integer
      const insertParams = [
        String(date),                                      // date as TEXT
        projectId ? parseInt(projectId, 10) : null,        // project_id as INTEGER or null
        parseFloat(hours),                                 // hours as REAL
        String(taskName || description || 'Time entry'),   // description as TEXT
        billable ? 1 : 0                                  // billable as INTEGER
      ];

      console.log('SQLite insert params:', insertParams);

      const result = stmt.run(...insertParams);

      // Get the newly created entry using the auto-generated id
      const newEntry = db.prepare('SELECT * FROM entries WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({ 
        message: 'Entry created successfully', 
        entry: newEntry 
      });
    }

  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({ error: 'Failed to create entry' });
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

// Update entry (Story 1.1 - Edit Time Entries)
app.put('/api/entries/:id', async (req, res) => {
  const entryId = req.params.id;
  const {
    date,
    projectId,
    taskName,
    description,
    billable,
    hours,
    amount,
    currency,
    notes
  } = req.body;

  try {
    if (pgClient) {
      // PostgreSQL implementation (full schema)
      const existingResult = await pgClient.query('SELECT * FROM entries WHERE id = $1', [entryId]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const existingEntry = existingResult.rows[0];

      // Check if entry is invoiced (Story 1.2 requirement)
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
        SET date = $1, project_id = $2, task_name = $3,
            billable = $4, hours = $5, amount = $6, currency = $7, notes = $8,
            updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `, [date, projectId, taskName || description, billable, hours, amount, currency, notes, entryId]);

      res.json({ message: 'Entry updated successfully', entry: updateResult.rows[0] });

    } else if (db) {
      // SQLite implementation - match actual schema with correct data types
      // Schema: id(INTEGER), date(TEXT), project_id(INTEGER), hours(REAL), description(TEXT), billable(INTEGER)

      const existingEntry = db.prepare('SELECT * FROM entries WHERE id = ?').get(parseInt(entryId, 10));
      if (!existingEntry) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      // Check if entry is invoiced (Story 1.2 requirement) - only if invoice_id column exists
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

      // Update entry using actual schema columns with correct data types
      const updateStmt = db.prepare(`
        UPDATE entries 
        SET date = ?, project_id = ?, hours = ?, description = ?, billable = ?
        WHERE id = ?
      `);

      updateStmt.run(
        String(date),                                      // date as TEXT
        projectId ? parseInt(projectId, 10) : null,        // project_id as INTEGER or null
        parseFloat(hours),                                 // hours as REAL
        String(taskName || description || 'Updated entry'), // description as TEXT
        billable ? 1 : 0,                                 // billable as INTEGER
        parseInt(entryId, 10)                             // id as INTEGER
      );

      // Return updated entry
      const updatedEntry = db.prepare('SELECT * FROM entries WHERE id = ?').get(parseInt(entryId, 10));
      res.json({ message: 'Entry updated successfully', entry: updatedEntry });
    }

  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete entry (soft delete for Story 1.3 - future implementation)
app.delete('/api/entries/:id', async (req, res) => {
  const entryId = req.params.id;

  try {
    if (pgClient) {
      // Check if entry exists and is not invoiced
      const existingResult = await pgClient.query('SELECT * FROM entries WHERE id = $1', [entryId]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const existingEntry = existingResult.rows[0];
      if (existingEntry.invoice_id) {
        return res.status(403).json({ 
          error: `Cannot delete entry that is part of Invoice #${existingEntry.invoice_id}` 
        });
      }

      // For now, hard delete (will be changed to soft delete in Story 1.3)
      await pgClient.query('DELETE FROM entries WHERE id = $1', [entryId]);
      res.json({ message: 'Entry deleted successfully' });

    } else if (db) {
      const existingEntry = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId);
      if (!existingEntry) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      if (existingEntry.invoice_id) {
        return res.status(403).json({ 
          error: `Cannot delete entry that is part of Invoice #${existingEntry.invoice_id}` 
        });
      }

      // For now, hard delete (will be changed to soft delete in Story 1.3)
      db.prepare('DELETE FROM entries WHERE id = ?').run(entryId);
      res.json({ message: 'Entry deleted successfully' });
    }

  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// Debug endpoints (temporary for development)
app.get('/debug/entries-schema', (req, res) => {
  try {
    if (db) {
      // Get table info
      const tableInfo = db.prepare("PRAGMA table_info(entries)").all();

      // Get any existing entries to see their data types
      const existingEntries = db.prepare("SELECT * FROM entries LIMIT 1").all();

      res.json({ 
        schema: tableInfo,
        sampleData: existingEntries,
        tableExists: true
      });
    } else {
      res.json({ error: "No SQLite database" });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
});