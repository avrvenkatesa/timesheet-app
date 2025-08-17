const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;  // Use port 5000 for Replit

app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Projects endpoint
app.get('/api/projects', (req, res) => {
  res.json([{ id: 1, name: 'Test' }]);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
// Get all time entries
app.get('/api/entries', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM entries ORDER BY date DESC, id DESC');
    const entries = stmt.all();
    res.json(entries || []);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Get invoice data
app.get('/api/invoice', (req, res) => {
  try {
    // Get invoice info
    const infoStmt = db.prepare('SELECT * FROM invoice_info LIMIT 1');
    const info = infoStmt.get() || {};
    
    // Get billable entries
    const entriesStmt = db.prepare('SELECT * FROM entries WHERE billable = 1 ORDER BY date DESC');
    const entries = entriesStmt.all() || [];
    
    res.json({ info, entries });
  } catch (error) {
    console.error('Error fetching invoice data:', error);
    res.json({ info: {}, entries: [] });
  }
});

// Add this before the server listen call
