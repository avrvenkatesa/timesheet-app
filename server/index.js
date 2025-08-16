// server/index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// ---------- utils ----------
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- in-memory data ----------
/** Projects with phases & tasks */
let projects = [
  {
    id: uid(),
    name: "ACME Mobile App",
    currency: "USD",
    rate: 120,
    phases: [
      {
        id: uid(),
        name: "Design",
        tasks: [
          { id: uid(), name: "Wireframes", billable: true },
          { id: uid(), name: "UX Review", billable: true },
        ],
      },
      {
        id: uid(),
        name: "Build",
        tasks: [{ id: uid(), name: "Development", billable: true }],
      },
    ],
    tasks: [{ id: uid(), name: "Project Management", billable: false }],
  },
];

let entries = [
  {
    id: uid(),
    date: "2025-08-12",
    projectId: projects[0].id,
    phaseId: projects[0].phases[0].id,
    taskId: projects[0].phases[0].tasks[0].id,
    projectName: "ACME Mobile App",
    phaseName: "Design",
    taskName: "Wireframes",
    billable: true,
    hours: 2.25,
    amount: 270.0,
    currency: "USD",
    notes: "Homepage wires",
  },
  {
    id: uid(),
    date: "2025-08-13",
    projectId: projects[0].id,
    phaseId: projects[0].phases[1].id,
    taskId: projects[0].phases[1].tasks[0].id,
    projectName: "ACME Mobile App",
    phaseName: "Build",
    taskName: "Development",
    billable: true,
    hours: 3.5,
    amount: 420.0,
    currency: "USD",
    notes: "Auth flow",
  },
];

let invoiceInfo = {
  from: { name: "", address: "", email: "", phone: "" },
  to: { name: "", address: "", email: "", phone: "" },
};

// ---------- health ----------
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// ---------- projects ----------
app.get("/api/projects", (_req, res) => res.json(projects));

app.post("/api/projects", (req, res) => {
  const { name, currency = "USD", rate = 0 } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  const p = { id: uid(), name: name.trim(), currency, rate: Number(rate) || 0, phases: [], tasks: [] };
  projects.push(p);
  res.status(201).json(p);
});

app.put("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  const i = projects.findIndex(p => p.id === id);
  if (i === -1) return res.status(404).json({ error: "project not found" });
  const { name, currency, rate } = req.body || {};
  projects[i] = {
    ...projects[i],
    ...(name != null ? { name } : {}),
    ...(currency != null ? { currency } : {}),
    ...(rate != null ? { rate: Number(rate) || 0 } : {}),
  };
  res.json(projects[i]);
});

app.delete("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  const exists = projects.find(p => p.id === id);
  if (!exists) return res.status(404).json({ error: "project not found" });
  projects = projects.filter(p => p.id !== id);
  entries = entries.filter(e => e.projectId !== id); // cascade delete entries
  res.json({ ok: true });
});

// ---------- phases ----------
app.post("/api/phases", (req, res) => {
  const { projectId, name } = req.body || {};
  if (!projectId || !name?.trim()) return res.status(400).json({ error: "projectId and name required" });
  const p = projects.find(pp => pp.id === projectId);
  if (!p) return res.status(404).json({ error: "project not found" });
  const ph = { id: uid(), name: name.trim(), tasks: [] };
  p.phases = p.phases || [];
  p.phases.push(ph);
  res.status(201).json(ph);
});

app.put("/api/phases/:id", (req, res) => {
  const { id } = req.params;
  const ph = projects.flatMap(p => p.phases || []).find(x => x.id === id);
  if (!ph) return res.status(404).json({ error: "phase not found" });
  const { name } = req.body || {};
  if (name != null) ph.name = name;
  res.json(ph);
});

app.delete("/api/phases/:id", (req, res) => {
  const { id } = req.params;
  let found = false;
  projects.forEach(p => {
    const before = (p.phases || []).length;
    p.phases = (p.phases || []).filter(ph => ph.id !== id);
    if (p.phases.length !== before) found = true;
  });
  if (!found) return res.status(404).json({ error: "phase not found" });
  entries = entries.filter(e => e.phaseId !== id); // cascade delete entries
  res.json({ ok: true });
});

// ---------- tasks ----------
app.post("/api/tasks", (req, res) => {
  const { projectId, phaseId = null, name, billable = true } = req.body || {};
  if (!projectId || !name?.trim()) return res.status(400).json({ error: "projectId and name required" });
  const p = projects.find(pp => pp.id === projectId);
  if (!p) return res.status(404).json({ error: "project not found" });

  const t = { id: uid(), name: name.trim(), billable: !!billable };
  if (phaseId) {
    const ph = (p.phases || []).find(x => x.id === phaseId);
    if (!ph) return res.status(404).json({ error: "phase not found" });
    ph.tasks = ph.tasks || [];
    ph.tasks.push(t);
  } else {
    p.tasks = p.tasks || [];
    p.tasks.push(t);
  }
  res.status(201).json(t);
});

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  let task = null;
  projects.forEach(p => {
    (p.tasks || []).forEach(t => { if (t.id === id) task = t; });
    (p.phases || []).forEach(ph => (ph.tasks || []).forEach(t => { if (t.id === id) task = t; }));
  });
  if (!task) return res.status(404).json({ error: "task not found" });
  const { name, billable } = req.body || {};
  if (name != null) task.name = name;
  if (billable != null) task.billable = !!billable;
  res.json(task);
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  let removed = false;
  projects.forEach(p => {
    const b = (p.tasks || []).length;
    p.tasks = (p.tasks || []).filter(t => t.id !== id);
    if (p.tasks.length !== b) removed = true;
    (p.phases || []).forEach(ph => {
      const bb = (ph.tasks || []).length;
      ph.tasks = (ph.tasks || []).filter(t => t.id !== id);
      if (ph.tasks.length !== bb) removed = true;
    });
  });
  if (!removed) return res.status(404).json({ error: "task not found" });
  entries = entries.filter(e => e.taskId !== id); // cascade delete entries
  res.json({ ok: true });
});

// ---------- entries ----------
app.get("/api/entries", (_req, res) => res.json(entries));

app.post("/api/entries", (req, res) => {
  const payload = req.body || {};
  const p = projects.find(pp => pp.id === payload.projectId);
  const currency = payload.currency || p?.currency || "USD";
  const rate = Number(p?.rate || 0);
  const hours = Number(payload.hours || 0);
  const billable = !!payload.billable;
  const amount = billable ? Number((hours * rate).toFixed(2)) : 0;

  const entry = {
    id: uid(),
    date: payload.date || new Date().toISOString().slice(0, 10),
    projectId: payload.projectId || null,
    phaseId: payload.phaseId || null,
    taskId: payload.taskId || null,
    projectName: payload.projectName || p?.name || "",
    phaseName: payload.phaseName || "",
    taskName: payload.taskName || "",
    billable,
    hours,
    amount: payload.amount != null ? Number(payload.amount) : amount,
    currency,
    notes: payload.notes || "",
  };
  entries = [entry, ...entries];
  res.status(201).json(entry);
});

app.post("/api/entries/import", (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  const normalized = list.map(r => ({
    id: uid(),
    date: r.date || "",
    projectId: r.projectId || null,
    phaseId: r.phaseId || null,
    taskId: r.taskId || null,
    projectName: r.projectName || r.project || "",
    phaseName: r.phaseName || r.phase || "",
    taskName: r.taskName || r.task || "",
    billable: !!r.billable,
    hours: Number(r.hours || 0),
    amount: Number(r.amount || 0),
    currency: r.currency || "USD",
    notes: r.notes || "",
  }));
  entries = [...normalized, ...entries];
  res.json({ imported: normalized.length });
});

app.delete("/api/entries/:id", (req, res) => {
  const { id } = req.params;
  const before = entries.length;
  entries = entries.filter(e => e.id !== id);
  if (entries.length === before) return res.status(404).json({ error: "entry not found" });
  res.json({ ok: true });
});

// ---------- invoice info ----------
app.get("/api/invoice", (_req, res) => res.json(invoiceInfo));

app.post("/api/invoice", (req, res) => {
  const { from = {}, to = {} } = req.body || {};
  invoiceInfo = {
    from: { ...invoiceInfo.from, ...from },
    to: { ...invoiceInfo.to, ...to },
  };
  res.json(invoiceInfo);
});

// ---------- start ----------
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
