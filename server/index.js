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