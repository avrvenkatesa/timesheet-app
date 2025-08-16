const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

// -------- DB setup (supports persistent disk in prod) --------
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "timesheet.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// -------- Schema migration --------
function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      rate REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      phase_id TEXT, -- nullable
      name TEXT NOT NULL,
      billable INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(phase_id) REFERENCES phases(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      date TEXT,
      project_id TEXT NOT NULL,
      phase_id TEXT,
      task_id TEXT,
      project_name TEXT,
      phase_name TEXT,
      task_name TEXT,
      billable INTEGER NOT NULL,
      hours REAL NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id),
      FOREIGN KEY(phase_id) REFERENCES phases(id),
      FOREIGN KEY(task_id) REFERENCES tasks(id)
    );
    CREATE TABLE IF NOT EXISTS invoice_info (
      id INTEGER PRIMARY KEY CHECK (id=1),
      from_name TEXT, from_address TEXT, from_email TEXT, from_phone TEXT,
      to_name TEXT, to_address TEXT, to_email TEXT, to_phone TEXT
    );
    INSERT OR IGNORE INTO invoice_info (id) VALUES (1);
  `);
}
migrate();

// -------- App & middleware --------
const app = express();

// CORS allowlist from env (comma-separated). Defaults to localhost:3000 for dev.
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

// -------- Helpers --------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ======================= PROJECTS =======================
app.get("/api/projects", (req, res) => {
  const projects = db.prepare("SELECT * FROM projects ORDER BY name").all();
  const phases = db.prepare("SELECT * FROM phases").all();
  const tasks = db.prepare("SELECT * FROM tasks").all();

  // Assemble structure: project { phases[], tasks[] }
  const byProj = Object.fromEntries(projects.map(p => [p.id, { ...p, phases: [], tasks: [] }]));
  phases.forEach(ph => byProj[ph.project_id]?.phases.push({ ...ph, tasks: [] }));
  tasks.forEach(t => {
    if (t.phase_id) {
      const p = byProj[t.project_id];
      const ph = p?.phases.find(x => x.id === t.phase_id);
      ph?.tasks.push(t);
    } else {
      byProj[t.project_id]?.tasks.push(t);
    }
  });
  res.json(Object.values(byProj));
});

app.post("/api/projects", (req, res) => {
  const { name, currency, rate } = req.body;
  const id = uid();
  db.prepare("INSERT INTO projects (id,name,currency,rate) VALUES (?,?,?,?)")
    .run(id, name, currency, Number(rate || 0));
  res.status(201).json({ id, name, currency, rate: Number(rate || 0), phases: [], tasks: [] });
});

// EDIT project
app.put("/api/projects/:id", (req, res) => {
  const { name, currency, rate } = req.body;
  db.prepare("UPDATE projects SET name=?, currency=?, rate=? WHERE id=?")
    .run(name, currency, Number(rate || 0), req.params.id);
  res.json({ ok: true });
});

// DELETE project (and related phases/tasks/entries)
app.delete("/api/projects/:id", (req, res) => {
  const projectId = req.params.id;
  db.prepare("DELETE FROM entries WHERE project_id=?").run(projectId);
  const phaseRows = db.prepare("SELECT id FROM phases WHERE project_id=?").all(projectId);
  phaseRows.forEach(ph => {
    db.prepare("DELETE FROM entries WHERE phase_id=?").run(ph.id);
    db.prepare("DELETE FROM tasks WHERE phase_id=?").run(ph.id);
  });
  db.prepare("DELETE FROM tasks WHERE project_id=?").run(projectId);
  db.prepare("DELETE FROM phases WHERE project_id=?").run(projectId);
  db.prepare("DELETE FROM projects WHERE id=?").run(projectId);
  res.json({ ok: true });
});

// ======================= PHASES =======================
app.post("/api/phases", (req, res) => {
  const { projectId, name } = req.body;
  const id = uid();
  db.prepare("INSERT INTO phases (id, project_id, name) VALUES (?,?,?)")
    .run(id, projectId, name);
  res.status(201).json({ id, project_id: projectId, name });
});

// EDIT phase
app.put("/api/phases/:id", (req, res) => {
  const { name } = req.body;
  db.prepare("UPDATE phases SET name=? WHERE id=?").run(name, req.params.id);
  res.json({ ok: true });
});

// DELETE phase (and its tasks/entries)
app.delete("/api/phases/:id", (req, res) => {
  const phaseId = req.params.id;
  db.prepare("DELETE FROM entries WHERE phase_id=?").run(phaseId);
  db.prepare("DELETE FROM tasks WHERE phase_id=?").run(phaseId);
  db.prepare("DELETE FROM phases WHERE id=?").run(phaseId);
  res.json({ ok: true });
});

// ======================= TASKS =======================
app.post("/api/tasks", (req, res) => {
  const { projectId, phaseId, name, billable } = req.body;
  const id = uid();
  db.prepare("INSERT INTO tasks (id, project_id, phase_id, name, billable) VALUES (?,?,?,?,?)")
    .run(id, projectId, phaseId || null, name, billable ? 1 : 0);
  res.status(201).json({ id, project_id: projectId, phase_id: phaseId || null, name, billable: billable ? 1 : 0 });
});

// EDIT task
app.put("/api/tasks/:id", (req, res) => {
  const { name, billable } = req.body;
  db.prepare("UPDATE tasks SET name=?, billable=? WHERE id=?")
    .run(name, billable ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// DELETE task (and its entries)
app.delete("/api/tasks/:id", (req, res) => {
  const taskId = req.params.id;
  db.prepare("DELETE FROM entries WHERE task_id=?").run(taskId);
  db.prepare("DELETE FROM tasks WHERE id=?").run(taskId);
  res.json({ ok: true });
});

// ======================= ENTRIES =======================
app.get("/api/entries", (req, res) => {
  const rows = db.prepare("SELECT * FROM entries ORDER BY date DESC, id DESC").all();
  res.json(rows.map(r => ({ ...r, billable: !!r.billable })));
});

app.post("/api/entries", (req, res) => {
  const e = req.body;
  const id = uid();
  db.prepare(`
    INSERT INTO entries
    (id,date,project_id,phase_id,task_id,project_name,phase_name,task_name,billable,hours,amount,currency,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, e.date || "", e.projectId, e.phaseId || null, e.taskId || null,
    e.projectName, e.phaseName || "", e.taskName, e.billable ? 1 : 0,
    Number(e.hours || 0), Number(e.amount || 0), e.currency, e.notes || ""
  );
  res.status(201).json({ id, ...e });
});

// BULK import (client parses CSV → posts array)
app.post("/api/entries/import", (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  const insert = db.prepare(`
    INSERT INTO entries
    (id,date,project_id,phase_id,task_id,project_name,phase_name,task_name,billable,hours,amount,currency,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const tx = db.transaction((rows) => {
    rows.forEach((e) => {
      const id = uid();
      insert.run(
        id, e.date || "", e.projectId || null, e.phaseId || null, e.taskId || null,
        e.projectName || "", e.phaseName || "", e.taskName || "", e.billable ? 1 : 0,
        Number(e.hours || 0), Number(e.amount || 0), e.currency || "USD", e.notes || ""
      );
    });
  });
  tx(list);
  res.json({ ok: true, inserted: list.length });
});

// DELETE single entry
app.delete("/api/entries/:id", (req, res) => {
  db.prepare("DELETE FROM entries WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ======================= INVOICE INFO =======================
app.get("/api/invoice", (req, res) => {
  const row = db.prepare("SELECT * FROM invoice_info WHERE id=1").get();
  res.json({
    from: { name: row.from_name || "", address: row.from_address || "", email: row.from_email || "", phone: row.from_phone || "" },
    to:   { name: row.to_name || "",   address: row.to_address || "",   email: row.to_email || "",   phone: row.to_phone || "" },
  });
});

app.post("/api/invoice", (req, res) => {
  const { from, to } = req.body;
  db.prepare(`
    UPDATE invoice_info SET
      from_name=?, from_address=?, from_email=?, from_phone=?,
      to_name=?,   to_address=?,   to_email=?,   to_phone=?
    WHERE id=1
  `).run(
    from?.name || "", from?.address || "", from?.email || "", from?.phone || "",
    to?.name || "",   to?.address || "",   to?.email || "",   to?.phone || ""
  );
  res.json({ ok: true });
});

// -------- Start server --------
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
  console.log(`DB path: ${DB_PATH}`);
  console.log(`CORS allowlist: ${allowedOrigins.join(", ")}`);
});