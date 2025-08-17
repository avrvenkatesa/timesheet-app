const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;  // Changed to 4000

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

app.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
});

// Get all entries
app.get('/api/entries', (req, res) => {
  res.json([]);  // Return empty array for now
});

// Create new entry
app.post('/api/entries', (req, res) => {
  const { date, projectId, hours, amount, notes } = req.body;
  const entry = {
    id: Date.now().toString(),
    date,
    projectId,
    hours,
    amount: amount || 0,
    notes: notes || ''
  };
  res.json(entry);
});

// Get invoice data
app.get('/api/invoice', (req, res) => {
  res.json({
    info: {},
    entries: []
  });
});
