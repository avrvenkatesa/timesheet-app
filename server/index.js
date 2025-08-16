// server/index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// seed data for quick testing
let DATA = [
  { id: "e1", date: "2025-08-12", client: "ACME Corp", project: "Mobile App", task: "Development", notes: "Feature X", startTime: "10:00", endTime: "12:15", hours: 2.25, rate: 120, isInvoiced: false },
  { id: "e2", date: "2025-08-13", client: "Globex", project: "Data Pipeline", task: "Design", notes: "ETL mapping", startTime: "14:00", endTime: "17:30", hours: 3.5, rate: 140, isInvoiced: true },
  { id: "e3", date: "2025-08-14", client: "ACME Corp", project: "Mobile App", task: "Code Review", notes: "PR #42", hours: 1.5, rate: 120, isInvoiced: false },
];

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.get("/api/time-entries", (_req, res) => {
  setTimeout(() => res.json(DATA), 120);
});

app.put("/api/time-entries/:id", (req, res) => {
  const { id } = req.params;
  const idx = DATA.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ error: "Entry not found" });
  DATA[idx] = { ...DATA[idx], ...req.body, id };
  res.json(DATA[idx]);
});

app.post("/api/invoices", (req, res) => {
  const { entryIds } = req.body || {};
  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    return res.status(400).json({ error: "entryIds required" });
  }
  DATA = DATA.map(e => entryIds.includes(e.id) ? { ...e, isInvoiced: true } : e);
  const invoiceId = `INV-${Math.floor(Math.random() * 1_000_000)}`;
  res.json({ invoiceId });
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
